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
    // Default per-employee sprint-hour capacity, editable by an admin in
    // Sprint Planner settings. Every sprint uses this unless it has its own
    // override (see Sprint.capacityHoursOverride).
    defaultSprintHours: { type: Number, default: 60, min: 0 },
    // The company's working day, in its own local time zone — drives the
    // Availability tab's live free/busy/off-duty dot. Defaults to a 9-5 day
    // in Dhaka, editable per company in Sprint Planner settings.
    workingHours: {
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 17, min: 1, max: 24 },
      timezone: { type: String, default: "Asia/Dhaka" },
    },
    // Numeric weights an admin can tune from the Admin Configuration panel.
    // Higher sorts first: ticketSeverity drives the ticket inbox order,
    // taskPriority drives the "My Tasks" order (see ticketApiController.getTickets
    // and spTaskController.listMyTasks).
    prioritizationWeights: {
      ticketSeverity: {
        low: { type: Number, default: 1, min: 0 },
        medium: { type: Number, default: 2, min: 0 },
        high: { type: Number, default: 3, min: 0 },
        critical: { type: Number, default: 5, min: 0 },
      },
      taskPriority: {
        low: { type: Number, default: 1, min: 0 },
        medium: { type: Number, default: 2, min: 0 },
        high: { type: Number, default: 3, min: 0 },
      },
    },
  },
  { timestamps: true },
);

// Check if the model exists to prevent OverwriteModelError in hot-reloading
const Company =
  mongoose.models.Company || mongoose.model("Company", companySchema);

// This is the line your server was missing
export default Company;
