import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // "manager" can edit the backlog/sprints and publish; "member" can only
    // work their own assigned tasks, log time, and send task requests.
    projectRole: {
      type: String,
      enum: ["manager", "member"],
      default: "member",
    },
    // Free-text label the admin sets per project (e.g. "Frontend Developer")
    // — intentionally scoped to one ProjectMember row so it never leaks
    // across companies or projects.
    title: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

const ProjectMember =
  mongoose.models.ProjectMember || mongoose.model("ProjectMember", projectMemberSchema);

export default ProjectMember;
