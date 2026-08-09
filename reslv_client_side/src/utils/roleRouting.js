// Where a user should land after logging in, accepting an invite, or
// switching their active role. Kept as one function so landing behavior is
// consistent across every entry point instead of each place guessing.
export function roleLandingPath(roles = []) {
  if (roles.includes("superadmin")) return "/admin";
  if (roles.includes("admin")) return "/dashboard";

  // Ticket System is agent-only; Sprint Planner is sprint_planner-only.
  // Employee has no dedicated page yet (their assigned-task view is a
  // future feature) — they land on the hub like a multi-role user.
  const hasTicketAccess = roles.includes("agent");
  const hasSprintAccess = roles.includes("sprint_planner");

  if (hasTicketAccess && !hasSprintAccess) return "/tickets/inbox";
  if (hasSprintAccess && !hasTicketAccess) return "/sprint-planner";

  // Multi-role (e.g. agent + sprint_planner), employee-only, or
  // unrecognized — land on the hub so they can see what's available.
  return "/dashboard";
}
