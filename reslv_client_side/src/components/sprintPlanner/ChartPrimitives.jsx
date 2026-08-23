// Shared chart chrome for the Sprint Planner's analytics views. The palette
// below is the same CATEGORICAL set already used (and dataviz-validated) in
// components/workspace/Reports.jsx — reused rather than inventing a second
// one, so charts read as one system across the app.
export const CHART_COLORS = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];
export const CHART_IDEAL_COLOR = "#9898b8";
export const CHART_GRID = "rgba(128,128,200,0.12)";

// Fixed status colors — same everywhere, light or dark, never reused for a
// regular data series. Green = good/gained, red = critical/lost.
export const STATUS_GOOD = "#0ca30c";
export const STATUS_CRITICAL = "#d03b3b";

export function ChartCard({ title, subtitle, action, children, height = 260 }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] p-4 sm:p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <h3 className="text-xs sm:text-[13px] font-semibold text-[var(--text-h)]">{title}</h3>
          {subtitle && <p className="text-[10px] sm:text-[11px] text-[var(--text)] opacity-70 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="w-full relative" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 shadow-lg max-w-[220px] text-xs">
      {label && (
        <p className="font-semibold text-[var(--text-h)] mb-1.5 border-b border-[var(--color-border)] pb-1">
          {label}
        </p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 my-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-[var(--text)] opacity-70 truncate">{entry.name}:</span>
          <span className="font-semibold text-[var(--text-h)] ml-auto">
            {typeof entry.value === "number" ? Math.round(entry.value * 10) / 10 : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatTile({ label, value, hint }) {
  return (
    <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow)] p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text)] opacity-70 mb-1.5">
        {label}
      </p>
      <p className="text-2xl font-bold text-[var(--text-h)]">{value}</p>
      {hint && <p className="text-[10px] text-[var(--text)] opacity-60 mt-1">{hint}</p>}
    </div>
  );
}
