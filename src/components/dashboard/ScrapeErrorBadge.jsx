import { AlertTriangle, Clock, Database, RotateCcw, WifiOff } from 'lucide-react';

const STYLES = {
  timeout: {
    className:
      'inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    Icon: Clock
  },
  orphan_restart: {
    className:
      'inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
    Icon: RotateCcw
  },
  network: {
    className:
      'inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
    Icon: WifiOff
  },
  database: {
    className:
      'inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-900 dark:bg-rose-900/50 dark:text-rose-200',
    Icon: Database
  },
  pipeline: {
    className:
      'inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-800 dark:bg-red-900/50 dark:text-red-200',
    Icon: AlertTriangle
  }
};

export default function ScrapeErrorBadge({ kind, label }) {
  const style = STYLES[kind] || STYLES.pipeline;
  const Icon = style.Icon;
  return (
    <span className={style.className}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
