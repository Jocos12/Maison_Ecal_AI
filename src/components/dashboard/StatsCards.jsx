import { useEffect, useState } from 'react';
import { TrendingUp, Sparkles, ClipboardList, AlarmClock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplay(0);
      return undefined;
    }
    let frame;
    const startedAt = performance.now();
    const duration = 900;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display.toLocaleString('fr-FR');
}

const CARD_STYLES = [
  {
    icon: TrendingUp,
    iconWrap: 'bg-emerald-500/15 text-emerald-500',
    glow: 'hover:shadow-emerald-500/20',
    ring: 'ring-emerald-500/20'
  },
  {
    icon: Sparkles,
    iconWrap: 'bg-blue-500/15 text-blue-500',
    glow: 'hover:shadow-blue-500/20',
    ring: 'ring-blue-500/20'
  },
  {
    icon: ClipboardList,
    iconWrap: 'bg-amber-500/15 text-amber-500',
    glow: 'hover:shadow-amber-500/20',
    ring: 'ring-amber-500/20'
  },
  {
    icon: AlarmClock,
    iconWrap: 'bg-red-500/15 text-red-500',
    glow: 'hover:shadow-red-500/20',
    ring: 'ring-red-500/20'
  }
];

export default function StatsCards({ stats }) {
  const { t } = useI18n();
  const cards = [
    { label: t('dashboard.totalActive'), value: stats?.totalActive ?? 0, ...CARD_STYLES[0] },
    { label: t('dashboard.newWeek'), value: stats?.newThisWeek ?? 0, ...CARD_STYLES[1] },
    { label: t('dashboard.inProgress'), value: stats?.applicationsInProgress ?? 0, ...CARD_STYLES[2] },
    { label: t('dashboard.closingSoon'), value: stats?.closingSoon ?? 0, ...CARD_STYLES[3] }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, iconWrap, glow, ring }, i) => (
        <div
          key={label}
          className={`mecal-fade-up mecal-stat-glass rounded-2xl p-5 ring-1 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl ${glow} ${ring}`}
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className={`rounded-2xl p-3 ${iconWrap}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            <AnimatedNumber value={value} />
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        </div>
      ))}
    </div>
  );
}
