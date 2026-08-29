import React, { useState, useEffect, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  Users,
  BarChart3,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

// ─── Palette ──────────────────────────────────────────────────
const COLORS = {
  primary: "#4F6BFF",
  green: "#34C759",
  orange: "#FF9500",
  red: "#FF3B30",
  purple: "#AF52DE",
  blue: "#007AFF",
  teal: "#5AC8FA",
  yellow: "#FFCC00",
};

const SEVERITY_COLORS = {
  critical: "#FF3B30",
  high: "#FF9500",
  medium: "#FFCC00",
  low: "#34C759",
};

const STATUS_STYLES = {
  open: { bg: "#E8F5E9", color: "#2E7D32", label: "Open" },
  "in-progress": { bg: "#FFF3E0", color: "#EF6C00", label: "In Progress" },
  escalated: { bg: "#FFEBEE", color: "#C62828", label: "Escalated" },
  resolved: { bg: "#E3F2FD", color: "#1565C0", label: "Resolved" },
};

const CHANNEL_COLORS = {
  email: COLORS.blue,
  chat: COLORS.green,
  phone: COLORS.orange,
  web: COLORS.purple,
};

// ─── Helpers ──────────────────────────────────────────────────
function formatMinutes(totalMins) {
  if (!totalMins) return "0m";
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

// ─── Star Rating Component ───────────────────────────────────
function StarRating({ rating, size = 14 }) {
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= rating ? "#FFCC00" : "none"}
          stroke={s <= rating ? "#FFCC00" : "#D1D5DB"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ title, value, subtitle, trend, trendLabel, trendColor, icon: Icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div className="kpi-icon-wrap">
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="kpi-value" style={{ color: trendColor || "#1a1a2e" }}>
        {value}
      </div>
      <div className="kpi-footer">
        <span className="kpi-subtitle">{subtitle}</span>
        {trend && (
          <span
            className="kpi-trend"
            style={{ color: trendColor || "#34C759" }}
          >
            {trend > 0 ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            <span>{trendLabel}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function SupportFeedbackPage() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview"); // overview | feedback | agents
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get("/feedback/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="sf-loading">
        <RefreshCw size={24} className="sf-spinner" />
        <span>Loading Support Operations…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="sf-loading">
        <span>Failed to load dashboard data.</span>
        <button onClick={fetchDashboard} className="sf-retry-btn">
          Retry
        </button>
      </div>
    );
  }

  const {
    csat,
    agentScores,
    feedbackOverTime,
    recentFeedback,
    ticketCounts,
    recentTickets,
    bySeverity,
    ticketsByDay,
    avgResponseMinutes,
  } = data;

  const totalOpen =
    (ticketCounts.open || 0) +
    (ticketCounts["in-progress"] || 0) +
    (ticketCounts.escalated || 0);

  // Filtered tickets
  const filteredTickets = (recentTickets || []).filter((t) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !t.ticketNumber?.toLowerCase().includes(q) &&
        !t.subject?.toLowerCase().includes(q)
      )
        return false;
    }
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.severity !== priorityFilter) return false;
    return true;
  });

  const ticketsPerPage = 5;
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const currentTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  // Category chart data (from bySeverity, rename for the reference UI)
  const categoryLabels = {
    critical: "Critical Issue",
    high: "High Priority",
    medium: "General Request",
    low: "Low Priority",
  };
  const categoryData = (bySeverity || []).map((s) => ({
    name: categoryLabels[s.severity] || s.severity,
    count: s.count,
    fill: SEVERITY_COLORS[s.severity] || COLORS.blue,
  }));

  return (
    <div className="sf-page">
      <style>{`
        /* ── Support Feedback Page Scoped Styles ── */
        .sf-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f4f6fa;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* ── Top Bar ── */
        .sf-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #fff;
          border-bottom: 1px solid #e8ecf1;
          flex-shrink: 0;
          gap: 12px;
          flex-wrap: wrap;
        }
        .sf-topbar-title {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a2e;
          white-space: nowrap;
        }
        .sf-topbar-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sf-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sf-search-wrap svg {
          position: absolute;
          left: 10px;
          color: #9ca3af;
        }
        .sf-search {
          padding: 8px 12px 8px 34px;
          border: 1px solid #e0e4ea;
          border-radius: 8px;
          font-size: 13px;
          width: 220px;
          background: #f9fafb;
          outline: none;
          transition: border-color 0.2s;
        }
        .sf-search:focus {
          border-color: #4F6BFF;
          background: #fff;
        }
        .sf-filter-select {
          padding: 8px 28px 8px 12px;
          border: 1px solid #e0e4ea;
          border-radius: 8px;
          font-size: 13px;
          background: #f9fafb;
          outline: none;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          transition: border-color 0.2s;
        }
        .sf-filter-select:focus {
          border-color: #4F6BFF;
        }
        .sf-btn-apply {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          background: #4F6BFF;
          color: #fff;
        }
        .sf-btn-apply:hover {
          background: #3b56e0;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 107, 255, 0.25);
        }
        .sf-btn-export {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #e0e4ea;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sf-btn-export:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        /* ── Tab Switcher ── */
        .sf-tabs {
          display: flex;
          gap: 0;
          padding: 0 24px;
          background: #fff;
          border-bottom: 1px solid #e8ecf1;
          flex-shrink: 0;
        }
        .sf-tab {
          padding: 12px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: #6b7280;
          border-bottom: 2px solid transparent;
          transition: all 0.2s;
        }
        .sf-tab:hover {
          color: #4F6BFF;
        }
        .sf-tab.active {
          color: #4F6BFF;
          border-bottom-color: #4F6BFF;
        }

        /* ── Content Area ── */
        .sf-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px 32px;
        }

        /* ── KPI Cards ── */
        .sf-kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .kpi-card {
          background: #fff;
          border-radius: 14px;
          padding: 20px 22px;
          border: 1px solid #e8ecf1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .kpi-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.07);
          transform: translateY(-2px);
        }
        .kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .kpi-title {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .kpi-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef1ff;
          color: #4F6BFF;
        }
        .kpi-value {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 6px;
        }
        .kpi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .kpi-subtitle {
          font-size: 12px;
          color: #9ca3af;
        }
        .kpi-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ── Chart Panels ── */
        .sf-chart-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .sf-chart-row { grid-template-columns: 1fr; }
        }
        .sf-panel {
          background: #fff;
          border-radius: 14px;
          padding: 20px 22px;
          border: 1px solid #e8ecf1;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .sf-panel-title {
          font-size: 15px;
          font-weight: 700;
          color: #1a1a2e;
          margin-bottom: 16px;
        }

        /* ── Ticket Queue Table ── */
        .sf-table-wrap {
          overflow-x: auto;
        }
        .sf-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .sf-table th {
          text-align: left;
          padding: 10px 14px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e8ecf1;
        }
        .sf-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
        }
        .sf-table tbody tr {
          transition: background 0.15s;
        }
        .sf-table tbody tr:hover {
          background: #f9fafb;
        }

        /* ── Badges ── */
        .sf-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        /* ── Feedback Card ── */
        .sf-feedback-card {
          padding: 14px 0;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .sf-feedback-card:last-child {
          border-bottom: none;
        }
        .sf-feedback-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4F6BFF 0%, #7C8FFF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }
        .sf-feedback-body {
          flex: 1;
          min-width: 0;
        }
        .sf-feedback-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .sf-feedback-name {
          font-weight: 700;
          font-size: 13px;
          color: #1a1a2e;
        }
        .sf-feedback-ticket {
          font-size: 11px;
          color: #9ca3af;
          background: #f3f4f6;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .sf-feedback-time {
          font-size: 11px;
          color: #9ca3af;
          margin-left: auto;
        }
        .sf-feedback-comment {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        /* ── Agent Score Table ── */
        .sf-agent-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .sf-agent-row:last-child {
          border-bottom: none;
        }
        .sf-agent-rank {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          background: #eef1ff;
          color: #4F6BFF;
          flex-shrink: 0;
        }
        .sf-agent-name {
          font-weight: 600;
          font-size: 14px;
          color: #1a1a2e;
          flex: 1;
        }
        .sf-agent-rating {
          font-weight: 800;
          font-size: 16px;
          color: #1a1a2e;
          min-width: 40px;
          text-align: right;
        }
        .sf-agent-reviews {
          font-size: 11px;
          color: #9ca3af;
          min-width: 60px;
          text-align: right;
        }

        /* ── Loading / Empty ── */
        .sf-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 10px;
          font-size: 14px;
          color: #6b7280;
        }
        .sf-spinner {
          animation: sf-spin 1s linear infinite;
        }
        @keyframes sf-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sf-retry-btn {
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          background: #4F6BFF;
          color: #fff;
          border: none;
          cursor: pointer;
        }
        .sf-empty {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
          font-size: 14px;
        }

        /* ── Rating Distribution Bar ── */
        .sf-dist-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .sf-dist-label {
          width: 16px;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-align: right;
        }
        .sf-dist-bar-bg {
          flex: 1;
          height: 8px;
          border-radius: 4px;
          background: #f3f4f6;
          overflow: hidden;
        }
        .sf-dist-bar-fill {
          height: 100%;
          border-radius: 4px;
          background: linear-gradient(90deg, #FFCC00, #FFB800);
          transition: width 0.5s ease-out;
        }
        .sf-dist-count {
          width: 30px;
          font-size: 12px;
          color: #9ca3af;
          text-align: right;
        }

        /* ── Custom Tooltip ── */
        .sf-tooltip {
          background: #1a1a2e;
          border-radius: 8px;
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .sf-tooltip-label {
          font-size: 11px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .sf-tooltip-value {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
        }
      `}</style>

      {/* ─── Top Bar ─────────────────────────────────── */}
      <div className="sf-topbar">
        <h1 className="sf-topbar-title">Support Operations</h1>
        <div className="sf-topbar-controls">
          <div className="sf-search-wrap">
            <Search size={14} />
            <input
              className="sf-search"
              type="text"
              placeholder="Search tickets…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="sf-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="sf-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
          <button className="sf-btn-apply" onClick={fetchDashboard}>
            <RefreshCw size={13} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Refresh
          </button>
          <button className="sf-btn-export" title="Export (coming soon)">
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────── */}
      <div className="sf-tabs">
        {[
          { key: "overview", label: "Overview" },
          { key: "feedback", label: "Feedback" },
          { key: "agents", label: "Team Performance" },
        ].map((t) => (
          <button
            key={t.key}
            className={`sf-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Content ──────────────────────────────────── */}
      <div className="sf-content">
        {/* ══════════ OVERVIEW TAB ══════════ */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="sf-kpi-row">
              <KpiCard
                title="Open Tickets"
                value={totalOpen}
                subtitle="Current Queue"
                trend={1}
                trendLabel={`${ticketCounts.escalated || 0} escalated`}
                trendColor={ticketCounts.escalated > 0 ? COLORS.red : COLORS.green}
                icon={MessageSquare}
              />
              <KpiCard
                title="Avg Response Time"
                value={formatMinutes(avgResponseMinutes)}
                subtitle="Resolution time"
                trend={avgResponseMinutes > 0 ? -1 : 0}
                trendLabel="avg to resolve"
                trendColor={COLORS.orange}
                icon={Clock}
              />
              <KpiCard
                title="CSAT"
                value={
                  csat.totalReviews > 0
                    ? `${csat.avgRating}/5`
                    : "—"
                }
                subtitle="Customer Satisfaction"
                trend={csat.avgRating >= 4 ? 1 : -1}
                trendLabel={`${csat.totalReviews} reviews`}
                trendColor={csat.avgRating >= 4 ? COLORS.green : COLORS.orange}
                icon={Star}
              />
              <KpiCard
                title="Total Resolved"
                value={ticketCounts.resolved || 0}
                subtitle="All time"
                trend={1}
                trendLabel="resolved tickets"
                trendColor={COLORS.green}
                icon={BarChart3}
              />
            </div>

            {/* Charts Row */}
            <div className="sf-chart-row">
              {/* Tickets Over Time */}
              <div className="sf-panel">
                <div className="sf-panel-title">Tickets Over Time</div>
                {ticketsByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={ticketsByDay.map((d) => ({
                        ...d,
                        label: formatDay(d.date),
                      }))}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a2e",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 12,
                        }}
                        labelStyle={{ color: "#9ca3af" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      <Bar dataKey="email" stackId="a" fill={CHANNEL_COLORS.email} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="chat" stackId="a" fill={CHANNEL_COLORS.chat} />
                      <Bar dataKey="phone" stackId="a" fill={CHANNEL_COLORS.phone} />
                      <Bar dataKey="web" stackId="a" fill={CHANNEL_COLORS.web} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="sf-empty">No ticket data for the last 7 days.</div>
                )}
              </div>

              {/* Tickets by Category */}
              <div className="sf-panel">
                <div className="sf-panel-title">Tickets by Category</div>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a2e",
                          border: "none",
                          borderRadius: 8,
                          color: "#fff",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                        {categoryData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="sf-empty">No ticket data yet.</div>
                )}
              </div>
            </div>

            {/* Ticket Queue */}
            <div className="sf-panel">
              <div className="sf-panel-title">Ticket Queue</div>
              <div className="sf-table-wrap">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Ticket</th>
                      <th style={{ textAlign: "left" }}>Subject</th>
                      <th style={{ textAlign: "center" }}>Priority</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                      <th style={{ textAlign: "left" }}>Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "#9ca3af", padding: 30 }}>
                          No tickets match your filters.
                        </td>
                      </tr>
                    ) : (
                      currentTickets.map((t) => {
                        const sev = SEVERITY_COLORS[t.severity] || COLORS.blue;
                        const st = STATUS_STYLES[t.status] || STATUS_STYLES.open;
                        return (
                          <tr key={t.ticketNumber || t._id}>
                            <td style={{ fontWeight: 600, color: "#4F6BFF", textAlign: "left" }}>
                              {t.ticketNumber}
                            </td>
                            <td style={{ textAlign: "left" }}>{t.subject || "—"}</td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className="sf-badge"
                                style={{ background: sev + "18", color: sev }}
                              >
                                {t.severity}
                              </span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className="sf-badge"
                                style={{ background: st.bg, color: st.color }}
                              >
                                {st.label}
                              </span>
                            </td>
                            <td style={{ textAlign: "left" }}>{t.assignee || "Unassigned"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: "1px solid #e8ecf1" }}>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    Showing {(currentPage - 1) * ticketsPerPage + 1} to {Math.min(currentPage * ticketsPerPage, filteredTickets.length)} of {filteredTickets.length} tickets
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: "6px 12px", border: "1px solid #e0e4ea", borderRadius: 6, background: currentPage === 1 ? "#f9fafb" : "#fff", color: currentPage === 1 ? "#9ca3af" : "#374151", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: "6px 12px", border: "1px solid #e0e4ea", borderRadius: 6, background: currentPage === totalPages ? "#f9fafb" : "#fff", color: currentPage === totalPages ? "#9ca3af" : "#374151", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ FEEDBACK TAB ══════════ */}
        {activeTab === "feedback" && (
          <>
            {/* CSAT Summary + Distribution */}
            <div className="sf-chart-row">
              <div className="sf-panel" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
                  Overall CSAT Score
                </div>
                <div style={{ fontSize: 52, fontWeight: 800, color: csat.avgRating >= 4 ? COLORS.green : csat.avgRating >= 3 ? COLORS.orange : COLORS.red }}>
                  {csat.totalReviews > 0 ? csat.avgRating : "—"}
                </div>
                <StarRating rating={Math.round(csat.avgRating)} size={22} />
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8 }}>
                  Based on {csat.totalReviews} review{csat.totalReviews !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="sf-panel">
                <div className="sf-panel-title">Rating Distribution</div>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = csat.distribution?.[star] || 0;
                  const max = csat.totalReviews || 1;
                  const pct = (count / max) * 100;
                  return (
                    <div className="sf-dist-row" key={star}>
                      <span className="sf-dist-label">{star}★</span>
                      <div className="sf-dist-bar-bg">
                        <div
                          className="sf-dist-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="sf-dist-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Feedback Over Time */}
            {feedbackOverTime.length > 0 && (
              <div className="sf-panel" style={{ marginBottom: 20 }}>
                <div className="sf-panel-title">Feedback Volume (Last 30 Days)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={feedbackOverTime} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(d) => formatDate(d)} />
                    <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={18} name="Reviews" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent Feedback */}
            <div className="sf-panel">
              <div className="sf-panel-title">Recent Feedback</div>
              {recentFeedback.length === 0 ? (
                <div className="sf-empty">No feedback received yet.</div>
              ) : (
                recentFeedback.map((f) => (
                  <div className="sf-feedback-card" key={f.id}>
                    <div className="sf-feedback-avatar">
                      {(f.customerName || "C").charAt(0).toUpperCase()}
                    </div>
                    <div className="sf-feedback-body">
                      <div className="sf-feedback-meta">
                        <span className="sf-feedback-name">{f.customerName}</span>
                        <StarRating rating={f.rating} size={12} />
                        <span className="sf-feedback-ticket">{f.ticketNumber}</span>
                        <span className="sf-feedback-time">
                          {formatDate(f.createdAt)}
                        </span>
                      </div>
                      {f.comment && (
                        <div className="sf-feedback-comment">{f.comment}</div>
                      )}
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                        Agent: {f.agentName}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ══════════ AGENTS TAB ══════════ */}
        {activeTab === "agents" && (
          <>
            <div className="sf-panel">
              <div className="sf-panel-title">
                <Users size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
                Team Satisfaction Scores
              </div>
              {agentScores.length === 0 ? (
                <div className="sf-empty">
                  No feedback data for team members yet.
                </div>
              ) : (
                agentScores.map((a, i) => (
                  <div className="sf-agent-row" key={a.agentId}>
                    <div className="sf-agent-rank">{i + 1}</div>
                    <div className="sf-agent-name">{a.name}</div>
                    <StarRating rating={Math.round(a.avgRating)} size={13} />
                    <div className="sf-agent-rating">{a.avgRating}</div>
                    <div className="sf-agent-reviews">
                      {a.totalReviews} review{a.totalReviews !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
