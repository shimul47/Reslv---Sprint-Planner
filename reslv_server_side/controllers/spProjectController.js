import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import ProductBacklog from "../models/ProductBacklog.js";
import Pbi from "../models/Pbi.js";
import Sprint from "../models/Sprint.js";
import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import TaskRequest from "../models/TaskRequest.js";
import User from "../models/User.js";
import { isOverseer } from "../middleware/projectAccess.js";

// Company-scoped project list for the project switcher. Employees only see
// projects they've actually been added to; overseers (admin/superadmin/
// sprint_planner) see every project in their company (or, for superadmin,
// every company — same convention as teamController.getTeamMembers). Each
// project carries the requester's effective role ("overseer"/"manager"/
// "member") so the client can gate manage-only UI without a second round trip.
export const listProjects = async (req, res) => {
  try {
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    const baseFilter = isSuperAdmin ? {} : { companyId: req.user.companyId };

    let projects = await Project.find(baseFilter).sort({ createdAt: -1 }).lean();
    const overseer = isOverseer(req.user);

    if (overseer) {
      projects = projects.map((p) => ({ ...p, myRole: "overseer" }));
    } else {
      const memberships = await ProjectMember.find({ userId: req.user.id }).lean();
      const roleByProject = new Map(memberships.map((m) => [String(m.projectId), m.projectRole]));
      projects = projects
        .filter((p) => roleByProject.has(String(p._id)))
        .map((p) => ({ ...p, myRole: roleByProject.get(String(p._id)) }));
    }

    res.json({ projects });
  } catch (error) {
    console.error("List projects error:", error);
    res.status(500).json({ message: "Failed to load projects." });
  }
};

export const createProject = async (req, res) => {
  try {
    const { name, key, description, parentProjectId } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Project name is required." });
    }

    const isSuperAdmin = req.user.roles?.includes("superadmin");
    if (isSuperAdmin && !req.user.companyId) {
      return res.status(400).json({ message: "Select a company scope first." });
    }

    const project = await Project.create({
      companyId: req.user.companyId,
      name: name.trim(),
      key: key?.trim() || "",
      description: description?.trim() || "",
      parentProjectId: parentProjectId || null,
      createdBy: req.user.id,
    });

    res.status(201).json({ project });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Failed to create project." });
  }
};

export const getProject = async (req, res) => {
  res.json({ project: req.project });
};

export const updateProject = async (req, res) => {
  try {
    const { name, key, description, parentProjectId, status } = req.body;

    if (name !== undefined) req.project.name = name.trim();
    if (key !== undefined) req.project.key = key.trim();
    if (description !== undefined) req.project.description = description.trim();
    if (parentProjectId !== undefined) req.project.parentProjectId = parentProjectId || null;
    if (status !== undefined) {
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      req.project.status = status;
    }

    await req.project.save();
    res.json({ project: req.project });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({ message: "Failed to update project." });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const projectId = req.project._id;
    const taskIds = (await Task.find({ projectId }).select("_id").lean()).map((t) => t._id);

    await Promise.all([
      TimeLog.deleteMany({ projectId }),
      TaskRequest.deleteMany({ projectId }),
      Task.deleteMany({ projectId }),
      Pbi.deleteMany({ projectId }),
      Sprint.deleteMany({ projectId }),
      ProductBacklog.deleteMany({ projectId }),
      ProjectMember.deleteMany({ projectId }),
    ]);
    await Project.findByIdAndDelete(projectId);

    res.json({ message: "Project deleted.", id: projectId, orphanedTaskIds: taskIds });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ message: "Failed to delete project." });
  }
};

// ── Project membership (admin scopes an employee to this project) ──────────

export const listProjectMembers = async (req, res) => {
  try {
    const members = await ProjectMember.find({ projectId: req.project._id })
      .populate("userId", "name email roles")
      .lean();
    res.json({ members });
  } catch (error) {
    console.error("List project members error:", error);
    res.status(500).json({ message: "Failed to load project members." });
  }
};

