import { useEffect, useState } from 'react';
import { TrendingUp, Sparkles, ClipboardList, AlarmClock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    if (target === 0) {
      setDisplay(0);
      return;
    }
    let frame;
    const startedAt = performance.now();
    const duration = 750;
    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setDisplay(Math.round(target * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display.toLocaleString('fr-FR');
}

export default function StatsCards({ stats }) {
  const { t } = useI18n();
  const cards = [
    { label: t('dashboard.totalActive'), value: stats?.totalActive ?? 0, icon: TrendingUp, color: 'text-blue-400 bg-blue-500/15' },
    { label: t('dashboard.newWeek'), value: stats?.newThisWeek ?? 0, icon: Sparkles, color: 'text-emerald-400 bg-emerald-500/15' },
    { label: t('dashboard.inProgress'), value: stats?.applicationsInProgress ?? 0, icon: ClipboardList, color: 'text-amber-400 bg-amber-500/15' },
    { label: t('dashboard.closingSoon'), value: stats?.closingSoon ?? 0, icon: AlarmClock, color: 'text-rose-400 bg-rose-500/15' }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="glass-panel rounded-2xl p-4 flex items-center gap-3 transition hover:-translate-y-1 hover:shadow-blue-900/20"
        >
          <div className={`rounded-xl p-3 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-950 dark:text-white">
              <AnimatedNumber value={value} />
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
