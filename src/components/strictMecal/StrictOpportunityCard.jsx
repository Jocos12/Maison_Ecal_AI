import OpportunityCard from '../opportunities/OpportunityCard.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

export default function StrictOpportunityCard({ opp, onOpen, index = 0, tone = 'confirmed' }) {
  const { t } = useI18n();
  const justification = opp.strictMecalMatch?.justification;
  const labelKey = tone === 'review' ? 'pages.strictMecal.whyReview' : 'pages.strictMecal.whyRetained';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900/80">
      <div className="[&>button]:rounded-none [&>button]:border-0 [&>button]:shadow-none [&>button]:hover:translate-y-0 [&>button]:hover:shadow-none">
        <OpportunityCard opp={opp} onOpen={onOpen} index={index} />
      </div>
      {justification ? (
        <div
          className={`border-t px-5 py-3 ${
            tone === 'review'
              ? 'border-amber-100 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30'
              : 'border-blue-100 bg-blue-50/90 dark:border-blue-900/40 dark:bg-blue-950/30'
          }`}
        >
          <p
            className={`text-[10px] font-bold uppercase tracking-wide ${
              tone === 'review' ? 'text-amber-800 dark:text-amber-300' : 'text-blue-800 dark:text-blue-300'
            }`}
          >
            {t(labelKey)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{justification}</p>
        </div>
      ) : null}
    </article>
  );
}
