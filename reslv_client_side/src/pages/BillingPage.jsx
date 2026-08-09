import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";

const FEATURE_LABELS = {
  reports: "Reports & analytics",
  sprintPlannerInvite: "Invite Sprint Planners",
  customSlaSettings: "Custom SLA & support-hours settings",
};

function formatInviteLimit(limit) {
  return limit === null || limit === undefined ? "Unlimited invites" : `${limit} invites`;
}

export default function BillingPage() {
  const location = useLocation();
  const [subscription, setSubscription] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // which button is spinning
  const [error, setError] = useState("");

  const justSucceeded = location.pathname.endsWith("/success");
  const justCancelled = location.pathname.endsWith("/cancelled");

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get("/payments/subscription"), api.get("/payments/plans")])
      .then(([subRes, plansRes]) => {
        if (cancelled) return;
        setSubscription(subRes.data.subscription);
        setCurrentPlan(subRes.data.plan);
        setTiers(plansRes.data.tiers);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err.response?.data?.message || "Could not load subscription");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpgrade = async (tierId) => {
    setActionLoading(tierId);
    setError("");
    try {
      const res = await api.post("/payments/create-checkout-session", {
        tier: tierId,
        billingCycle,
      });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Could not start checkout");
      setActionLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setActionLoading("portal");
    setError("");
    try {
      const res = await api.post("/payments/create-portal-session");
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Could not open billing portal");
      setActionLoading(null);
    }
  };

  const isActiveSub = ["active", "trialing"].includes(subscription?.status);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-gray-500 mb-6">
        Manage your company's subscription plan.
      </p>

      {justSucceeded && (
        <div className="mb-6 rounded-md border border-green-300 bg-green-50 text-green-800 px-4 py-3 text-sm">
          Payment successful — your subscription is being activated. It should
          reflect below within a few seconds.
        </div>
      )}
      {justCancelled && (
        <div className="mb-6 rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
          Checkout was cancelled. No charges were made.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading subscription…</p>
      ) : (
        <>
          <div className="mb-8 rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Current plan</p>
            <p className="text-lg font-medium capitalize">
              {currentPlan?.id || "free"}{" "}
              {isActiveSub && subscription?.billingCycle ? `(${subscription.billingCycle})` : ""}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Status: {subscription?.status || "inactive"} ·{" "}
              {formatInviteLimit(currentPlan?.inviteLimit)}
            </p>
            {isActiveSub && subscription?.cancelAtPeriodEnd && subscription?.currentPeriodEnd && (
              <p className="text-xs text-amber-600 mt-1">
                Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}

            {subscription?.stripeCustomerId && (
              <button
                onClick={handleManageBilling}
                disabled={actionLoading === "portal"}
                className="mt-4 text-sm px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                {actionLoading === "portal" ? "Opening…" : "Manage billing"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mb-6">
            <span className={billingCycle === "monthly" ? "font-medium" : "text-gray-500"}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle((c) => (c === "monthly" ? "yearly" : "monthly"))}
              className="relative w-11 h-6 rounded-full bg-gray-300 transition-colors"
              aria-label="Toggle billing cycle"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  billingCycle === "yearly" ? "translate-x-5" : ""
                }`}
              />
            </button>
            <span className={billingCycle === "yearly" ? "font-medium" : "text-gray-500"}>
              Yearly
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tiers.map((tier) => {
              const isCurrent = isActiveSub && currentPlan?.id === tier.id;
              const price = billingCycle === "monthly" ? tier.monthlyUsd : tier.yearlyUsd;
              return (
                <div
                  key={tier.id}
                  className={`rounded-lg border p-5 flex flex-col ${
                    isCurrent ? "border-black ring-1 ring-black" : "border-gray-200"
                  }`}
                >
                  <p className="font-medium">{tier.label}</p>
                  <p className="text-2xl font-semibold mt-2">
                    ${price}
                    <span className="text-sm font-normal text-gray-500">
                      {" "}
                      / {billingCycle === "monthly" ? "mo" : "yr"}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{tier.tagline}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatInviteLimit(tier.inviteLimit)}</p>
                  <ul className="text-xs text-gray-500 mt-2 space-y-1 flex-1">
                    {Object.entries(tier.features)
                      .filter(([, enabled]) => enabled)
                      .map(([key]) => (
                        <li key={key}>✓ {FEATURE_LABELS[key] || key}</li>
                      ))}
                  </ul>
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={isCurrent || actionLoading === tier.id}
                    className="mt-4 text-sm px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isCurrent
                      ? "Current plan"
                      : actionLoading === tier.id
                        ? "Redirecting…"
                        : "Upgrade"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
