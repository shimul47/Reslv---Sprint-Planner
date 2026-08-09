// Single source of truth for role IDs/labels used across invites, the team
// list, and the role switcher. Keep in sync with the enum in
// reslv_server_side/models/Invite.js.
export const ROLE_OPTIONS = [
  {
    id: "admin",
    label: "Admin",
    description: "Full access to settings, team, and billing.",
  },
  {
    id: "agent",
    label: "Support Agent",
    description: "Access to the ticket system.",
  },
  {
    id: "employee",
    label: "Employee",
    description: "Access to the workspace as a company member.",
  },
  {
    id: "sprint_planner",
    label: "Sprint Planner",
    description: "Access to Sprint Planner.",
  },
];

export const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, r) => {
  acc[r.id] = r.label;
  return acc;
}, { superadmin: "Super Admin" });

export function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}
