// Shared pattern for role-gated UI: if the user has an active role selected
// (via the role switcher), gate on that one role — it's what they're
// currently "acting as". Otherwise fall back to full membership across all
// their roles (e.g. before activeRole has settled on mount).
//
// This is a client-side "acting as" convenience layer only — it never
// substitutes for real authorization, which routes/endpoints enforce
// server-side against the full roles array regardless of activeRole.
export function roleCan(activeRole, userRoles, allowedRoles) {
  if (activeRole) return allowedRoles.includes(activeRole);
  return (userRoles || []).some((r) => allowedRoles.includes(r));
}
