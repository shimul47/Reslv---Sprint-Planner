import ProductBacklog from "../models/ProductBacklog.js";
import Pbi from "../models/Pbi.js";
import { collectAncestorProjects } from "../middleware/projectAccess.js";

// Read-only: backlogs an ancestor project has opted to share down
// (shareWithSubprojects), surfaced in this project's view but not editable
// from here — mutations still require membership on the owning project.
export const listInheritedBacklogs = async (req, res) => {
  try {
    const ancestors = await collectAncestorProjects(req.project);
    if (ancestors.length === 0) {
      return res.json({ backlogs: [] });
    }

    const nameByProjectId = new Map(ancestors.map((p) => [String(p._id), p.name]));
    const backlogs = await ProductBacklog.find({
      projectId: { $in: ancestors.map((p) => p._id) },
      shareWithSubprojects: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    const withCounts = await Promise.all(
      backlogs.map(async (b) => ({
        ...b,
        sourceProjectName: nameByProjectId.get(String(b.projectId)) || "Parent project",
        itemCount: await Pbi.countDocuments({ backlogId: b._id }),
      })),
    );

    res.json({ backlogs: withCounts });
  } catch (error) {
    console.error("List inherited backlogs error:", error);
    res.status(500).json({ message: "Failed to load shared backlogs." });
  }
};

// ── Product Backlogs (multiple per project) ─────────────────────────────────

export const listBacklogs = async (req, res) => {
  try {
    const backlogs = await ProductBacklog.find({ projectId: req.project._id })
      .sort({ position: 1, createdAt: 1 })
      .lean();
    res.json({ backlogs });
  } catch (error) {
    console.error("List backlogs error:", error);
    res.status(500).json({ message: "Failed to load backlogs." });
  }
};

export const createBacklog = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Backlog name is required." });
    }

    const count = await ProductBacklog.countDocuments({ projectId: req.project._id });
    const backlog = await ProductBacklog.create({
      projectId: req.project._id,
      companyId: req.project.companyId,
      name: name.trim(),
      isDefault: count === 0,
      position: count,
      createdBy: req.user.id,
    });

    res.status(201).json({ backlog });
  } catch (error) {
    console.error("Create backlog error:", error);
    res.status(500).json({ message: "Failed to create backlog." });
  }
};

export const updateBacklog = async (req, res) => {
  try {
    const backlog = await ProductBacklog.findOne({
      _id: req.params.backlogId,
      projectId: req.project._id,
    });
    if (!backlog) {
      return res.status(404).json({ message: "Backlog not found." });
    }

    const { name, status, position, shareWithSubprojects } = req.body;
    if (name !== undefined) backlog.name = name.trim();
    if (status !== undefined) {
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      backlog.status = status;
    }
    if (position !== undefined) backlog.position = position;
    if (shareWithSubprojects !== undefined) backlog.shareWithSubprojects = Boolean(shareWithSubprojects);

    await backlog.save();
    res.json({ backlog });
  } catch (error) {
    console.error("Update backlog error:", error);
    res.status(500).json({ message: "Failed to update backlog." });
  }
};

export const deleteBacklog = async (req, res) => {
  try {
    const backlog = await ProductBacklog.findOne({
      _id: req.params.backlogId,
      projectId: req.project._id,
    });
    if (!backlog) {
      return res.status(404).json({ message: "Backlog not found." });
    }

    const pbiCount = await Pbi.countDocuments({ backlogId: backlog._id });
    if (pbiCount > 0) {
      return res.status(400).json({
        message: "Move or delete this backlog's items before deleting it.",
      });
    }

    await backlog.deleteOne();
    res.json({ message: "Backlog deleted.", id: backlog._id });
  } catch (error) {
    console.error("Delete backlog error:", error);
    res.status(500).json({ message: "Failed to delete backlog." });
  }
};

// ── Product Backlog Items ───────────────────────────────────────────────────

