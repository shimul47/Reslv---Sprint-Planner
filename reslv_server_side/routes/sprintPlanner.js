import express from "express";
import {
  listSprints,
  createSprint,
  getSprint,
  updateSprint,
  deleteSprint,
  publishSprint,
  getSprintBoard,
  getSprintCapacity,
  getSprintStats,
} from "../controllers/spSprintController.js";
import {
  createTask,
  updateTask,
  deleteTask,
  listMyTasks,
  getTaskCapacity,
  attemptTask,
  completeTask,
} from "../controllers/spTaskController.js";
import {
  createTaskRequest,
  listMyTaskRequests,
  resolveTaskRequest,
} from "../controllers/spTaskRequestController.js";
import { getAnalytics } from "../controllers/spAnalyticsController.js";
import { requireAuth, requireRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

// Only an admin/superadmin/sprint_planner may manage sprints/tasks —
// employees only ever touch /tasks/my, /tasks/:id/attempt|complete, and
// /task-requests, all of which enforce ownership inside the controller.
const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];
const overseerOnly = requireRoles(OVERSEER_ROLES);

// Static segments must be declared before the "/tasks/:id" and
// "/sprints/:sprintId/tasks" param routes below, so they don't get
// swallowed as an ":id"/":sprintId" — same ordering convention already used
// elsewhere in this app (routes/ticketRoutes.js).
router.get("/tasks/my", listMyTasks);
router.get("/tasks/:id/capacity", getTaskCapacity);
router.post("/tasks/:id/attempt", attemptTask);
router.post("/tasks/:id/complete", completeTask);

router.get("/task-requests", listMyTaskRequests);
router.post("/task-requests", createTaskRequest);
router.patch("/task-requests/:id", resolveTaskRequest);

router.get("/sprints", overseerOnly, listSprints);
router.post("/sprints", overseerOnly, createSprint);
router.get("/sprints/:id", overseerOnly, getSprint);
router.patch("/sprints/:id", overseerOnly, updateSprint);
router.delete("/sprints/:id", overseerOnly, deleteSprint);
router.post("/sprints/:id/publish", overseerOnly, publishSprint);
router.get("/sprints/:id/board", overseerOnly, getSprintBoard);
router.get("/sprints/:id/capacity", overseerOnly, getSprintCapacity);
router.get("/sprints/:id/stats", overseerOnly, getSprintStats);

router.post("/sprints/:sprintId/tasks", overseerOnly, createTask);
router.patch("/tasks/:id", overseerOnly, updateTask);
router.delete("/tasks/:id", overseerOnly, deleteTask);

router.get("/analytics", overseerOnly, getAnalytics);

export default router;
