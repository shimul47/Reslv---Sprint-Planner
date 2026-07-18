import { BarChart2, Settings } from "lucide-react";

export function ReportsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
      <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
        <BarChart2 size={26} className="text-[#CEB5FF]" />
      </div>
      <p className="text-[14px] font-semibold text-[#18182E]">Reports</p>
      <p className="text-[13px] text-[#9898B8] mt-1 max-w-[240px] leading-relaxed">
        This page is routed and ready — the reports dashboard itself hasn't been built yet.
      </p>
    </div>
  );
}

export function SettingsView() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
      <div className="w-16 h-16 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-4">
        <Settings size={26} className="text-[#CEB5FF]" />
      </div>
      <p className="text-[14px] font-semibold text-[#18182E]">Settings</p>
      <p className="text-[13px] text-[#9898B8] mt-1 max-w-[240px] leading-relaxed">
        This page is routed and ready — the settings screen itself hasn't been built yet.
      </p>
    </div>
  );
}