export const upsertProjectMember = async (req, res) => {
  try {
    const { userId, projectRole, title } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required." });
    }
    if (projectRole && !["manager", "member"].includes(projectRole)) {
      return res.status(400).json({ message: "Invalid projectRole." });
    }

    const targetUser = await User.findById(userId).lean();
    if (!targetUser || String(targetUser.companyId) !== String(req.project.companyId)) {
      return res.status(404).json({ message: "User not found in this company." });
    }

    const member = await ProjectMember.findOneAndUpdate(
      { projectId: req.project._id, userId },
      {
        projectId: req.project._id,
        companyId: req.project.companyId,
        userId,
        ...(projectRole ? { projectRole } : {}),
        ...(title !== undefined ? { title: title.trim() } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json({ member });
  } catch (error) {
    console.error("Upsert project member error:", error);
    res.status(500).json({ message: "Failed to assign project member." });
  }
};

export const removeProjectMember = async (req, res) => {
  try {
    await ProjectMember.findOneAndDelete({
      projectId: req.project._id,
      userId: req.params.userId,
    });
    await Task.updateMany(
      { projectId: req.project._id, assigneeId: req.params.userId },
      { assigneeId: null },
    );
    res.json({ message: "Project member removed.", userId: req.params.userId });
  } catch (error) {
    console.error("Remove project member error:", error);
    res.status(500).json({ message: "Failed to remove project member." });
  }
};

// General Scrum stats for the project: velocity per closed sprint, task
// status distribution, per-sprint completion rate, average cycle time, and
// backlog health — all derived from Pbi/Task.doneAt, no separate rollup
// table needed.
export const getProjectStats = async (req, res) => {
  try {
    const projectId = req.project._id;

    const [closedSprints, tasks, pbis] = await Promise.all([
      Sprint.find({ projectId, status: "closed" }).sort({ createdAt: 1 }).limit(10).lean(),
      Task.find({ projectId }).lean(),
      Pbi.find({ projectId }).lean(),
    ]);

    const tasksBySprintId = new Map();
    for (const task of tasks) {
      const key = String(task.sprintId);
      if (!tasksBySprintId.has(key)) tasksBySprintId.set(key, []);
      tasksBySprintId.get(key).push(task);
    }

    const velocity = await Promise.all(
      closedSprints.map(async (sprint) => {
        const donePbis = await Pbi.find({ sprintId: sprint._id, doneAt: { $ne: null } }).lean();
        const sprintTasks = tasksBySprintId.get(String(sprint._id)) || [];
        const doneTaskCount = sprintTasks.filter((t) => t.status === "done").length;
        return {
          sprintName: sprint.name,
          pointsCompleted: donePbis.reduce((sum, p) => sum + (p.storyPoints || 0), 0),
          completionRate: sprintTasks.length ? (doneTaskCount / sprintTasks.length) * 100 : null,
        };
      }),
    );

    const taskStatusCounts = { todo: 0, in_progress: 0, done: 0 };
    for (const task of tasks) taskStatusCounts[task.status] = (taskStatusCounts[task.status] || 0) + 1;

    const doneTasks = tasks.filter((t) => t.doneAt);
    const avgCycleTimeHours = doneTasks.length
      ? doneTasks.reduce((sum, t) => sum + (new Date(t.doneAt) - new Date(t.createdAt)) / 3_600_000, 0) /
        doneTasks.length
      : null;

    const ratesWithData = velocity.filter((v) => v.completionRate !== null);
    const avgSprintCompletionRate = ratesWithData.length
      ? ratesWithData.reduce((sum, v) => sum + v.completionRate, 0) / ratesWithData.length
      : null;

    res.json({
      velocity,
      taskStatusCounts,
      avgSprintCompletionRate,
      avgCycleTimeHours,
      backlog: {
        openCount: pbis.filter((p) => p.status !== "done").length,
        doneCount: pbis.filter((p) => p.status === "done").length,
      },
    });
  } catch (error) {
    console.error("Get project stats error:", error);
    res.status(500).json({ message: "Failed to compute project stats." });
  }
};
