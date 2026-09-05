import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import api from "../api/axios";
import { 
  Trophy, 
  Gift, 
  Settings, 
  TrendingUp, 
  ArrowRightLeft,
  Coins,
  History,
  Award,
  Plus,
  Minus
} from "lucide-react";

export default function LoyaltyPointsPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.roles?.includes("superadmin") || user?.roles?.includes("admin");

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settings
  const [pointsPerDollar, setPointsPerDollar] = useState(100);
  
  // Modals / Forms
  const [showSettings, setShowSettings] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  
  const [redeemAmount, setRedeemAmount] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const sumRes = await api.get("/loyalty/summary");
      setSummary(sumRes.data.summary);
      setTransactions(sumRes.data.transactions);
      setPointsPerDollar(sumRes.data.summary.pointsPerDollar);
      
      if (isAdmin) {
        const leadRes = await api.get("/loyalty/leaderboard");
        setLeaderboard(leadRes.data.leaderboard);
      }
    } catch (err) {
      console.error("Failed to fetch loyalty data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put("/loyalty/settings", { pointsPerDollar: Number(pointsPerDollar) });
      setShowSettings(false);
      fetchData();
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    try {
      await api.post("/loyalty/redeem", { points: Number(redeemAmount) });
      setShowRedeem(false);
      setRedeemAmount("");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to redeem points");
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post("/loyalty/adjust", { 
        points: Number(adjustAmount),
        reason: adjustReason
      });
      setShowAdjust(false);
      setAdjustAmount("");
      setAdjustReason("");
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to adjust points");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 font-mono text-sm">
        LOADING_LOYALTY...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2 text-[var(--color-foreground)]">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Loyalty Points
          </h1>
          <p className="text-sm text-gray-500">
            Earn points by providing stellar support and convert them to subscription discounts.
          </p>
        </div>
        {isAdmin && (
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Adjust
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setShowRedeem(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm rounded bg-black text-white hover:bg-gray-800 transition-colors"
            >
              <Gift className="w-4 h-4" />
              Redeem Discount
            </button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-500">Available Points</div>
          </div>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">
            {summary?.availablePoints.toLocaleString()}
          </div>
        </div>

        <div className="bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Gift className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-500">Available Discount</div>
          </div>
          <div className="text-3xl font-bold text-green-600">
            ${summary?.availableDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            at {summary?.pointsPerDollar} points = $1
          </div>
        </div>

        <div className="bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-500">Total Earned</div>
          </div>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">
            {summary?.totalPoints.toLocaleString()}
          </div>
        </div>

        <div className="bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-gray-500">Total Redeemed</div>
          </div>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">
            {summary?.redeemedPoints.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* History Table */}
        <div className="lg:col-span-2 bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 text-[var(--color-foreground)]">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold">Points History</h2>
          </div>
          
          {transactions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
              No transactions yet. Start resolving tickets to earn points!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          tx.type === "earned" ? "bg-green-100 text-green-700" :
                          tx.type === "redeemed" ? "bg-red-100 text-red-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{tx.reason}</td>
                      <td className="px-4 py-3 text-gray-500">{tx.user}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        tx.points > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {isAdmin && (
          <div className="bg-[var(--background)] rounded-xl border border-[var(--color-border)] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-[var(--color-foreground)]">
              <Award className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Top Earners</h2>
            </div>
            
            {leaderboard.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">
                No earners yet.
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-gray-200 text-gray-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-blue-50 text-blue-600"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="text-sm font-medium text-[var(--color-foreground)]">
                        {user.name}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-700">
                      {user.points.toLocaleString()} <span className="text-xs font-normal text-gray-400">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]">Points Settings</h3>
            <form onSubmit={handleUpdateSettings}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points per $1 Discount
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={pointsPerDollar}
                  onChange={(e) => setPointsPerDollar(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 rounded-lg px-3 py-2 text-[var(--color-foreground)]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How many points does a customer need to get $1 off their next renewal? (Default: 100)
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRedeem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-foreground)] flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-600" />
              Redeem Discount
            </h3>
            <form onSubmit={handleRedeem}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points to Redeem
                </label>
                <input
                  type="number"
                  min="1"
                  max={summary?.availablePoints}
                  required
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 rounded-lg px-3 py-2 text-[var(--color-foreground)]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max available: {summary?.availablePoints.toLocaleString()} points 
                  (${(summary?.availablePoints / summary?.pointsPerDollar).toLocaleString(undefined, {minimumFractionDigits: 2})})
                </p>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowRedeem(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700">Redeem</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--background)] rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-[var(--color-foreground)]">Adjust Points</h3>
            <form onSubmit={handleAdjust}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points (use negative to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 rounded-lg px-3 py-2 text-[var(--color-foreground)]"
                  placeholder="e.g. 50 or -50"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-transparent border border-gray-300 rounded-lg px-3 py-2 text-[var(--color-foreground)]"
                  placeholder="e.g. Manual correction"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowAdjust(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800">Adjust</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
