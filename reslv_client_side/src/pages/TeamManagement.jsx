import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import { ROLE_OPTIONS, roleLabel } from "../data/roles.js";
import SprintPlannerCapacityPanel from "../components/sprintPlanner/SprintPlannerCapacityPanel.jsx";
import SegmentsPanel from "../components/sprintPlanner/SegmentsPanel.jsx";

const SUPERADMIN_COMPANY_SCOPE_KEY = "reslv.superadmin.companyScope";

export default function TeamManagement() {
  const { user, plan } = useContext(AuthContext);
  const navigate = useNavigate();
  const isSuperAdmin = user?.roles?.includes("superadmin");
  const canInviteSprintPlanner = isSuperAdmin || Boolean(plan?.features?.sprintPlannerInvite);

  const [team, setTeam] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [segments, setSegments] = useState([]);
  const [inviteLimit, setInviteLimit] = useState(5);
  const [inviteUsage, setInviteUsage] = useState(0);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState(["agent"]);
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [inviteLimitInput, setInviteLimitInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline role-editing state (existing members only)
  const [editingRolesId, setEditingRolesId] = useState(null);
  const [draftRoles, setDraftRoles] = useState([]);

  // Page status states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const assignableRoles = isSuperAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => r.id !== "admin");

  // Re-fetches just the team list (roles, segments, etc.) without touching
  // the superadmin company-scope selector — used both on mount and any time
  // a member's segment changes from a place other than the table itself
  // (e.g. saving a segment's member checklist).
  const refreshTeam = useCallback(async () => {
    try {
      const res = await api.get("/team");
      setTeam(res.data.team);
      setInviteLimit(res.data.inviteLimit === undefined ? 5 : res.data.inviteLimit);
      setInviteUsage(res.data.inviteUsage ?? 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  }, []);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const [teamResponse, companyResponse] = await Promise.all([
          api.get("/team"),
          isSuperAdmin ? api.get("/superadmin/init") : Promise.resolve(null),
        ]);
        const data = teamResponse.data;

        setTeam(data.team);
        // inviteLimit may legitimately be null (Enterprise = unlimited) —
        // only fall back to 5 if the field is missing entirely.
        setInviteLimit(data.inviteLimit === undefined ? 5 : data.inviteLimit);
        setInviteUsage(data.inviteUsage ?? 0);

        if (companyResponse?.data?.companies) {
          setCompanies(companyResponse.data.companies);
          const savedScope = localStorage.getItem(SUPERADMIN_COMPANY_SCOPE_KEY);
          const matchingCompany = companyResponse.data.companies.find(
            (company) => company._id === savedScope,
          );
          setInviteCompanyId(
            matchingCompany?._id ||
            companyResponse.data.companies[0]?._id ||
            "",
          );
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [isSuperAdmin]);

  const fetchSegments = useCallback(async () => {
    if (isSuperAdmin && !inviteCompanyId) return;
    try {
      const res = await api.get("/segments", {
        params: isSuperAdmin ? { companyId: inviteCompanyId } : {},
      });
      setSegments(res.data.segments || []);
    } catch {
      // Non-critical — the segment column/panel just shows an empty list.
    }
  }, [isSuperAdmin, inviteCompanyId]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  useEffect(() => {
    if (!isSuperAdmin || companies.length === 0) return;

    const savedScope = localStorage.getItem(SUPERADMIN_COMPANY_SCOPE_KEY);
    const companyExists = companies.some(
      (company) => company._id === savedScope,
    );
    setInviteCompanyId(
      savedScope && companyExists ? savedScope : companies[0]._id,
    );
  }, [isSuperAdmin, companies]);

  const toggleInviteRole = (roleId) => {
    setInviteRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || inviteRoles.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    // 1. Save the old value BEFORE changing it
    const prevUsage = inviteUsage;

    try {
      const response = await api.post("/team/invite", {
        email: inviteEmail,
        roles: inviteRoles,
        ...(isSuperAdmin ? { companyId: inviteCompanyId } : {}),
        ...(isSuperAdmin && inviteRoles.includes("admin") && inviteLimitInput
          ? { inviteLimit: Number(inviteLimitInput) }
          : {}),
      });

      const data = response.data;
      const newMember = {
        id: data.invite._id,
        type: "invite",
        name: "Pending User",
        email: data.invite.email,
        roles: data.invite.roles,
        status: data.invite.status,
      };

      setTeam((prev) => [...prev, newMember]);
      setInviteUsage((prev) => prev + 1);   // optimistic increment
      setInviteEmail("");
      setInviteRoles(["agent"]);
      setInviteLimitInput("");
      setSuccess("Invitation sent successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      // 2. Restore the old value on failure
      setInviteUsage(prevUsage);
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditRoles = (member) => {
    setEditingRolesId(member.id);
    setDraftRoles(member.roles || []);
  };

  const toggleDraftRole = (roleId) => {
    setDraftRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((r) => r !== roleId)
        : [...prev, roleId],
    );
  };

  const saveRoles = async (memberId) => {
    if (draftRoles.length === 0) return;
    const prevTeam = team;
    setTeam((t) =>
      t.map((m) => (m.id === memberId ? { ...m, roles: draftRoles } : m)),
    );
    setEditingRolesId(null);
    try {
      await api.patch(`/team/${memberId}/roles`, { roles: draftRoles });
    } catch (err) {
      setTeam(prevTeam);
      setError(err.response?.data?.message || "Failed to update roles.");
    }
  };

  const updateMemberSegment = async (memberId, segmentId) => {
    const prevTeam = team;
    setTeam((t) => t.map((m) => (m.id === memberId ? { ...m, segmentId: segmentId || null } : m)));
    try {
      await api.patch(`/team/${memberId}/segment`, { segmentId: segmentId || null });
    } catch (err) {
      setTeam(prevTeam);
      setError(err.response?.data?.message || "Failed to update segment.");
    }
  };

  const handleRemove = async (member) => {
    const confirmLabel =
      member.type === "invite"
        ? "revoke this invite"
        : "remove this team member";
    if (!window.confirm(`Are you sure you want to ${confirmLabel}?`)) return;

    const prevTeam = team;
    setTeam((t) => t.filter((m) => m.id !== member.id));
    try {
      if (member.type === "invite") {
        await api.delete(`/team/invites/${member.id}`);
      } else {
        await api.delete(`/team/${member.id}`);
      }
    } catch (err) {
      setTeam(prevTeam);
      setError(err.response?.data?.message || "Failed to remove.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-foreground)] opacity-70">
        Loading team data...
      </div>
    );
  }

  const invitesLeft =
    inviteLimit === null || inviteLimit === undefined
      ? Infinity
      : Math.max(inviteLimit - inviteUsage, 0);

  return (
    <div className="w-full p-4 sm:p-8 overflow-y-auto h-full text-[var(--color-foreground)]">
      {/* Header Section */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Team Management</h1>
          <p className="opacity-70">
            Invite new members to your workspace, manage their access levels,
            and organize your team.
          </p>
        </div>
        {!isSuperAdmin && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <div
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm ${invitesLeft === 0
                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  : "bg-[var(--color-secondary)]"
                }`}
            >
              <span className="opacity-70">Invites used</span>
              <span className="font-bold">
                {inviteUsage} / {inviteLimit ?? "∞"}
              </span>
              {invitesLeft === 0 ? (
                <span>— limit reached, upgrade to invite more</span>
              ) : (
                <span className="opacity-60">
                  ({invitesLeft === Infinity ? "unlimited" : invitesLeft} left)
                </span>
              )}
            </div>
            {plan?.id !== "enterprise" && (
              <button
                type="button"
                onClick={() => navigate("/billing")}
                className="px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] transition-colors cursor-pointer"
              >
                Upgrade plan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Card */}
      <div className="bg-[var(--background)] p-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] mb-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-[var(--radius-md)] text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-[var(--radius-md)] text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium opacity-70 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>

            {isSuperAdmin && (
              <div className="w-full md:w-72">
                <label className="block text-sm font-medium opacity-70 mb-1">
                  Company
                </label>
                <select
                  value={inviteCompanyId}
                  onChange={(e) => setInviteCompanyId(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
                >
                  {companies.map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.name} ({company.companyCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-full md:w-auto">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-2 rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[120px]"
              >
                {isSubmitting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium opacity-70 mb-1.5">
              Assign Role(s)
            </label>
            <div className="flex flex-wrap gap-3">
              {assignableRoles.map((role) => {
                const isLockedSprintPlanner =
                  role.id === "sprint_planner" && !canInviteSprintPlanner;
                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[var(--radius-md)] ${isLockedSprintPlanner
                        ? "bg-[var(--color-secondary)]/50 opacity-60 cursor-not-allowed"
                        : "bg-[var(--color-secondary)] cursor-pointer"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={inviteRoles.includes(role.id)}
                      disabled={isLockedSprintPlanner}
                      onChange={() => toggleInviteRole(role.id)}
                    />
                    {role.label}
                    {isLockedSprintPlanner && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/billing");
                        }}
                        className="text-xs text-[var(--color-primary)] underline cursor-pointer"
                      >
                        🔒 Requires Professional
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {isSuperAdmin && inviteRoles.includes("admin") && (
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium opacity-70 mb-1">
                Invite Limit for this Admin
              </label>
              <input
                type="number"
                min={1}
                placeholder="5"
                value={inviteLimitInput}
                onChange={(e) => setInviteLimitInput(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          )}
        </form>
      </div>

      {/* Team List Section */}
      <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--background)]">
          <h2 className="text-xl font-semibold">
            Team Members ({team.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--background)]/50">
                <th className="px-6 py-3 text-sm font-medium opacity-70 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-sm font-medium opacity-70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-sm font-medium opacity-70 uppercase tracking-wider">
                  Role(s)
                </th>
                <th className="px-6 py-3 text-sm font-medium opacity-70 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-sm font-medium opacity-70 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {team.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-[var(--color-border)]/20 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-[var(--color-border)] rounded-full flex items-center justify-center font-bold text-[var(--color-foreground)]/70">
                        {member.name
                          ? member.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{member.name}</div>
                        <div className="text-sm opacity-60">{member.email}</div>
                        {member.companyName && (
                          <div className="text-xs opacity-50">
                            {member.companyName}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${member.status === "Active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {editingRolesId === member.id ? (
                      <div className="flex flex-col gap-1.5 min-w-[160px]">
                        {assignableRoles.map((role) => (
                          <label
                            key={role.id}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={draftRoles.includes(role.id)}
                              onChange={() => toggleDraftRole(role.id)}
                            />
                            {role.label}
                          </label>
                        ))}
                        <div className="flex gap-3 mt-1">
                          <button
                            type="button"
                            onClick={() => saveRoles(member.id)}
                            className="text-xs text-[var(--color-primary)] font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRolesId(null)}
                            className="text-xs opacity-60 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {(member.roles || []).map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-border)]/40"
                          >
                            {roleLabel(r)}
                          </span>
                        ))}
                        {member.type === "user" && (
                          <button
                            type="button"
                            onClick={() => startEditRoles(member)}
                            className="text-xs text-[var(--color-primary)] ml-1 hover:underline cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {member.type === "user" ? (
                      <select
                        value={member.segmentId || ""}
                        onChange={(e) => updateMemberSegment(member.id, e.target.value)}
                        className="text-xs bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-sm)] px-2 py-1.5 focus:outline-none focus:border-[var(--color-primary)] cursor-pointer max-w-[160px]"
                      >
                        <option value="">Unassigned</option>
                        {segments.map((seg) => (
                          <option key={seg._id} value={seg._id}>
                            {seg.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs opacity-40">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemove(member)}
                      className="text-red-500 hover:text-red-700 transition-colors cursor-pointer font-semibold"
                    >
                      {member.type === "invite" ? "Revoke" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}

              {team.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center opacity-60">
                    No team members found. Start by inviting someone above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SegmentsPanel
        companyId={isSuperAdmin ? inviteCompanyId || undefined : null}
        segments={segments}
        onChanged={fetchSegments}
        team={team}
        onTeamChanged={refreshTeam}
      />

      <SprintPlannerCapacityPanel companyId={isSuperAdmin ? inviteCompanyId || undefined : null} />
    </div>
  );
}
