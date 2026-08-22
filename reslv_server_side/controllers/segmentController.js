import Segment from "../models/Segment.js";
import User from "../models/User.js";
import Task from "../models/Task.js";
import { resolveCompanyId } from "../utils/companyScope.js";

// Read: any overseer (admin/superadmin/sprint_planner) — they all need the
// segment list to filter the assignee picker when building a sprint.
export const listSegments = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const segments = await Segment.find({ companyId }).sort({ name: 1 }).lean();
    res.json({ segments });
  } catch (error) {
    console.error("List segments error:", error);
    res.status(500).json({ message: "Failed to load segments." });
  }
};

// Write: admin/superadmin only (gated in routes/segments.js) — segments are
// a one-time org-structure setup, not something a sprint_planner edits.
export const createSegment = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Segment name is required." });
    }

    const segment = await Segment.create({
      companyId,
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.user.id,
    });

    res.status(201).json({ segment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A segment with this name already exists." });
    }
    console.error("Create segment error:", error);
    res.status(500).json({ message: "Failed to create segment." });
  }
};

export const updateSegment = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const segment = await Segment.findOne({ _id: req.params.id, companyId });
    if (!segment) {
      return res.status(404).json({ message: "Segment not found." });
    }

    const { name, description } = req.body;
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Segment name is required." });
      }
      segment.name = name.trim();
    }
    if (description !== undefined) segment.description = description.trim();

    await segment.save();
    res.json({ segment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A segment with this name already exists." });
    }
    console.error("Update segment error:", error);
    res.status(500).json({ message: "Failed to update segment." });
  }
};

// Sets the segment's membership in one shot: everyone in userIds becomes a
// member (segmentId = this segment), and anyone currently on this segment
// but left out of the new list is unassigned — lets the segment's own form
// declare "these are my people" instead of editing users one at a time.
export const updateSegmentMembers = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const segment = await Segment.findOne({ _id: req.params.id, companyId });
    if (!segment) {
      return res.status(404).json({ message: "Segment not found." });
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: "userIds must be an array." });
    }

    await Promise.all([
      User.updateMany(
        { _id: { $in: userIds }, companyId },
        { segmentId: segment._id },
      ),
      User.updateMany(
        { companyId, segmentId: segment._id, _id: { $nin: userIds } },
        { segmentId: null },
      ),
    ]);

    res.json({ message: "Segment members updated." });
  } catch (error) {
    console.error("Update segment members error:", error);
    res.status(500).json({ message: "Failed to update segment members." });
  }
};

// Deleting a segment doesn't touch existing employees or tasks beyond
// unlinking them — a sprint's history shouldn't disappear because the org
// chart changed, and an employee shouldn't be deleted because their team was.
export const deleteSegment = async (req, res) => {
  try {
    const companyId = resolveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ message: "companyId is required." });
    }
    const segment = await Segment.findOne({ _id: req.params.id, companyId });
    if (!segment) {
      return res.status(404).json({ message: "Segment not found." });
    }

    await Promise.all([
      User.updateMany({ segmentId: segment._id }, { segmentId: null }),
      Task.updateMany({ segmentId: segment._id }, { segmentId: null }),
    ]);
    await segment.deleteOne();

    res.json({ message: "Segment deleted.", id: segment._id });
  } catch (error) {
    console.error("Delete segment error:", error);
    res.status(500).json({ message: "Failed to delete segment." });
  }
};
