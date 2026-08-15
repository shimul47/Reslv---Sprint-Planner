import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import Company from "../models/Company.js";

const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];
const ROLE_RANK = { member: 0, manager: 1 };

export function isOverseer(user) {
  return Boolean(user?.roles?.some((r) => OVERSEER_ROLES.includes(r)));
}

export function isEmployeeOnly(user) {
  return Boolean(user?.roles?.includes("employee")) && !isOverseer(user);
}

export async function collectAncestorProjects(project) {
  const ancestors = [];
  const seen = new Set([String(project._id)]);
  let current = project;

  while (current.parentProjectId) {
    const parentId = String(current.parentProjectId);
    if (seen.has(parentId)) break;
    const parent = await Project.findById(current.parentProjectId).lean();
    if (!parent) break;
    ancestors.push(parent);
    seen.add(parentId);
    current = parent;
  }

  return ancestors;
}

export const loadProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found." });
    }
    const isSuperAdmin = req.user.roles?.includes("superadmin");
    if (
      !isSuperAdmin &&
      String(project.companyId) !== String(req.user.companyId)
    ) {
      return res.status(404).json({ message: "Project not found." });
    }
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ message: "Failed to load project." });
  }
};

export const attachProjectMembership = async (req, res, next) => {
  try {
    if (isOverseer(req.user)) {
      req.projectMember = null;
      return next();
    }

    const membership = await ProjectMember.findOne({
      projectId: req.project._id,
      userId: req.user.id,
    }).lean();

    if (!membership) {
      return res
        .status(403)
        .json({ message: "You are not a member of this project." });
    }

    req.projectMember = membership;
    next();
  } catch (error) {
    res.status(500).json({ message: "Failed to verify project membership." });
  }
};

export const requireProjectRole =
  (minRole, relaxSettingKey) => async (req, res, next) => {
    try {
      if (isOverseer(req.user)) return next();

      const rank = ROLE_RANK[req.projectMember?.projectRole] ?? -1;
      if (rank >= ROLE_RANK[minRole]) return next();

      if (relaxSettingKey) {
        const company = await Company.findById(req.user.companyId)
          .select("sprintPlannerSettings")
          .lean();
        if (company?.sprintPlannerSettings?.[relaxSettingKey]) return next();
      }

      return res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to verify project permissions." });
    }
  };
