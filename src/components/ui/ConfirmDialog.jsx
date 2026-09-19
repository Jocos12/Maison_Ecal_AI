import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

/**
 * Small modal that asks before an irreversible or bulk action.
 * `tone="red"` is for deletions; the default blue is for reversible actions.
 */
export default function ConfirmDialog({
  tone = 'blue',
  icon: Icon,
  title,
  text,
  confirmLabel,
  cancelLabel,
  closeLabel,
  busy = false,
  onConfirm,
  onClose
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const red = tone === 'red';
  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start gap-4 p-6">
          <span
            className={`grid h-12 w-12 flex-none place-items-center rounded-2xl ${
              red ? 'bg-red-50 text-red-600 ring-1 ring-red-100' : 'bg-[#e3ebf9] text-[#24478a]'
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-1.5 break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">{text}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:rotate-90 hover:bg-red-600 hover:text-white dark:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 ${FOCUS}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${FOCUS} ${
              red ? 'bg-red-600 hover:bg-red-700' : 'bg-[#24478a] hover:bg-[#1c3a72]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
