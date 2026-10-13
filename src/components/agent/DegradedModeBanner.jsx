export default function DegradedModeBanner({ show, label }) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="mx-4 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
    >
      {label}
    </div>
  );
}
