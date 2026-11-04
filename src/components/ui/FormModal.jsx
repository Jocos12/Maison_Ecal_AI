import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

export const fieldClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

export function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{children}</dd>
      </div>
    </div>
  );
}

export const btnGhost = `rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`;
export const btnPrimary = `inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`;

/** Same shell as the Users “Nouvel utilisateur” dialog: blue header, icon, title, subtitle, footer. */
export default function FormModal({ icon: Icon, title, subtitle, onClose, children, footer, wide = false, closeLabel = 'Fermer' }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative my-auto w-full overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900 ${
          wide ? 'max-w-2xl' : 'max-w-xl'
        }`}
      >
        <div className="relative bg-[#24478a] px-6 py-5 text-white">
          <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full border-[22px] border-white/5" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-[#24478a]">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-extrabold leading-tight">{title}</h2>
              {subtitle ? <p className="mt-0.5 text-[13px] leading-snug text-blue-100">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
