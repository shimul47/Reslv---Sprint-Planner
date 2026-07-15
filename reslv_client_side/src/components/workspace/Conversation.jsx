import { CheckCircle, Shield } from "lucide-react";
import { ESC_STEPS } from "../../data/workspaceData.js";
import { Av } from "./Atoms.jsx";

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
      <div className="max-w-[66%] flex flex-col">
        {isAgent && (
          <p className="text-[11px] text-[#B0B0CC] text-right mb-1.5">
            {msg.agent}
          </p>
        )}
        <div
          className={`px-4 py-2.5 text-[13px] leading-relaxed ${isAgent ? "bg-gradient-to-br from-[#80A8FF] to-[#7498EE] text-white rounded-2xl rounded-tr-sm shadow-[0_2px_12px_rgba(128,168,255,0.28)]" : "bg-white text-[#18182E] rounded-2xl rounded-tl-sm border border-[rgba(128,128,200,0.14)] shadow-sm"}`}
        >
          {msg.text}
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

export function TypingIndicator({ name }) {
  return (
    <div className="flex gap-3 mb-5">
      <div className="w-8 h-8 rounded-full bg-[#D3D3FF] flex items-center justify-center text-[#5050A0] text-[11px] font-bold flex-shrink-0">
        {name[0]}
      </div>
      <div className="bg-white border border-[rgba(128,128,200,0.14)] shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#CEB5FF] animate-bounce"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: "0.9s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function EscalationStepper({ step }) {
  const barPct = step === 0 ? 0 : (step / (ESC_STEPS.length - 1)) * 88;
  return (
    <div className="relative flex items-start pt-2">
      <div className="absolute top-6 left-[6%] right-[6%] h-[2px] bg-[rgba(128,128,200,0.12)] rounded-full" />
      <div
        className="absolute top-6 left-[6%] h-[2px] bg-[#80A8FF] rounded-full transition-all duration-700"
        style={{ width: `${barPct}%` }}
      />
      {ESC_STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center relative z-10"
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-[#80A8FF] text-white shadow-sm" : active ? "bg-white border-2 border-[#CEB5FF] text-[#5B5BD6] shadow-[0_0_0_5px_rgba(206,181,255,0.18)]" : "bg-[#F0F0FF] border border-[rgba(128,128,200,0.18)] text-[#C0C0D8]"}`}
            >
              {done ? <CheckCircle size={15} /> : i + 1}
            </div>
            <p
              className={`text-[11px] font-bold mt-2 text-center ${done || active ? "text-[#18182E]" : "text-[#C0C0D8]"}`}
            >
              {s.role}
            </p>
            <p
              className={`text-[11px] mt-0.5 text-center ${active ? "text-[#5B5BD6]" : done ? "text-[#6B6B90]" : "text-[#D0D0E0]"}`}
            >
              {s.name}
            </p>
            <p className="text-[10px] text-[#D0D0E0] mt-0.5">{s.time}</p>
            <span
              className={`mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${done ? "bg-[#EDFAF2] text-[#228050]" : active ? "bg-[#FFF2E5] text-[#BB5E18]" : "bg-[#F4F4FF] text-[#C0C0D8]"}`}
            >
              {done ? "Done" : active ? "Active" : "Pending"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
