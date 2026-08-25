import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { AuthContext } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../data/roles.js";
import { roleLandingPath } from "../utils/roleRouting.js";

// Single-role users get a plain label; multi-role users get a dropdown that
// switches which role's view/nav they're currently acting as for this
// session (not a change to their actual roles in the database).
export default function RoleSwitcher({ className = "" }) {
  const { user, activeRole, setActiveRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  if (!user?.roles?.length) return null;

  const currentLabel =
    ROLE_LABELS[activeRole] || ROLE_LABELS[user.roles[0]] || user.roles[0];

  if (user.roles.length <= 1) {
    return <span className={className}>{currentLabel}</span>;
  }

  const handlePick = (role) => {
    setActiveRole(role);
    setOpen(false);
    // replace, not push — every other auth-driven redirect in this app
    // (login, RequireAuth's role-mismatch bounce) replaces too, so a role
    // switch doesn't leave the old dashboard sitting in history for the
    // browser's Back button to resurface.
    navigate(roleLandingPath([role]), { replace: true });
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer ${className}`}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={10} className="flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 min-w-[170px] bg-white rounded-xl shadow-lg border border-[rgba(128,128,200,0.16)] overflow-hidden left-0">
          {user.roles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handlePick(role)}
              className={`w-full text-left px-3.5 py-2.5 text-[12px] font-medium transition-colors ${
                role === activeRole
                  ? "bg-[#EEF0FF] text-[#5B5BD6]"
                  : "text-[#6B6B90] hover:bg-[#F5F5FF]"
              }`}
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
