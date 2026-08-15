import express from "express";
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectMembers,
  upsertProjectMember,
  removeProjectMember,
  getProjectStats,
} from "../controllers/spProjectController.js";
import {
  listBacklogs,
  createBacklog,
  updateBacklog,
  deleteBacklog,
  listPbis,
  createPbi,
  updatePbi,
  deletePbi,
  listInheritedBacklogs,
} from "../controllers/spBacklogController.js";
import {
  listSprints,
  createSprint,
  updateSprint,
  deleteSprint,
  publishSprint,
  getSprintBoard,
  listInheritedSprints,
} from "../controllers/spSprintController.js";
import {
  createTask,
  updateTask,
  deleteTask,
  listTimeLogs,
  logTime,
  createTaskRequest,
  listMyTaskRequests,
  resolveTaskRequest,
} from "../controllers/spTaskController.js";
import { getSprintBurndown, getBacklogBurndown } from "../controllers/spBurndownController.js";
import {
  listReleases,
  createRelease,
  getRelease,
  updateRelease,
  deleteRelease,
} from "../controllers/spReleaseController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";
import { loadProject, attachProjectMembership, requireProjectRole } from "../middleware/projectAccess.js";

const router = express.Router();

router.use(requireAuth);

// Only an admin/superadmin/sprint_planner may create/delete whole projects —
// that's above what a per-project "manager" is delegated to do.
const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];

// Static-segment routes ("/task-requests") must not collide with the
// "/projects/:projectId" prefix below, so they're declared first — same
// ordering convention as routes/ticketRoutes.js.
router.get("/task-requests", listMyTaskRequests);
router.patch("/task-requests/:requestId", resolveTaskRequest);

router.get("/projects", listProjects);
router.post("/projects", requireRoles(OVERSEER_ROLES), createProject);

// Everything under /projects/:projectId first loads + verifies the project,
// then verifies (non-overseer) requesters are actually a member of it.
router.use("/projects/:projectId", loadProject, attachProjectMembership);

router.get("/projects/:projectId", getProject);
router.patch("/projects/:projectId", requireProjectRole("manager"), updateProject);
router.delete("/projects/:projectId", requireRoles(["admin", "superadmin"]), deleteProject);
router.get("/projects/:projectId/stats", getProjectStats);

router.get("/projects/:projectId/members", listProjectMembers);
router.post("/projects/:projectId/members", requireProjectRole("manager"), upsertProjectMember);
router.delete(
  "/projects/:projectId/members/:userId",
  requireProjectRole("manager"),
  removeProjectMember,
);

// "manager" gate on backlog/PBI mutations relaxes to any project member when
// the company has turned on Administration > Sprint Planner Permissions >
// "Employees can edit the backlog".
const BACKLOG_RELAX = "employeesCanEditBacklog";

router.get("/projects/:projectId/backlogs", listBacklogs);
router.get("/projects/:projectId/inherited-backlogs", listInheritedBacklogs);
router.get(
  "/projects/:projectId/backlogs/:backlogId/burndown",
  getBacklogBurndown,
);
router.post(
  "/projects/:projectId/backlogs",
  requireProjectRole("manager", BACKLOG_RELAX),
  createBacklog,
);
router.patch(
  "/projects/:projectId/backlogs/:backlogId",
  requireProjectRole("manager", BACKLOG_RELAX),
  updateBacklog,
);
router.delete(
  "/projects/:projectId/backlogs/:backlogId",
  requireProjectRole("manager", BACKLOG_RELAX),
  deleteBacklog,
);

router.get("/projects/:projectId/pbis", listPbis);
router.post("/projects/:projectId/pbis", requireProjectRole("manager", BACKLOG_RELAX), createPbi);
router.patch(
  "/projects/:projectId/pbis/:pbiId",
  requireProjectRole("manager", BACKLOG_RELAX),
  updatePbi,
);
router.delete(
  "/projects/:projectId/pbis/:pbiId",
  requireProjectRole("manager", BACKLOG_RELAX),
  deletePbi,
);

router.get("/projects/:projectId/sprints", listSprints);
router.get("/projects/:projectId/inherited-sprints", listInheritedSprints);
router.post("/projects/:projectId/sprints", requireProjectRole("manager"), createSprint);
router.patch(
  "/projects/:projectId/sprints/:sprintId",
  requireProjectRole("manager"),
  updateSprint,
);
router.delete(
  "/projects/:projectId/sprints/:sprintId",
  requireProjectRole("manager"),
  deleteSprint,
);
router.post(
  "/projects/:projectId/sprints/:sprintId/publish",
  requireProjectRole("manager", "employeesCanPublishSprints"),
  publishSprint,
);
router.get("/projects/:projectId/sprints/:sprintId/board", getSprintBoard);
router.get("/projects/:projectId/sprints/:sprintId/burndown", getSprintBurndown);

router.get("/projects/:projectId/releases", listReleases);
router.post("/projects/:projectId/releases", requireProjectRole("manager"), createRelease);
router.get("/projects/:projectId/releases/:releaseId", getRelease);
router.patch(
  "/projects/:projectId/releases/:releaseId",
  requireProjectRole("manager"),
  updateRelease,
);
router.delete(
  "/projects/:projectId/releases/:releaseId",
  requireProjectRole("manager"),
  deleteRelease,
);

// Task mutation permissions (self-assignee vs. manager) are enforced inside
// the controllers themselves, since an employee must be able to drag their
// own task across the board / log time on it without a "manager" role.
router.post(
  "/projects/:projectId/tasks",
  requireProjectRole("manager", "employeesCanCreateTasks"),
  createTask,
);
router.patch("/projects/:projectId/tasks/:taskId", updateTask);
router.delete("/projects/:projectId/tasks/:taskId", requireProjectRole("manager"), deleteTask);
router.get("/projects/:projectId/tasks/:taskId/timelogs", listTimeLogs);
router.post("/projects/:projectId/tasks/:taskId/timelogs", logTime);
router.post("/projects/:projectId/tasks/:taskId/requests", createTaskRequest);

export default router;
