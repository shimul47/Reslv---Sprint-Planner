import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api/axios";

const PLANS = [
  {
    id: "monthly",
    label: "Premium — Monthly",
    price: "$29 / mo",
    blurb: "Billed every month. Cancel anytime.",
  },
  {
    id: "yearly",
    label: "Premium — Yearly",
    price: "$290 / yr",
    blurb: "Two months free compared to monthly.",
  },
];

export default function BillingPage() {
  const location = useLocation();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // which button is spinning
  const [error, setError] = useState("");

  const justSucceeded = location.pathname.endsWith("/success");
  const justCancelled = location.pathname.endsWith("/cancelled");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/payments/subscription")
      .then((res) => {
        if (!cancelled) setSubscription(res.data);
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

  const handleUpgrade = async (billingCycle) => {
    setActionLoading(billingCycle);
    setError("");
    try {
      const res = await api.post("/payments/create-checkout-session", {
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

  return (
    <div className="max-w-3xl mx-auto p-8">
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
              {subscription?.plan || "free"}{" "}
              {subscription?.billingCycle ? `(${subscription.billingCycle})` : ""}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Status: {subscription?.status || "inactive"}
            </p>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className="rounded-lg border border-gray-200 p-5 flex flex-col"
              >
                <p className="font-medium">{plan.label}</p>
                <p className="text-2xl font-semibold mt-2">{plan.price}</p>
                <p className="text-xs text-gray-500 mt-1 flex-1">{plan.blurb}</p>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={actionLoading === plan.id}
                  className="mt-4 text-sm px-4 py-2 rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {actionLoading === plan.id ? "Redirecting…" : "Upgrade"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
