import Task from "../models/Task.js";
import TaskRequest from "../models/TaskRequest.js";
import User from "../models/User.js";

const OVERSEER_ROLES = ["admin", "superadmin", "sprint_planner"];
const isOverseer = (user) => Boolean(user?.roles?.some((r) => OVERSEER_ROLES.includes(r)));

// An employee diverting their own assigned task to a teammate. fromUserId is
// always the requester, never client-supplied, so a request can't be forged
// on someone else's behalf.
export const createTaskRequest = async (req, res) => {
  try {
    const { taskId, toUserId, message, hoursSpent } = req.body;
    if (!taskId || !toUserId) {
      return res.status(400).json({ message: "taskId and toUserId are required." });
    }
    if (String(toUserId) === String(req.user.id)) {
      return res.status(400).json({ message: "Cannot request yourself." });
    }
    if (hoursSpent !== undefined && Number(hoursSpent) < 0) {
      return res.status(400).json({ message: "hoursSpent can't be negative." });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found." });
    }
    if (String(task.assigneeId || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const targetUser = await User.findOne({ _id: toUserId, companyId: task.companyId }).lean();
    if (!targetUser) {
      return res.status(404).json({ message: "That teammate isn't in your company." });
    }

    const request = await TaskRequest.create({
      taskId: task._id,
      sprintId: task.sprintId,
      companyId: task.companyId,
      fromUserId: req.user.id,
      toUserId,
      message: message?.trim() || "",
      hoursSpent: hoursSpent ? Number(hoursSpent) : 0,
    });

    res.status(201).json({ request });
  } catch (error) {
    console.error("Create task request error:", error);
    res.status(500).json({ message: "Failed to send task request." });
  }
};

// A user's incoming + outgoing task requests.
export const listMyTaskRequests = async (req, res) => {
  try {
    const requests = await TaskRequest.find({
      $or: [{ toUserId: req.user.id }, { fromUserId: req.user.id }],
    })
      .sort({ createdAt: -1 })
      .populate("taskId", "title approximateHours")
      .populate("fromUserId", "name email")
      .populate("toUserId", "name email")
      .lean();
    res.json({ requests });
  } catch (error) {
    console.error("List task requests error:", error);
    res.status(500).json({ message: "Failed to load task requests." });
  }
};

export const resolveTaskRequest = async (req, res) => {
  try {
    const { action } = req.body; // "accept" | "decline" | "cancel"
    if (!["accept", "decline", "cancel"].includes(action)) {
      return res.status(400).json({ message: "action must be accept, decline, or cancel." });
    }

    const request = await TaskRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Task request not found." });
    }
    if (request.status !== "pending") {
      return res.status(409).json({ message: "This request has already been resolved." });
    }

    if (action === "cancel") {
      const canCancel =
        String(request.fromUserId) === String(req.user.id) || isOverseer(req.user);
      if (!canCancel) return res.status(403).json({ message: "Forbidden" });
      request.status = "cancelled";
      request.resolvedAt = new Date();
      await request.save();
      return res.json({ request });
    }

    if (String(request.toUserId) !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (action === "decline") {
      request.status = "declined";
      request.resolvedAt = new Date();
      await request.save();
      return res.json({ request });
    }

    // action === "accept" — guard against the task having moved on since
    // this request was sent (e.g. an overseer reassigned it in the meantime).
    const task = await Task.findById(request.taskId);
    if (!task || String(task.assigneeId || "") !== String(request.fromUserId)) {
      request.status = "cancelled";
      request.resolvedAt = new Date();
      await request.save();
      return res.status(409).json({ message: "This task was reassigned before the request could be accepted." });
    }

    // hand off the work, but keep the sender's hours as theirs — bank
    // whatever they'd already logged before the task moves to someone new
    if (request.hoursSpent > 0) {
      task.hoursLog.push({ userId: request.fromUserId, hours: request.hoursSpent });
    }
    task.assigneeId = request.toUserId;
    await task.save();

    request.status = "accepted";
    request.resolvedAt = new Date();
    await request.save();

    res.json({ request, task });
  } catch (error) {
    console.error("Resolve task request error:", error);
    res.status(500).json({ message: "Failed to resolve task request." });
  }
};
