import { useState } from "react";
import { HelpCircle } from "lucide-react";

// Small "?" popover used to explain what a view does / how to use it,
// without needing a separate docs page — satisfies "help dialogs in all
// views" without a heavyweight modal for a couple of sentences.
export default function HelpTip({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Help"
        className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text)] opacity-60 hover:opacity-100 hover:bg-[var(--color-muted)] cursor-pointer"
      >
        <HelpCircle size={14} />
      </button>

      {open && (
        <>
          <button
            aria-label="Close help"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-xl p-3 text-left">
            {title && <p className="text-xs font-bold text-[var(--text-h)] mb-1">{title}</p>}
            <p className="text-[11px] text-[var(--text)] leading-relaxed">{children}</p>
          </div>
        </>
      )}
    </div>
  );
}
