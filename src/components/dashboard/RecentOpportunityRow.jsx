import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORY_BORDER, platformPillClass } from '../../utils/opportunityUi.js';

export default function RecentOpportunityRow({ opp, index = 0 }) {
  const border = CATEGORY_BORDER[opp.category] || CATEGORY_BORDER.assistance;
  const pill = platformPillClass(opp.platform);

  return (
    <Link
      to={`/opportunities?id=${opp._id}`}
      className={`mecal-fade-up group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-blue-500/40 dark:hover:bg-blue-950/20`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`w-1 self-stretch rounded-full ${border.replace('border-l-', 'bg-')}`} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 font-semibold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
          {opp.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{opp.organization || '—'}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 ${pill}`}>
        {opp.platform}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600" />
    </Link>
  );
}
