import { useState } from 'react';
import { Globe2 } from 'lucide-react';
import DrcFlag from '../layout/DrcFlag.jsx';

export const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

// One look per relevance level: the dial, the label and the small chips share it
export const SCORE_STYLE = {
  high: { stroke: '#10b981', text: 'text-emerald-700 dark:text-emerald-300', chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900', dot: 'bg-emerald-500' },
  medium: { stroke: '#24478a', text: 'text-[#24478a] dark:text-blue-200', chip: 'bg-[#e3ebf9] text-[#24478a] ring-1 ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600', dot: 'bg-[#24478a]' },
  low: { stroke: '#94a3b8', text: 'text-slate-500 dark:text-slate-400', chip: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600', dot: 'bg-slate-400' }
};

/** Round dial with the relevance score in the middle. */
export function ScoreDial({ value = 0, label = 'low', size = 60, stroke = 5 }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex flex-none items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${pct}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-700" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={(SCORE_STYLE[label] || SCORE_STYLE.low).stroke}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-extrabold tabular-nums text-slate-800 dark:text-white">{pct}</span>
    </span>
  );
}

/** Flag of a country: the vector flag of the DR Congo, a flag picture for the others. */
export function CountryFlag({ code, className = 'h-4 w-6' }) {
  const [failed, setFailed] = useState(false);
  if (code === 'CD') return <DrcFlag className={`${className} flex-none rounded-[3px]`} />;
  if (!code || failed) return <Globe2 className={`${className} flex-none text-slate-400`} aria-hidden="true" />;
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt=""
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      className={`${className} flex-none rounded-[3px] object-cover ring-1 ring-black/10`}
    />
  );
}

/** Country name in the language of the interface. */
export function countryLabel(code, fallback, lang) {
  if (!code) return fallback || '';
  if (code === 'CD') return lang === 'en' ? 'DR Congo' : lang === 'sw' ? 'DR Kongo' : 'RDC';
  try {
    return new Intl.DisplayNames([lang || 'fr'], { type: 'region' }).of(code) || fallback || code;
  } catch {
    return fallback || code;
  }
}

export function daysLeft(deadline) {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

/** How urgent a deadline is, for colouring: closed, red (3 days or less), amber (a week), blue. */
export function deadlineTone(days, archived) {
  if (archived || (days != null && days < 0)) return 'closed';
  if (days != null && days <= 3) return 'red';
  if (days != null && days <= 7) return 'amber';
  return 'blue';
}

export const DEADLINE_STYLE = {
  closed: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
  amber: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
  blue: 'bg-[#e3ebf9] text-[#24478a] ring-1 ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600'
};

export const fmtDay = (value, dateLocale) =>
  value ? new Date(value).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';