export const listPbis = async (req, res) => {
  try {
    const pbis = await Pbi.find({ projectId: req.project._id })
      .sort({ position: 1, createdAt: 1 })
      .populate("sprintId", "name status published")
      .lean();
    res.json({ pbis });
  } catch (error) {
    console.error("List PBIs error:", error);
    res.status(500).json({ message: "Failed to load backlog items." });
  }
};

export const createPbi = async (req, res) => {
  try {
    const { backlogId, title, description, type, storyPoints, effortHours } = req.body;
    if (!backlogId || !title?.trim()) {
      return res.status(400).json({ message: "backlogId and title are required." });
    }

    const backlog = await ProductBacklog.findOne({ _id: backlogId, projectId: req.project._id });
    if (!backlog) {
      return res.status(404).json({ message: "Backlog not found." });
    }

    const count = await Pbi.countDocuments({ backlogId });
    const pbi = await Pbi.create({
      projectId: req.project._id,
      companyId: req.project.companyId,
      backlogId,
      title: title.trim(),
      description: description?.trim() || "",
      type: ["feature", "bug", "chore"].includes(type) ? type : "feature",
      storyPoints: storyPoints ?? null,
      effortHours: effortHours ?? null,
      position: count,
      createdBy: req.user.id,
    });

    res.status(201).json({ pbi });
  } catch (error) {
    console.error("Create PBI error:", error);
    res.status(500).json({ message: "Failed to create backlog item." });
  }
};

// Single general-purpose PATCH (mirrors ticketApiController.patchTicket) —
// also how drag & drop reordering/moving between backlogs works: the client
// sends the new { backlogId, sprintId, position } in one call.
export const updatePbi = async (req, res) => {
  try {
    const pbi = await Pbi.findOne({ _id: req.params.pbiId, projectId: req.project._id });
    if (!pbi) {
      return res.status(404).json({ message: "Backlog item not found." });
    }

    if (req.body.backlogId !== undefined) {
      const backlog = await ProductBacklog.findOne({
        _id: req.body.backlogId,
        projectId: req.project._id,
      });
      if (!backlog) {
        return res.status(404).json({ message: "Target backlog not found." });
      }
      pbi.backlogId = req.body.backlogId;
    }
    if (req.body.sprintId !== undefined) pbi.sprintId = req.body.sprintId || null;
    if (req.body.position !== undefined) pbi.position = req.body.position;
    if (req.body.title !== undefined) pbi.title = req.body.title.trim();
    if (req.body.description !== undefined) pbi.description = req.body.description.trim();
    if (req.body.type !== undefined) {
      if (!["feature", "bug", "chore"].includes(req.body.type)) {
        return res.status(400).json({ message: "Invalid type." });
      }
      pbi.type = req.body.type;
    }
    if (req.body.storyPoints !== undefined) pbi.storyPoints = req.body.storyPoints;
    if (req.body.effortHours !== undefined) pbi.effortHours = req.body.effortHours;
    if (req.body.releaseId !== undefined) pbi.releaseId = req.body.releaseId || null;
    if (req.body.status !== undefined) {
      if (!["new", "in_progress", "done"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      // doneAt is the source of truth for points-burndown/velocity — set
      // exactly on the new/in_progress -> done transition, cleared if it
      // moves back, never inferred from updatedAt (which any edit bumps).
      if (req.body.status === "done" && pbi.status !== "done") pbi.doneAt = new Date();
      else if (req.body.status !== "done" && pbi.status === "done") pbi.doneAt = null;
      pbi.status = req.body.status;
    }

    await pbi.save();
    res.json({ pbi });
  } catch (error) {
    console.error("Update PBI error:", error);
    res.status(500).json({ message: "Failed to update backlog item." });
  }
};

export const deletePbi = async (req, res) => {
  try {
    const pbi = await Pbi.findOneAndDelete({ _id: req.params.pbiId, projectId: req.project._id });
    if (!pbi) {
      return res.status(404).json({ message: "Backlog item not found." });
    }
    res.json({ message: "Backlog item deleted.", id: pbi._id });
  } catch (error) {
    console.error("Delete PBI error:", error);
    res.status(500).json({ message: "Failed to delete backlog item." });
  }
};
