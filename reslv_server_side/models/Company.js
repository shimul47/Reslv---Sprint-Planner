import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sector: { type: String, default: "Enterprise Node" },
    companyCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    ticketSettings: {
      slaTargets: {
        low: { type: Number, default: 1440 },
        medium: { type: Number, default: 480 },
        high: { type: Number, default: 120 },
        critical: { type: Number, default: 30 },
      },
      autoAssignOnReply: { type: Boolean, default: true },
      supportHoursNote: { type: String, default: "", trim: true, maxlength: 200 },
    },
  },
  { timestamps: true },
);

// Check if the model exists to prevent OverwriteModelError in hot-reloading
const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

// This is the line your server was missing
export default Company;
