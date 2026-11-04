const TONES = {
  en_cours: 'bg-[#e3ebf9] text-[#24478a] ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600',
  pending: 'bg-[#e3ebf9] text-[#24478a] ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600',
  interview: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900',
  gagne: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900',
  termine: 'bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900',
  perdu: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900',
  rejected: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900',
  en_attente: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
  submitted: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
  draft: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
  archived: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
};

export default function StatusBadge({ status, children }) {
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ${TONES[status] || TONES.draft}`}>
      {children}
    </span>
  );
}
