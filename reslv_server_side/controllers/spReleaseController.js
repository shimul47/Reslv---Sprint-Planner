import Release from "../models/Release.js";
import Pbi from "../models/Pbi.js";
import Sprint from "../models/Sprint.js";

const DEFAULT_SPRINT_LENGTH_DAYS = 14;
const VELOCITY_SPRINT_SAMPLE = 5;

// Average points completed per sprint across the project's most recent
// closed sprints — the basis for a release's projected-completion estimate.
async function computeVelocity(projectId) {
  const closedSprints = await Sprint.find({ projectId, status: "closed" })
    .sort({ createdAt: -1 })
    .limit(VELOCITY_SPRINT_SAMPLE)
    .lean();

  if (closedSprints.length === 0) {
    return { velocity: null, avgSprintLengthDays: DEFAULT_SPRINT_LENGTH_DAYS, sampleSize: 0 };
  }

  const sprintIds = closedSprints.map((s) => s._id);
  const donePbis = await Pbi.find({ sprintId: { $in: sprintIds }, doneAt: { $ne: null } }).lean();
  const totalPoints = donePbis.reduce((sum, p) => sum + (p.storyPoints || 0), 0);
  const velocity = totalPoints / closedSprints.length;

  const lengths = closedSprints
    .filter((s) => s.startDate && s.endDate)
    .map((s) => (new Date(s.endDate) - new Date(s.startDate)) / 86_400_000);
  const avgSprintLengthDays = lengths.length
    ? lengths.reduce((a, b) => a + b, 0) / lengths.length
    : DEFAULT_SPRINT_LENGTH_DAYS;

  return { velocity, avgSprintLengthDays, sampleSize: closedSprints.length };
}

async function summarize(release) {
  const pbis = await Pbi.find({ releaseId: release._id }).lean();
  const remaining = pbis.filter((p) => !p.doneAt);
  return {
    ...release,
    pbiCount: pbis.length,
    totalPoints: pbis.reduce((sum, p) => sum + (p.storyPoints || 0), 0),
    remainingPoints: remaining.reduce((sum, p) => sum + (p.storyPoints || 0), 0),
    remainingHours: remaining.reduce((sum, p) => sum + (p.effortHours || 0), 0),
  };
}

export const listReleases = async (req, res) => {
  try {
    const releases = await Release.find({ projectId: req.project._id }).sort({ createdAt: -1 }).lean();
    res.json({ releases: await Promise.all(releases.map(summarize)) });
  } catch (error) {
    console.error("List releases error:", error);
    res.status(500).json({ message: "Failed to load releases." });
  }
};

export const createRelease = async (req, res) => {
  try {
    const { name, targetDate } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Release name is required." });
    }

    const release = await Release.create({
      projectId: req.project._id,
      companyId: req.project.companyId,
      name: name.trim(),
      targetDate: targetDate || null,
      createdBy: req.user.id,
    });

    res.status(201).json({ release: await summarize(release.toObject()) });
  } catch (error) {
    console.error("Create release error:", error);
    res.status(500).json({ message: "Failed to create release." });
  }
};

export const getRelease = async (req, res) => {
  try {
    const release = await Release.findOne({ _id: req.params.releaseId, projectId: req.project._id }).lean();
    if (!release) {
      return res.status(404).json({ message: "Release not found." });
    }

    const summary = await summarize(release);
    const { velocity, avgSprintLengthDays, sampleSize } = await computeVelocity(req.project._id);

    let projection = null;
    if (velocity && velocity > 0) {
      const sprintsRemaining = Math.ceil(summary.remainingPoints / velocity);
      const projectedDate = new Date(Date.now() + sprintsRemaining * avgSprintLengthDays * 86_400_000);
      projection = { velocity, sampleSize, sprintsRemaining, projectedDate };
    }

    res.json({ release: summary, projection });
  } catch (error) {
    console.error("Get release error:", error);
    res.status(500).json({ message: "Failed to load release." });
  }
};

export const updateRelease = async (req, res) => {
  try {
    const release = await Release.findOne({ _id: req.params.releaseId, projectId: req.project._id });
    if (!release) {
      return res.status(404).json({ message: "Release not found." });
    }

    const { name, targetDate, status } = req.body;
    if (name !== undefined) release.name = name.trim();
    if (targetDate !== undefined) release.targetDate = targetDate || null;
    if (status !== undefined) {
      if (!["planning", "released"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
      }
      release.status = status;
    }

    await release.save();
    res.json({ release: await summarize(release.toObject()) });
  } catch (error) {
    console.error("Update release error:", error);
    res.status(500).json({ message: "Failed to update release." });
  }
};

export const deleteRelease = async (req, res) => {
  try {
    const release = await Release.findOneAndDelete({
      _id: req.params.releaseId,
      projectId: req.project._id,
    });
    if (!release) {
      return res.status(404).json({ message: "Release not found." });
    }
    await Pbi.updateMany({ releaseId: release._id }, { releaseId: null });
    res.json({ message: "Release deleted.", id: release._id });
  } catch (error) {
    console.error("Delete release error:", error);
    res.status(500).json({ message: "Failed to delete release." });
  }
};
