import { SearchX, RotateCcw } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import OpportunityCard from './OpportunityCard.jsx';

function Skeleton({ compact }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 ${
        compact ? 'h-24' : 'h-56'
      }`}
    />
  );
}

/** Results area: loading placeholders, empty state, then the cards (grid) or rows (list). */
export default function OpportunityList({
  items,
  onOpen,
  onQuickApply,
  appliedIds = new Set(),
  viewMode = 'cards',
  loading = false,
  onReset,
  hasFilters = false
}) {
  const { t } = useI18n();
  const compact = viewMode === 'list';
  const gridClass = compact ? 'space-y-3' : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';

  if (loading) {
    return (
      <div className={gridClass} aria-busy="true">
        {Array.from({ length: compact ? 5 : 6 }, (_, i) => (
          <Skeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800 dark:text-blue-200">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">{t('opportunities.emptyTitle')}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('opportunities.emptyHint')}</p>
        {hasFilters && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/30"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('opportunities.filters.reset')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {items.map((opp, i) => (
        <OpportunityCard
          key={opp._id}
          opp={opp}
          onOpen={onOpen}
          onQuickApply={onQuickApply}
          hasApplication={appliedIds.has(String(opp._id))}
          compact={compact}
          index={i}
        />
      ))}
    </div>
  );
}
