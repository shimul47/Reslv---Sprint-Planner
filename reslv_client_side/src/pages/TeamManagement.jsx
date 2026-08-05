import React, { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";

const SUPERADMIN_COMPANY_SCOPE_KEY = "reslv.superadmin.companyScope";

const AVAILABLE_ROLES = [
  {
    id: "admin",
    label: "Admin",
    description: "Full access to settings, team, and billing.",
  },
  {
    id: "developer",
    label: "Developer",
    description: "Access to Sprint Planner and code tasks.",
  },
  {
    id: "agent",
    label: "Support Agent",
    description: "Access to Ticket System only.",
  },
  {
    id: "employee",
    label: "Employee",
    description: "Access to the workspace as a company member.",
  },
];

export default function TeamManagement() {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.roles?.includes("superadmin");

  // Start with an empty array since we are fetching from the DB now
  const [team, setTeam] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Form states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Page status states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 1. Fetch the team on component mount
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const [teamResponse, companyResponse] = await Promise.all([
          api.get("/team"),
          isSuperAdmin ? api.get("/superadmin/init") : Promise.resolve(null),
        ]);
        const data = teamResponse.data;

        // Expecting the backend to return an array of users and pending invites
        setTeam(data.team);

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
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeam();
  }, [isSuperAdmin]);

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

  // 2. Handle sending an invite to the backend
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post("/team/invite", {
        email: inviteEmail,
        role: inviteRole,
        ...(isSuperAdmin ? { companyId: inviteCompanyId } : {}),
      });

      const data = response.data;

      // Add the new pending invite to the table instantly
      const newMember = {
        id: data.invite._id,
        name: "Pending User",
        email: data.invite.email,
        role: data.invite.role,
        status: data.invite.status,
      };

      setTeam([...team, newMember]);
      setInviteEmail("");
      setInviteRole("agent");
      if (isSuperAdmin && companies.length > 0) {
        setInviteCompanyId((current) => current || companies[0]._id);
      }
      setSuccess("Invitation sent successfully!");

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle changing a user's role
  const handleRoleChange = (id, newRole) => {
    setTeam(
      team.map((member) =>
        member.id === id ? { ...member, role: newRole } : member,
      ),
    );
  };

  // Handle removing a user
  const handleRemove = (id) => {
    if (window.confirm("Are you sure you want to remove this team member?")) {
      setTeam(team.filter((member) => member.id !== id));
    }
  };

  // If the page is still fetching the initial data, show a loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-foreground)] opacity-70">
        Loading team data...
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto p-8 overflow-y-auto h-full text-[var(--color-foreground)]">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Team Management</h1>
        <p className="opacity-70">
          Invite new members to your workspace, manage their access levels, and
          organize your team.
        </p>
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

        <form
          onSubmit={handleInvite}
          className="flex flex-col md:flex-row gap-4 items-start md:items-center"
        >
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

          <div className="w-full md:w-64">
            <label className="block text-sm font-medium opacity-70 mb-1">
              Assign Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-2 focus:outline-none focus:border-[var(--color-primary)] transition-colors cursor-pointer"
            >
              {AVAILABLE_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
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

          <div className="w-full md:w-auto md:mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-2 rounded-[var(--radius-md)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center justify-center min-w-[120px]"
            >
              {isSubmitting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>

      {/* Team List Section */}
      <div className="bg-[var(--background)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--background)]">
          <h2 className="text-xl font-semibold">
            Active Members ({team.length})
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
                  Role
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
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.status === "Active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value)
                      }
                      className="bg-transparent border border-[var(--color-border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
                    >
                      {AVAILABLE_ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-red-500 hover:text-red-700 transition-colors cursor-pointer font-semibold"
                    >
                      {member.status === "Pending" ? "Revoke" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}

              {team.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center opacity-60">
                    No team members found. Start by inviting someone above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
