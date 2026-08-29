import { Globe, Hash, Mail, MessageSquare, Phone } from "lucide-react";
import { CHURN_CFG, SEV_CFG, S_CFG } from "../../data/workspaceData.js";
import { slaColor, slaText, slaWidth } from "../../utils/workspaceUtils.js";

export function channelIcon(channel) {
  const props = { size: 12 };
  switch (channel) {
    case "email":
      return <Mail {...props} />;
    case "chat":
      return <MessageSquare {...props} />;
    case "phone":
      return <Phone {...props} />;
    case "web":
      return <Globe {...props} />;
    default:
      return null;
  }
}

export function Av({ initials, hue = 252, size = "sm", ring = false }) {
  const sz = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-[13px]",
    lg: "w-11 h-11 text-sm",
  }[size];

  return (
    <div
      className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-semibold select-none ${ring ? "ring-2 ring-white ring-offset-1" : ""}`}
      style={{
        background: `hsl(${hue},55%,85%)`,
        color: `hsl(${hue},55%,32%)`,
      }}
    >
      {initials}
    </div>
  );
}

export function StatusBadge({ status }) {
  const c = S_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function SevBadge({ sev }) {
  const c = SEV_CFG[sev];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.color}`}
    >
      {c.label}
    </span>
  );
}

export function Tag({ label }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F0F0FF] text-[#8080B0]">
      <Hash size={9} /> {label}
    </span>
  );
}

export function SLABar({ mins, total, breached }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1 rounded-full bg-[rgba(128,128,180,0.12)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${breached ? "bg-[#CC1836]" : slaColor(mins, total)}`}
          style={{ width: breached ? "100%" : slaWidth(mins, total) }}
        />
      </div>
      <span
        className={`text-[11px] font-medium tabular-nums ${breached ? "text-[#CC1836] font-bold" : "text-[#A8A8C0]"}`}
      >
        {breached ? "BREACH" : slaText(mins, total)}
      </span>
    </div>
  );
}

export { CHURN_CFG };
