import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import { roleLabel } from "../data/roles.js";

const cardCls =
  "bg-[var(--background)] rounded-2xl border border-[var(--color-border)] shadow-sm p-6 sm:p-8 transition-all";
const inputCls =
  "w-full bg-transparent border border-[var(--color-border)] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all disabled:opacity-50 text-[var(--color-foreground)]";
const labelCls = "block text-sm font-medium opacity-70 mb-1.5";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const PLAN_STATUS_LABEL = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  canceled: "Canceled",
  unpaid: "Unpaid",
  inactive: "Inactive (Free)",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setUser, plan } = useContext(AuthContext);
  const isSuperAdmin = user?.roles?.includes("superadmin");

  // Navigation State
  const [activeTab, setActiveTab] = useState("general"); // 'general', 'security', 'billing'

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Subscription State
  const [subscription, setSubscription] = useState(null);
  const [planLoading, setPlanLoading] = useState(!isSuperAdmin);
  const [planError, setPlanError] = useState("");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Feedback State
  const [myScore, setMyScore] = useState(null);

  // Loyalty State
  const [loyaltySummary, setLoyaltySummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/feedback/my-score")
      .then((res) => {
        if (!cancelled && res.data.totalReviews > 0) {
          setMyScore(res.data);
        }
      })
      .catch((err) => {
        // silently ignore, they might not have feedback perms or exist
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isSuperAdmin) return;
    let cancelled = false;
    api
      .get("/loyalty/summary")
      .then((res) => {
        if (!cancelled) setLoyaltySummary(res.data.summary);
      })
      .catch((err) => {});
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  // Keep profile local state synced with context
  useEffect(() => {
    if (user) {
      setProfileFormData({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Fetch subscription info
  useEffect(() => {
    if (isSuperAdmin) return;
    let cancelled = false;
    api
      .get("/payments/subscription")
      .then((res) => {
        if (!cancelled) setSubscription(res.data.subscription);
      })
      .catch((err) => {
        if (!cancelled)
          setPlanError(err.response?.data?.message || "Could not load plan.");
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  // Handle Profile Details Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setProfileSaving(true);

    try {
      const res = await api.patch("/auth/user", profileFormData);
      if (setUser) {
        setUser((prev) => ({ ...prev, ...res.data.user }));
      }
      setProfileSuccess("Profile details updated successfully.");
      setIsEditingProfile(false);

      // Clear success message after 3 seconds
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (err) {
      setProfileError(
        err.response?.data?.message || "Failed to update profile details.",
      );
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Update
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Failed to update password.",
      );
    } finally {
      setPasswordSaving(false);
    }
  };

  const isActiveSub = ["active", "trialing"].includes(subscription?.status);
  const planId = plan?.id || "free";

  return (
    <div className="w-full h-full overflow-y-auto bg-[var(--background)] sm:bg-transparent text-[var(--color-foreground)]">
      {/* Decorative Gradient Banner */}
      <div className="h-40 w-full bg-gradient-to-r from-[var(--color-primary)] via-indigo-500 to-purple-600 hidden sm:block relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      </div>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 sm:-mt-16 pb-12 relative z-10 pt-6 sm:pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6">
            <div className="bg-[var(--background)] rounded-2xl border border-[var(--color-border)] shadow-sm pb-6">
              <div className="h-20 rounded-t-2xl bg-gradient-to-r from-[var(--color-primary)] to-indigo-500 sm:hidden"></div>
              <div className="px-6 flex flex-col items-center text-center">
                {/* Overlapping Avatar */}
                <div className="h-24 w-24 rounded-full border-4 border-[var(--background)] bg-gradient-to-br from-[var(--color-secondary)] to-gray-200 dark:to-gray-700 flex items-center justify-center text-3xl font-bold -mt-12 mb-4 shadow-md text-[var(--color-foreground)]">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
                </div>

                <h1 className="text-xl font-bold">{user?.name || "User"}</h1>
                <p className="text-sm opacity-60 mb-3">{user?.email}</p>

                <div className="flex flex-wrap justify-center gap-1.5 mb-6">
                  {(user?.roles || []).map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    >
                      {roleLabel(r)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full h-px bg-[var(--color-border)] mb-4"></div>

              {/* Navigation Tabs */}
              <nav className="px-4 flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`w-full flex items-center text-left px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                    activeTab === "general"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                      : "hover:bg-[var(--color-secondary)] opacity-70 hover:opacity-100"
                  }`}
                >
                  <svg
                    className="w-4 h-4 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  General Details
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center text-left px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                    activeTab === "security"
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                      : "hover:bg-[var(--color-secondary)] opacity-70 hover:opacity-100"
                  }`}
                >
                  <svg
                    className="w-4 h-4 mr-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Security
                </button>
                {!isSuperAdmin && (
                  <button
                    onClick={() => setActiveTab("billing")}
                    className={`w-full flex items-center text-left px-4 py-2.5 rounded-xl transition-all font-medium text-sm ${
                      activeTab === "billing"
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm"
                        : "hover:bg-[var(--color-secondary)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <svg
                      className="w-4 h-4 mr-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Billing & Plan
                  </button>
                )}
              </nav>
            </div>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div
                className={`${cardCls} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold">Personal Information</h2>
                    <p className="text-sm opacity-60 mt-1">
                      Update your personal details and how we can reach you.
                    </p>
                  </div>
                  {!isEditingProfile && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="text-sm font-semibold bg-[var(--color-secondary)] hover:bg-[var(--color-border)] px-4 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Edit details
                    </button>
                  )}
                </div>

                {profileError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {profileSuccess}
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div>
                      <label className={labelCls}>Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileFormData.name}
                        onChange={(e) =>
                          setProfileFormData({
                            ...profileFormData,
                            name: e.target.value,
                          })
                        }
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Phone Number</label>
                      <input
                        type="tel"
                        value={profileFormData.phone}
                        onChange={(e) =>
                          setProfileFormData({
                            ...profileFormData,
                            phone: e.target.value,
                          })
                        }
                        className={inputCls}
                        placeholder="e.g. +1 234 567 890"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)] mt-6">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center"
                      >
                        {profileSaving && (
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        )}
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        disabled={profileSaving}
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileFormData({
                            name: user?.name || "",
                            phone: user?.phone || "",
                          });
                        }}
                        className="px-6 py-2.5 bg-transparent border-none rounded-xl text-sm font-medium opacity-70 hover:opacity-100 hover:bg-[var(--color-secondary)] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <dt className="text-sm font-medium opacity-60">
                        Email Address
                      </dt>
                      <dd className="mt-1 text-base font-medium">
                        {user?.email}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium opacity-60">Phone</dt>
                      <dd className="mt-1 text-base font-medium">
                        {user?.phone || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium opacity-60">
                        Company
                      </dt>
                      <dd className="mt-1 text-base font-medium">
                        {user?.companyName || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium opacity-60">
                        Member since
                      </dt>
                      <dd className="mt-1 text-base font-medium">
                        {formatDate(user?.createdAt)}
                      </dd>
                    </div>
                  </dl>
                )}

                {myScore && (
                  <div className="mt-10 pt-8 border-t border-[var(--color-border)]">
                    <h3 className="text-lg font-bold mb-4">My Satisfaction Score</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 min-w-[120px]">
                        <div className="text-4xl font-bold">{myScore.avgRating}</div>
                        <div className="text-sm font-medium mt-1 text-[var(--color-foreground)] opacity-70">out of 5</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium opacity-80 mb-2">
                          Based on {myScore.totalReviews} customer review{myScore.totalReviews !== 1 ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(s => (
                            <svg key={s} className={`w-5 h-5 ${s <= Math.round(myScore.avgRating) ? 'text-amber-500 fill-amber-500' : 'text-gray-300 dark:text-gray-600 fill-transparent'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {loyaltySummary && (
                  <div className="mt-10 pt-8 border-t border-[var(--color-border)]">
                    <h3 className="text-lg font-bold mb-4">Loyalty Points</h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                      <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 min-w-[120px]">
                        <div className="text-4xl font-bold">{loyaltySummary.availablePoints.toLocaleString()}</div>
                        <div className="text-sm font-medium mt-1 text-[var(--color-foreground)] opacity-70">available</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium opacity-80 mb-2">
                          Available Discount: <span className="text-green-600 font-bold">${loyaltySummary.availableDiscount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="text-sm opacity-60">
                          Total earned: {loyaltySummary.totalPoints.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div
                className={`${cardCls} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className="mb-8">
                  <h2 className="text-xl font-bold">Change Password</h2>
                  <p className="text-sm opacity-60 mt-1">
                    Ensure your account is using a long, random password to stay
                    secure.
                  </p>
                </div>

                {passwordError && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {passwordSuccess}
                  </div>
                )}

                <form
                  onSubmit={handleChangePassword}
                  className="space-y-5 max-w-md"
                >
                  <div>
                    <label className={labelCls}>Current password</label>
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>New password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-xs opacity-50 mt-2">
                      Minimum 8 characters required.
                    </p>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm new password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer flex items-center"
                    >
                      {passwordSaving && (
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      )}
                      {passwordSaving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* BILLING TAB */}
            {activeTab === "billing" && !isSuperAdmin && (
              <div
                className={`${cardCls} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold">
                      Billing & Subscription
                    </h2>
                    <p className="text-sm opacity-60 mt-1">
                      Manage your active plan and limits.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/billing")}
                    className="text-sm font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-4 py-2 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors cursor-pointer"
                  >
                    Manage plan &rarr;
                  </button>
                </div>

                {planLoading ? (
                  <div className="flex items-center text-sm opacity-60 py-8">
                    <svg
                      className="animate-spin mr-3 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading plan details...
                  </div>
                ) : planError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm">
                    {planError}
                  </div>
                ) : (
                  <div className="bg-[var(--color-secondary)]/30 rounded-xl p-6 border border-[var(--color-border)]/50">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <dt className="text-sm font-medium opacity-60">
                          Active Plan
                        </dt>
                        <dd className="mt-1 text-base font-medium">
                          {planId}
                          {isActiveSub && (
                            <span className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider leading-none">
                              {subscription?.billingCycle || "Active"}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium opacity-60">
                          Status
                        </dt>
                        <dd className="mt-1 text-base font-medium">
                          {PLAN_STATUS_LABEL[subscription?.status] ||
                            subscription?.status ||
                            "Inactive (Free)"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium opacity-60">
                          Available Invites
                        </dt>
                        <dd className="mt-1 text-base font-medium">
                          {plan?.inviteLimit === null ||
                          plan?.inviteLimit === undefined
                            ? "Unlimited"
                            : plan.inviteLimit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium opacity-60">
                          {subscription?.cancelAtPeriodEnd
                            ? "Access ends on"
                            : "Renews on"}
                        </dt>
                        <dd className="mt-1 text-base font-medium">
                          {isActiveSub && subscription?.currentPeriodEnd
                            ? formatDate(subscription.currentPeriodEnd)
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {isActiveSub && subscription?.cancelAtPeriodEnd && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm flex items-start gap-3">
                    <svg
                      className="w-5 h-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Your plan has been canceled and will not renew. You will
                    lose premium access at the end of the current billing
                    period.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
