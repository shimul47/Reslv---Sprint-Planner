import mongoose from "mongoose";

const productBacklogSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    isDefault: { type: Boolean, default: false },
    // Data flag mirroring Sprint.shareWithSubprojects — lets this backlog be
    // surfaced read-only in child projects (see the inherited-* endpoints).
    shareWithSubprojects: { type: Boolean, default: false },
    position: { type: Number, default: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

productBacklogSchema.index({ projectId: 1, position: 1 });

const ProductBacklog =
  mongoose.models.ProductBacklog || mongoose.model("ProductBacklog", productBacklogSchema);

export default ProductBacklog;
