import mongoose from "mongoose";

// Reusable company-wide team/department (e.g. "Web Team", "QA Team") that
// sprint tasks and employees are tagged with — created once by an admin and
// reused across every sprint, rather than redefined each time.
const segmentSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

segmentSchema.index({ companyId: 1, name: 1 }, { unique: true });

const Segment = mongoose.models.Segment || mongoose.model("Segment", segmentSchema);

export default Segment;
