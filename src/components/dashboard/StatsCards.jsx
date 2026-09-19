import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowUpRight, ClipboardList, Sparkles, TrendingUp } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

function AnimatedNumber({ value, locale }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplay(0);
      return undefined;
    }
    let frame;
    const startedAt = performance.now();
    const duration = 700;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display.toLocaleString(locale);
}

// Each figure links to the page that lists what it counts. One flat colour per card, all inside the app's palette.
const CARDS = [
  {
    key: 'active',
    labelKey: 'dashboard.totalActive',
    hintKey: 'dashboard.statHint.active',
    stat: 'totalActive',
    to: '/opportunities',
    icon: TrendingUp,
    card: 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900 dark:bg-emerald-950/30 dark:hover:border-emerald-800',
    tile: 'bg-emerald-600 text-white',
    label: 'text-emerald-800 dark:text-emerald-300',
    number: 'text-emerald-950 dark:text-emerald-50',
    divider: 'border-emerald-200 dark:border-emerald-900',
    hint: 'text-emerald-800/80 dark:text-emerald-300/80',
    see: 'text-emerald-800 dark:text-emerald-300'
  },
  {
    key: 'newWeek',
    labelKey: 'dashboard.newWeek',
    hintKey: 'dashboard.statHint.newWeek',
    stat: 'newThisWeek',
    to: '/opportunities?status=new',
    icon: Sparkles,
    card: 'border-[#c9d8f1] bg-[#eaf0fb] hover:border-[#b3c7ea] dark:border-slate-600 dark:bg-slate-800/60 dark:hover:border-slate-500',
    tile: 'bg-[#24478a] text-white',
    label: 'text-[#24478a] dark:text-blue-200',
    number: 'text-[#0e1c33] dark:text-white',
    divider: 'border-[#c9d8f1] dark:border-slate-600',
    hint: 'text-[#24478a]/80 dark:text-blue-200/80',
    see: 'text-[#24478a] dark:text-blue-200'
  },
  {
    key: 'inProgress',
    labelKey: 'dashboard.inProgress',
    hintKey: 'dashboard.statHint.inProgress',
    stat: 'applicationsInProgress',
    to: '/applications',
    icon: ClipboardList,
    card: 'border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:border-amber-800',
    tile: 'bg-amber-500 text-white',
    label: 'text-amber-800 dark:text-amber-300',
    number: 'text-amber-950 dark:text-amber-50',
    divider: 'border-amber-200 dark:border-amber-900',
    hint: 'text-amber-800/80 dark:text-amber-300/80',
    see: 'text-amber-800 dark:text-amber-300'
  },
  {
    key: 'closing',
    labelKey: 'dashboard.closingSoon',
    hintKey: 'dashboard.statHint.closing',
    stat: 'closingSoon',
    to: '/opportunities?status=urgent',
    icon: AlarmClock,
    card: 'border-rose-200 bg-rose-50 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/30 dark:hover:border-rose-800',
    tile: 'bg-rose-600 text-white',
    label: 'text-rose-800 dark:text-rose-300',
    number: 'text-rose-950 dark:text-rose-50',
    divider: 'border-rose-200 dark:border-rose-900',
    hint: 'text-rose-800/80 dark:text-rose-300/80',
    see: 'text-rose-800 dark:text-rose-300'
  }
];

export default function StatsCards({ stats }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((c, i) => {
        const Icon = c.icon;
        return (
          <Link
            key={c.key}
            to={c.to}
            className={`mecal-fade-up group flex flex-col rounded-2xl border p-5 shadow-sm transition duration-200 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 ${c.card}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-[11px] font-bold uppercase leading-snug tracking-[0.14em] ${c.label}`}>{t(c.labelKey)}</p>
              <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl shadow-sm ${c.tile}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className={`mt-5 text-[2.75rem] font-bold leading-none tracking-tight tabular-nums ${c.number}`}>
              <AnimatedNumber value={stats?.[c.stat] ?? 0} locale={locale} />
            </p>
            <div className={`mt-5 flex items-center justify-between gap-2 border-t pt-3 ${c.divider}`}>
              <span className={`text-xs font-medium ${c.hint}`}>{t(c.hintKey)}</span>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 ${c.see}`}
              >
                {t('dashboard.statSee')}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
