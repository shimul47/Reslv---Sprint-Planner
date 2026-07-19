import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ["admin", "developer", "agent"],
    default: "agent",
  },
  token: {
    type: String,
    required: true,
    unique: true, // This is the unique code for their signup link
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Whoever sent the invite
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Accepted", "Revoked"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 * 7, // Automatically delete the document after 7 days (TTL index)
  },
});

export default mongoose.model("Invite", inviteSchema);
