import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sector: { type: String, default: "Enterprise Node" },
    companyCode: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Check if the model exists to prevent OverwriteModelError in hot-reloading
const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

// This is the line your server was missing
export default Company;
