import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ["admin"] },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    companyName: { type: String },
    phone: { type: String, default: "" },
    inviteLimit: { type: Number, default: 5 },
    googleCalendar: {
  connected: { type: Boolean, default: false },
  accessToken: { type: String },
  refreshToken: { type: String },
  expiryDate: { type: Number },
  googleEmail: { type: String },
},
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
