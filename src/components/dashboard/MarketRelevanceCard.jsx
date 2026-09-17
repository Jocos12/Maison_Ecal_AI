import { Target } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { PRIMARY_SKIP_KEYS } from '../../utils/scanRelevanceDisplay.js';

function formatPct(value, lang) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const locale = lang === 'en' ? 'en-US' : lang === 'sw' ? 'en-US' : 'fr-FR';
  return `${Number(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })} %`;
}

function skipLabel(t, key) {
  const mapped = t(`dashboard.skipReason.${key}`);
  return mapped === `dashboard.skipReason.${key}` ? key : mapped;
}

export default function MarketRelevanceCard({ stats }) {
  const { t, lang } = useI18n();
  const data = stats?.marketRelevance;
  const last = data?.lastScan;
  const avg = data?.rolling10;
  if (!last && !avg?.scanCount) return null;

  const skipRows = (last?.skipReasons || [])
    .filter((row) => PRIMARY_SKIP_KEYS.includes(row.key) || (row.pct != null && row.pct >= 1))
    .slice(0, 8);

  return (
    <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 to-white p-5 shadow-sm dark:border-blue-800 dark:from-blue-950/40 dark:to-slate-900/60">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-blue-600/15 p-3 text-blue-700 dark:text-blue-300">
          <Target className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">
            {t('dashboard.marketTitle')}
          </h2>
          {last ? (
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatPct(last.globalRelevancePct, lang)}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{t('dashboard.marketEmpty')}</p>
          )}
          {last ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t('dashboard.marketLastScan', {
                pct: formatPct(last.globalRelevancePct, lang),
                recommended: last.recommended ?? 0,
                read: last.read ?? 0
              })}
            </p>
          ) : null}
          {avg?.scanCount ? (
            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('dashboard.marketAvg10', {
                pct: formatPct(avg.globalRelevancePct, lang),
                count: avg.scanCount
              })}
            </p>
          ) : null}
        </div>
      </div>

      {last ? (
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/50">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t('dashboard.marketRelevanceScored')}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              {formatPct(last.relevancePct, lang)}
              <span className="ml-1 text-xs font-medium text-slate-500">
                ({last.recommended}/{last.scored})
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/50">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t('dashboard.marketFilterRetention')}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              {formatPct(last.filterRetentionPct, lang)}
              <span className="ml-1 text-xs font-medium text-slate-500">
                ({last.kept}/{last.read})
              </span>
            </dd>
          </div>
          <div className="rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/50">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t('dashboard.marketAvgRelevance')}
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">
              {formatPct(avg?.relevancePct, lang)}
            </dd>
          </div>
        </dl>
      ) : null}

      {skipRows.length ? (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t('dashboard.marketSkipTitle')}
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {skipRows.map((row) => (
              <li
                key={row.key}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {formatPct(row.pct, lang)} {skipLabel(t, row.key)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
