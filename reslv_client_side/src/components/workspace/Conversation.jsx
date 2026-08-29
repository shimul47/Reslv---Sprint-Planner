import { CheckCircle, Shield, Users } from "lucide-react";
import { Av } from "./Atoms.jsx";
import { renderMessageText } from "../../utils/chatFormatting.jsx";

export function Bubble({ msg, cx }) {
  if (msg.from === "internal") {
    return (
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(245,160,35,0.18)]" />
        <div className="flex items-center gap-1.5 bg-[#FFFBF2] text-[#A06618] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[rgba(245,160,35,0.2)] flex-shrink-0 max-w-[70%] text-center">
          <Shield size={10} className="flex-shrink-0" />
          <span className="leading-relaxed">{msg.text}</span>
        </div>
        <div className="flex-1 h-px bg-[rgba(245,160,35,0.18)]" />
      </div>
    );
  }

  // A visible status line (e.g. a chatbot handoff) — an event announcement
  // for both parties, not a private staff note like "internal" above.
  if (msg.from === "system") {
    return (
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(128,168,255,0.18)]" />
        <div className="flex items-center gap-1.5 bg-[#EFF4FF] text-[#3B5BA6] text-[11px] font-medium px-3 py-1.5 rounded-full border border-[rgba(128,168,255,0.25)] flex-shrink-0 max-w-[70%] text-center">
          <Users size={10} className="flex-shrink-0" />
          <span className="leading-relaxed">{msg.text}</span>
        </div>
        <div className="flex-1 h-px bg-[rgba(128,168,255,0.18)]" />
      </div>
    );
  }

  const isAgent = msg.from === "agent";
  return (
    <div
      className={`flex gap-3 mb-5 ${isAgent ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isAgent && <Av initials={cx.initials} hue={cx.hue} size="sm" />}
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#80A8FF] to-[#CEB5FF] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-auto">
          {(msg.agent || "AK")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)}
        </div>
      )}
      <div className="max-w-[78%] flex flex-col">
        {isAgent && (
          <p className="text-[11px] text-[#B0B0CC] text-right mb-1.5">
            {msg.agent}
          </p>
        )}
        <div
          className={`px-5 py-3 text-[14px] leading-relaxed ${isAgent ? "bg-gradient-to-br from-[#80A8FF] to-[#7498EE] text-white rounded-2xl rounded-tr-sm shadow-[0_2px_12px_rgba(128,168,255,0.28)]" : "bg-white text-[#18182E] rounded-2xl rounded-tl-sm border border-[rgba(128,128,200,0.14)] shadow-sm"}`}
        >
          {renderMessageText(msg.text)}
        </div>
        <div
          className={`flex items-center gap-1.5 mt-1 ${isAgent ? "flex-row-reverse" : ""}`}
        >
          {msg.time && <p className="text-[11px] text-[#C0C0D8]">{msg.time}</p>}
          {isAgent && msg.read && (
            <CheckCircle size={10} className="text-[#80A8FF]" />
          )}
        </div>
      </div>
    </div>
  );
}
