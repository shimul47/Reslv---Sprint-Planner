// A superadmin has no companyId of their own, so they must target a company
// explicitly (?companyId= on reads, companyId in the body on writes) —
// mirrors how they scope /superadmin/init. Everyone else is pinned to their
// own company regardless of what the request claims.
export function resolveCompanyId(req) {
  const isSuperAdmin = req.user.roles?.includes("superadmin");
  if (isSuperAdmin) {
    return req.query.companyId || req.body?.companyId || null;
  }
  return req.user.companyId;
}
