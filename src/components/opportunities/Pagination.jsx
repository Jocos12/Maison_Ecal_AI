import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

/** Page numbers to show: the first, the last, and a window around the current one. */
function visiblePages(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push('gap-' + n);
    out.push(n);
  });
  return out;
}

const base =
  'grid h-9 min-w-[2.25rem] place-items-center rounded-lg border px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20';

export default function Pagination({ page, pages, total, onPage }) {
  const { t } = useI18n();
  if (pages <= 1) return null;

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm sm:flex-row dark:border-slate-700 dark:bg-slate-900"
      aria-label="Pagination"
    >
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {t('opportunities.pageOf', { page, pages })} · {t('opportunities.resultsCount', { count: total })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={t('opportunities.previous')}
          className={`${base} border-slate-200 bg-white text-slate-600 hover:border-[#24478a] hover:text-[#24478a] disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {visiblePages(page, pages).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="px-1 text-sm text-slate-400" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`${base} ${
                n === page
                  ? 'border-[#24478a] bg-[#24478a] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label={t('opportunities.next')}
          className={`${base} border-slate-200 bg-white text-slate-600 hover:border-[#24478a] hover:text-[#24478a] disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
