import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { CATEGORY_BADGE, platformPillClass } from '../../utils/opportunityUi.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function Flag({ className, children }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>{children}</span>
  );
}

/** One line of the "recent opportunities" list: source tile, title and details on the left, deadline on the right. */
export default function RecentOpportunityRow({ opp, index = 0 }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;

  const deadline = opp.deadline && !opp.deadlineUnspecified ? new Date(opp.deadline) : null;
  const hasDeadline = deadline && !Number.isNaN(deadline.getTime());
  const daysLeft = hasDeadline ? Math.ceil((deadline.getTime() - Date.now()) / DAY_MS) : null;
  const urgent = opp.isUrgent || (daysLeft != null && daysLeft >= 0 && daysLeft <= 7);
  const place = opp.ville && opp.ville !== 'Non précisé' ? opp.ville : '';
  const categoryLabel = opp.category ? t(`opportunities.${opp.category}`) : '';
  const showCategory = categoryLabel && categoryLabel !== `opportunities.${opp.category}`;

  return (
    <Link
      to={`/opportunities?id=${opp._id}`}
      className="mecal-fade-up group flex items-start gap-4 px-5 py-4 transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span
        className={`mt-0.5 grid h-11 w-11 flex-none place-items-center rounded-xl text-[12px] font-extrabold uppercase ring-1 ${platformPillClass(opp.platform)}`}
        title={opp.platform}
      >
        {String(opp.platform || '?').slice(0, 2)}
      </span>

      <div className="min-w-0 flex-1">
        {opp.isNew || urgent || opp.isRecommended ? (
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {opp.isNew ? <Flag className="bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200">{t('opportunities.new')}</Flag> : null}
            {urgent ? <Flag className="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">{t('opportunities.urgent')}</Flag> : null}
            {opp.isRecommended ? (
              <Flag className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                {t('opportunities.recommended')}
              </Flag>
            ) : null}
          </div>
        ) : null}
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 transition group-hover:text-[#24478a] dark:text-white dark:group-hover:text-blue-300">
          {opp.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {opp.organization ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="truncate">{opp.organization}</span>
            </span>
          ) : null}
          {place ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {place}
            </span>
          ) : null}
          {showCategory ? (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance}`}
            >
              {categoryLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden w-36 flex-none text-right sm:block">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('dashboard.deadlineLabel')}
        </p>
        <p className={`mt-1 text-sm font-semibold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {hasDeadline ? format(deadline, 'dd MMM yyyy', { locale }) : t('dashboard.noDeadline')}
        </p>
        {hasDeadline && daysLeft != null && daysLeft >= 0 && daysLeft <= 30 ? (
          <p className={`mt-0.5 text-[11px] font-medium ${urgent ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
            {t('dashboard.daysLeft', { count: daysLeft })}
          </p>
        ) : null}
      </div>

      <ChevronRight
        className="mt-3 h-4 w-4 flex-none text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24478a] dark:text-slate-600"
        aria-hidden="true"
      />
    </Link>
  );
}
