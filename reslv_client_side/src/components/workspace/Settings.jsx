import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import api from "../../api/axios.js";
import { AuthContext } from "../../context/AuthContext.jsx";

const SEVERITIES = [
  { id: "critical", label: "Critical" },
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

function minutesHint(mins) {
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 60) return `${n} min`;
  const h = n / 60;
  return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
}

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl border border-[rgba(128,128,200,0.2)] bg-[#F8F8FF] text-[13px] text-[#18182E] placeholder-[#C8C8E0] focus:outline-none focus:border-[#80A8FF] focus:bg-white focus:ring-2 focus:ring-[rgba(128,168,255,0.12)] transition-all";
const labelCls =
  "block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5";
const cardCls =
  "bg-white rounded-2xl border border-[rgba(128,128,200,0.12)] shadow-sm p-6";

function Toggle({ checked, onChange, disabled, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative flex h-6 w-10 flex-shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
        checked ? "bg-[#80A8FF]" : "bg-[rgba(128,128,200,0.25)]"
      } ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function SettingsView() {
  const navigate = useNavigate();
  const { user, plan } = useContext(AuthContext);
  const isSuperAdmin = user?.roles?.includes("superadmin");
  const canEditSettings =
    isSuperAdmin || Boolean(plan?.features?.customSlaSettings);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/tickets/settings")
      .then((res) => setSettings(res.data?.settings))
      .catch(() => setError("Unable to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const setSlaTarget = (severity, value) => {
    setSuccess("");
    setSettings((prev) => ({
      ...prev,
      slaTargets: { ...prev.slaTargets, [severity]: value },
    }));
  };

  const setField = (key, value) => {
    setSuccess("");
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch("/tickets/settings", settings);
      setSettings(res.data?.settings);
      setSuccess("Settings saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
        <div className="w-12 h-12 rounded-2xl bg-[#EEF0FF] flex items-center justify-center mb-3 animate-pulse">
          <SettingsIcon size={20} className="text-[#D3D3FF]" />
        </div>
        <p className="text-[13px] text-[#9898B8]">Loading settings…</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center bg-[#F7F7FF]">
        <p className="text-[13px] font-semibold text-[#CC1836]">
          {error || "Unable to load settings."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7FF]">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="text-[18px] font-semibold text-[#18182E]">Settings</h1>
          <p className="text-[13px] text-[#9898B8] mt-1">
            Configure SLA targets, assignment behavior, and what customers see.
          </p>
        </div>

        {!canEditSettings && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#EEF0FF] text-[#5B5BD6] text-[12px] font-medium flex items-center justify-between gap-3 flex-wrap">
            <span>
              Editing SLA targets and support-hours settings requires the
              Enterprise plan.
            </span>
            <button
              onClick={() => navigate("/billing")}
              className="px-3 py-1.5 rounded-lg bg-[#5B5BD6] text-white text-[11px] font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Upgrade plan
            </button>
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFEEF1] text-[#CC1836] text-[12px] font-medium text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#EDFAF2] text-[#228050] text-[12px] font-medium text-center">
            {success}
          </div>
        )}

        <div className="space-y-4 text-left">
          <div className={cardCls}>
            <h3 className="text-[13px] font-semibold text-[#18182E] mb-1">
              SLA Targets
            </h3>
            <p className="text-[12px] text-[#9898B8] mb-4">
              Response time target per priority level, in minutes. Drives the
              SLA countdown and breach warnings shown on tickets.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SEVERITIES.map((s) => (
                <div key={s.id}>
                  <label className={labelCls}>{s.label}</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.slaTargets?.[s.id] ?? ""}
                    onChange={(e) => setSlaTarget(s.id, e.target.value)}
                    disabled={!canEditSettings}
                    className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <p className="text-[10px] text-[#C0C0D8] mt-1">
                    {minutesHint(settings.slaTargets?.[s.id])}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className={cardCls}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-[13px] font-semibold text-[#18182E]">
                  Auto-assign on first reply
                </h3>

                <p className="mt-1 max-w-md text-[12px] text-[#9898B8]">
                  When an agent sends the first reply to an unassigned ticket,
                  it is automatically claimed and removed from the shared pool
                  for other agents.
                </p>
              </div>

              <Toggle
                checked={settings?.autoAssignOnReply ?? false}
                onChange={(value) => setField("autoAssignOnReply", value)}
                disabled={!canEditSettings}
                className="mt-0.5 shrink-0"
              />
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="text-[13px] font-semibold text-[#18182E] mb-1">
              Customer Portal
            </h3>
            <p className="text-[12px] text-[#9898B8] mb-3">
              Shown to customers on the support portal.
            </p>
            <label className={labelCls}>Support hours note</label>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Mon–Fri 9am–6pm EST"
              value={settings.supportHoursNote || ""}
              onChange={(e) => setField("supportHoursNote", e.target.value)}
              disabled={!canEditSettings}
              className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
            />
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={handleSave}
              disabled={saving || !canEditSettings}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#80A8FF] text-white text-[13px] font-semibold rounded-xl hover:bg-[#6B98EE] transition-colors shadow-sm shadow-[rgba(128,168,255,0.25)] disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
