export function slaColor(mins, total) {
  if (mins === 0) return "bg-[#CC1836]";
  const pct = mins / total;
  if (pct < 0.2) return "bg-[#F5A023]";
  if (pct < 0.5) return "bg-[#8EC1DE]";
  return "bg-[#3DB870]";
}

export function slaWidth(mins, total) {
  if (mins === 0) return "0%";
  return `${Math.min(100, (mins / total) * 100)}%`;
}

export function slaText(mins, total) {
  if (mins === 0 || total === 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
