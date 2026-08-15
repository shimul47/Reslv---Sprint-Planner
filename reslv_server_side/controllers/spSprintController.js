import Sprint from "../models/Sprint.js";
import Task from "../models/Task.js";
import Pbi from "../models/Pbi.js";
import { isEmployeeOnly, collectAncestorProjects } from "../middleware/projectAccess.js";

// Employees never see an unpublished sprint at all — it doesn't exist for
// them until an admin/manager publishes it.
export const listSprints = async (req, res) => {
  try {
    const filter = { projectId: req.project._id };
    if (isEmployeeOnly(req.user)) filter.published = true;

    const sprints = await Sprint.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ sprints });
  } catch (error) {
    console.error("List sprints error:", error);
    res.status(500).json({ message: "Failed to load sprints." });
  }
};

// Read-only: sprints an ancestor project has opted to share down
// (shareWithSubprojects), surfaced here but not editable — mutations still
// require membership on the owning project. Same publish-visibility rule as
// listSprints applies to employee-only viewers.
export const listInheritedSprints = async (req, res) => {
  try {
    const ancestors = await collectAncestorProjects(req.project);
    if (ancestors.length === 0) {
      return res.json({ sprints: [] });
    }

    const nameByProjectId = new Map(ancestors.map((p) => [String(p._id), p.name]));
    const filter = {
      projectId: { $in: ancestors.map((p) => p._id) },
      shareWithSubprojects: true,
    };
    if (isEmployeeOnly(req.user)) filter.published = true;

    const sprints = await Sprint.find(filter).sort({ createdAt: -1 }).lean();
    const withCounts = await Promise.all(
      sprints.map(async (s) => ({
        ...s,
        sourceProjectName: nameByProjectId.get(String(s.projectId)) || "Parent project",
        taskCount: await Task.countDocuments({ sprintId: s._id }),
      })),
    );

    res.json({ sprints: withCounts });
  } catch (error) {
    console.error("List inherited sprints error:", error);
    res.status(500).json({ message: "Failed to load shared sprints." });
  }
};

export const createSprint = async (req, res) => {
  try {
    const { name, goal, startDate, endDate, shareWithSubprojects } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Sprint name is required." });
    }

    const sprint = await Sprint.create({
      projectId: req.project._id,
      companyId: req.project.companyId,
      name: name.trim(),
      goal: goal?.trim() || "",
      startDate: startDate || null,
      endDate: endDate || null,
      shareWithSubprojects: Boolean(shareWithSubprojects),
      createdBy: req.user.id,
    });

    res.status(201).json({ sprint });
  } catch (error) {
    console.error("Create sprint error:", error);
    res.status(500).json({ message: "Failed to create sprint." });
  }
};

const loadManageableSprint = async (req, res) => {
  const sprint = await Sprint.findOne({ _id: req.params.sprintId, projectId: req.project._id });
  if (!sprint) {
    res.status(404).json({ message: "Sprint not found." });
    return null;
  }
  return sprint;
};

export const updateSprint = async (req, res) => {
  try {
    const sprint = await loadManageableSprint(req, res);
    if (!sprint) return;

    const { name, goal, startDate, endDate, status, shareWithSubprojects } = req.body;
    if (name !== undefined) sprint.name = name.trim();
    if (goal !== undefined) sprint.goal = goal.trim();
    if (startDate !== undefined) sprint.startDate = startDate || null;
    if (endDate !== undefined) sprint.endDate = endDate || null;
    if (shareWithSubprojects !== undefined) sprint.shareWithSubprojects = Boolean(shareWithSubprojects);
    if (status !== undefined) {
      if (!["planning", "active", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      sprint.status = status;
    }

    await sprint.save();
    res.json({ sprint });
  } catch (error) {
    console.error("Update sprint error:", error);
    res.status(500).json({ message: "Failed to update sprint." });
  }
};

export const publishSprint = async (req, res) => {
  try {
    const sprint = await loadManageableSprint(req, res);
    if (!sprint) return;

    sprint.published = true;
    sprint.publishedAt = new Date();
    sprint.publishedBy = req.user.id;
    await sprint.save();

    res.json({ sprint });
  } catch (error) {
    console.error("Publish sprint error:", error);
    res.status(500).json({ message: "Failed to publish sprint." });
  }
};

export const deleteSprint = async (req, res) => {
  try {
    const sprint = await loadManageableSprint(req, res);
    if (!sprint) return;

    const taskCount = await Task.countDocuments({ sprintId: sprint._id });
    if (taskCount > 0) {
      return res.status(400).json({ message: "Remove this sprint's tasks before deleting it." });
    }

    await Pbi.updateMany({ sprintId: sprint._id }, { sprintId: null });
    await sprint.deleteOne();
    res.json({ message: "Sprint deleted.", id: sprint._id });
  } catch (error) {
    console.error("Delete sprint error:", error);
    res.status(500).json({ message: "Failed to delete sprint." });
  }
};

// The Sprint Board data: tasks grouped by status, each carrying its parent
// PBI for swimlane grouping. Employees are hard-filtered server-side to only
// their own assigned tasks — this is the actual enforcement point for "an
// employee only sees what's assigned to them", not just a client-side filter.
export const getSprintBoard = async (req, res) => {
  try {
    const sprint = await Sprint.findOne({ _id: req.params.sprintId, projectId: req.project._id });
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found." });
    }

    const employeeOnly = isEmployeeOnly(req.user);
    if (employeeOnly && !sprint.published) {
      return res.status(404).json({ message: "Sprint not found." });
    }

    const taskFilter = { sprintId: sprint._id };
    if (employeeOnly) taskFilter.assigneeId = req.user.id;

    const [tasks, pbis] = await Promise.all([
      Task.find(taskFilter)
        .sort({ status: 1, position: 1 })
        .populate("assigneeId", "name email")
        .lean(),
      Pbi.find({ sprintId: sprint._id }).sort({ position: 1 }).lean(),
    ]);

    res.json({ sprint, tasks, pbis });
  } catch (error) {
    console.error("Get sprint board error:", error);
    res.status(500).json({ message: "Failed to load sprint board." });
  }
};
