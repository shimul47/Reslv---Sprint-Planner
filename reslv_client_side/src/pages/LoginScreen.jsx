import React, { useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  MessageSquare,
  Shield,
  Users,
  Zap,
} from "lucide-react";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");

  const inp =
    "w-full px-4 py-2.5 rounded-xl border border-[rgba(128,128,200,0.2)] bg-[#F7F7FF] text-[13px] text-[#18182E] placeholder-[#C8C8E0] focus:outline-none focus:border-[#80A8FF] focus:bg-white focus:ring-2 focus:ring-[rgba(128,168,255,0.12)] transition-all";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !pass.trim()) return;

    // Trigger the root authentication processor inside App.jsx
    const loginSuccess = onLogin(email.trim(), pass.trim());
    
    if (!loginSuccess) {
      setError("Invalid authorization credentials key.");
    } else {
      setError("");
    }
  };

  return (
    <div
      className="h-screen w-full flex overflow-hidden bg-white text-left"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* LEFT DESIGN SIDEBAR SECTION */}
      <div
        className="w-[46%] flex-shrink-0 flex flex-col justify-between p-10 relative overflow-hidden select-none"
        style={{
          background:
            "linear-gradient(145deg, #C8C8FF 0%, #CEB5FF 40%, #9DC8E8 100%)",
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, white, transparent)" }}
        />
        <div
          className="absolute bottom-10 -left-24 w-80 h-80 rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #80A8FF, transparent)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-2xl bg-white/25 backdrop-blur-xs flex items-center justify-center shadow-xs">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-[22px] font-bold text-white tracking-tight">
              Reslv
            </span>
          </div>

          <p className="text-[32px] font-extrabold tracking-tight text-white leading-tight max-w-[320px]">
            Support that
            <br />
            feels human.
          </p>

          <p className="mt-4 text-[14px] text-white/65 leading-relaxed max-w-[320px]">
            A calm, thoughtful workspace to resolve what matters — without the
            noise.
          </p>
        </div>

        <div className="relative space-y-2.5">
          {[
            {
              icon: <MessageSquare size={14} />,
              label: "Multi-channel ticket management",
            },
            {
              icon: <Shield size={14} />,
              label: "Escalation pipelines & SLA tracking",
            },
            {
              icon: <Users size={14} />,
              label: "Customer health & churn signals",
            },
            {
              icon: <Activity size={14} />,
              label: "Real-time team performance insights",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span className="text-white/80 flex-shrink-0">{f.icon}</span>
              <span className="text-[13px] text-white font-medium">
                {f.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT AUTH CONTROL FORM SECTION */}
      <div className="flex-1 flex items-center justify-center bg-white px-12">
        <div className="w-full max-w-[340px]">
          <div className="mb-8">
            <h2
              className="text-[26px] font-semibold text-[#18182E]"
              style={{ letterSpacing: "-0.02em" }}
            >
              {signup ? "Create account" : "Welcome back"}
            </h2>
            <p className="text-[13px] text-[#9898B8] mt-1">
              {signup
                ? "Join your support team on Reslv."
                : "Sign in to your workspace."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {signup && (
              <div>
                <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input type="text" placeholder="Alex Kim" className={inp} />
              </div>
            )}
            
            <div>
              <label className="block text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider mb-1.5">
                Work Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inp}
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-[#A8A8C0] uppercase tracking-wider">
                  Password
                </label>
                {!signup && (
                  <button type="button" className="text-[12px] text-[#80A8FF] hover:text-[#5B8AEE] font-medium transition-colors cursor-pointer">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className={`${inp} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C8C8E0] hover:text-[#9898B8] transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100 animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 text-white font-semibold rounded-xl text-[14px] transition-all shadow-xs cursor-pointer active:scale-98"
              style={{
                background: "linear-gradient(135deg, #80A8FF, #7090EE)",
                boxShadow: "0 4px 16px rgba(128,168,255,0.3)",
              }}
            >
              {signup ? "Create Account" : "Sign In"}
            </button>
          </form>

          {!signup && (
            <div className="mt-4 p-3 bg-[#F7F7FF] rounded-xl border border-[rgba(128,128,200,0.14)]">
              <p className="text-[11px] text-[#A8A8C0] text-center mb-2">
                Demo credentials
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail("agent@reslv.io");
                    setPass("demo1234");
                  }}
                  className="flex-1 py-1.5 text-[12px] font-semibold text-[#5B5BD6] bg-[#EEF0FF] rounded-lg hover:bg-[#E4E6FF] transition-colors cursor-pointer"
                >
                  Agent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@reslv.io");
                    setPass("demo1234");
                  }}
                  className="flex-1 py-1.5 text-[12px] font-semibold text-[#2479B5] bg-[#E7F4FD] rounded-lg hover:bg-[#D8EEF8] transition-colors cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-[12px] text-[#B0B0CC] mt-5">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setSignup((v) => !v)}
              className="text-[#80A8FF] hover:text-[#5B8AEE] font-semibold transition-colors cursor-pointer"
            >
              {signup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}