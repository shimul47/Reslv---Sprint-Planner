import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  BarChart2,
  CheckCircle2,
  Clock,
  Flame,
  Inbox,
  TimerReset,
  TrendingUp,
  InboxIcon,
} from "lucide-react";
import api from "../../api/axios.js";

const RANGE_OPTIONS = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "all", label: "All time" },
];

const STATUS_COLORS = {
  open: "#80A8FF",
  "in-progress": "#8EC1DE",
  escalated: "#F5A023",
  resolved: "#3DB870",
};

const SEVERITY_COLORS = {
  low: "#AAAAC0",
  medium: "#2479B5",
  high: "#BB5E18",
  critical: "#CC1836",
};

const STATUS_LABELS = {
  open: "Open",
  "in-progress": "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
};

const CATEGORICAL = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];

const INK_PRIMARY = "#18182E";
const INK_MUTED = "#9898B8";
const GRID = "rgba(128,128,200,0.12)";

function formatMinutes(mins) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

// Custom responsive Tooltip Component for crisp UI across all screens
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[rgba(128,128,200,0.16)] rounded-xl p-3 shadow-lg max-w-[200px] text-xs">
        {label && (
          <p className="font-semibold text-[#18182E] mb-1.5 border-b border-gray-100 pb-1">
            {label}
          </p>
        )}
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center gap-2 my-0.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-[#9898B8] truncate">{entry.name}:</span>
            <span className="font-semibold text-[#18182E] ml-auto">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function ChartCard({ title, subtitle, children, height = 260 }) {
  return (
    <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      <div className="mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-[13px] font-semibold text-[#18182E]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] sm:text-[11px] text-[#9898B8] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, tint }) {
  return (
    <div className="bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] shadow-sm p-3.5 sm:p-4 flex items-center gap-3 transition-all hover:shadow-md">
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: tint.bg, color: tint.text }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-base sm:text-[19px] font-bold text-[#18182E] leading-tight truncate">
          {value}
        </p>
        <p className="text-[10px] sm:text-[11px] text-[#9898B8] truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-[12px] text-[#C0C0D8] gap-1.5">
      <InboxIcon size={24} className="opacity-40" />
      <span>No data for this range</span>
    </div>
  );
}

export function ReportsView() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get(`/tickets/reports/summary?range=${range}`)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load reports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Adjust Top Agent chart container height dynamically based on dataset
  const agentChartHeight = useMemo(() => {
    if (!data?.byAgent?.length) return 180;
    return Math.max(180, data.byAgent.length * 44);
  }, [data]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 bg-[#F7F7FF]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-base sm:text-[18px] font-semibold text-[#18182E]">
            Reports
          </h1>
          <p className="text-xs sm:text-[13px] text-[#9898B8] mt-0.5 sm:mt-1">
            Ticket volume, resolution performance, and team workload.
          </p>
        </div>

        {/* Range Selector Bar - Scrollable on very small screens */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-[rgba(128,128,200,0.14)] p-1 self-start sm:self-auto overflow-x-auto max-w-full">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-[12px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                range === r.id
                  ? "bg-[#EEF0FF] text-[#5B5BD6]"
                  : "text-[#A8A8C0] hover:text-[#6B6B90]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-3 animate-pulse">
            <BarChart2 size={20} className="text-[#D3D3FF]" />
          </div>
          <p className="text-[13px] text-[#9898B8]">Loading reports…</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-[13px] font-semibold text-[#CC1836]">{error}</p>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Stat Cards - Fully Responsive Grid Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
            <StatTile
              icon={<Inbox size={17} />}
              label="Total tickets"
              value={data.totals.total}
              tint={{ bg: "#EEF0FF", text: "#5B5BD6" }}
            />
            <StatTile
              icon={<TrendingUp size={17} />}
              label="Open"
              value={data.totals.open}
              tint={{ bg: "#EEF0FF", text: "#5B5BD6" }}
            />
            <StatTile
              icon={<Clock size={17} />}
              label="In progress"
              value={data.totals.inProgress}
              tint={{ bg: "#E7F4FD", text: "#2479B5" }}
            />
            <StatTile
              icon={<Flame size={17} />}
              label="Escalated"
              value={data.totals.escalated}
              tint={{ bg: "#FFF2E5", text: "#BB5E18" }}
            />
            <StatTile
              icon={<CheckCircle2 size={17} />}
              label="Resolved"
              value={data.totals.resolved}
              tint={{ bg: "#EDFAF2", text: "#228050" }}
            />
            <StatTile
              icon={<TimerReset size={17} />}
              label="Avg. resolution"
              value={formatMinutes(data.avgResolutionMinutes)}
              tint={{ bg: "#F4F0FF", text: "#7A4FE0" }}
            />
            <StatTile
              icon={<Flame size={17} />}
              label="SLA breaches"
              value={data.slaBreaches}
              tint={{ bg: "#FFEEF1", text: "#CC1836" }}
            />
          </div>

          {/* Bar Charts Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Severity Breakdown */}
            <ChartCard title="Severity breakdown" height={220}>
              {data.bySeverity.length === 0 ? (
                <EmptyChart />
              ) : (
                <BarChart
                  data={data.bySeverity}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="severity"
                    tick={{ fontSize: 10, fill: INK_MUTED }}
                    axisLine={{ stroke: GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: INK_MUTED }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                    {data.bySeverity.map((entry) => (
                      <Cell
                        key={entry.severity}
                        fill={SEVERITY_COLORS[entry.severity] || "#C0C0D8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartCard>

            {/* Channel Breakdown */}
            <ChartCard title="Channel breakdown" height={220}>
              {data.byChannel.length === 0 ? (
                <EmptyChart />
              ) : (
                <BarChart
                  data={data.byChannel}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis
                    dataKey="channel"
                    tick={{ fontSize: 10, fill: INK_MUTED }}
                    axisLine={{ stroke: GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: INK_MUTED }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                    {data.byChannel.map((entry, i) => (
                      <Cell
                        key={entry.channel}
                        fill={CATEGORICAL[i % CATEGORICAL.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartCard>
          </div>

          {/* Horizontal Bar Chart - Top Agents */}
          <ChartCard
            title="Top agents"
            subtitle="Tickets handled (assigned or unassigned pool)"
            height={agentChartHeight}
          >
            {data.byAgent.length === 0 ? (
              <EmptyChart />
            ) : (
              <BarChart
                data={data.byAgent}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid stroke={GRID} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: INK_MUTED }}
                  axisLine={{ stroke: GRID }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="agent"
                  tick={{ fontSize: 11, fill: INK_PRIMARY }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Tickets"
                  fill="#80A8FF"
                  radius={[0, 6, 6, 0]}
                  barSize={18}
                />
              </BarChart>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
}
