export default function ScoreRing({ value = 0, size = 44, stroke = 4 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color =
    pct >= 75 ? '#10b981' : pct >= 50 ? '#24478a' : pct >= 30 ? '#f59e0b' : '#94a3b8';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-200">{pct}%</span>
    </div>
  );
}
