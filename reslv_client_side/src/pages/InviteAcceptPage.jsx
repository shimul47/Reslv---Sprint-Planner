import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [invite, setInvite] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInvite = async () => {
      if (!token) {
        setError("Missing invite token.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/invites/${token}`);
        setInvite(response.data.invite);
        setName(response.data.invite.email?.split("@")[0] || "");
      } catch (err) {
        setError(err.response?.data?.message || "Invite not found.");
      } finally {
        setLoading(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !password.trim() || submitting) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.post("/invites/accept", {
        token,
        name: name.trim(),
        password,
      });

      localStorage.setItem("token", response.data.token);
      window.location.href = response.data.user.roles?.includes("superadmin")
        ? "/admin"
        : "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept invite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07070A] text-white">
        Loading invite...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070A] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="px-8 py-7 border-b border-white/10">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70 mb-2">
            Team Invite
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Join {invite?.companyName || "your workspace"}
          </h1>
          <p className="text-sm text-white/65 mt-2">
            Accept the invitation and set your login password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-4">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/55 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-emerald-300/60"
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? "Accepting..." : "Accept Invitation"}
          </button>
        </form>
      </div>
    </div>
  );
}
