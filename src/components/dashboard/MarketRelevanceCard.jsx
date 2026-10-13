import { Target } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { PRIMARY_SKIP_KEYS } from '../../utils/scanRelevanceDisplay.js';

function isNumber(value) {
  return value != null && !Number.isNaN(Number(value));
}

function formatPct(value, lang, empty) {
  if (!isNumber(value)) return empty;
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
  return `${Number(value).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} %`;
}

function skipLabel(t, key) {
  const mapped = t(`dashboard.skipReason.${key}`);
  return mapped === `dashboard.skipReason.${key}` ? key : mapped;
}

function Bar({ value, track, fill, className = '' }) {
  const width = isNumber(value) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full ${track} ${className}`} aria-hidden="true">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${width}%` }} />
    </div>
  );
}

// One flat colour per metric tile.
const TONES = {
  emerald: {
    box: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
    label: 'text-emerald-800 dark:text-emerald-300',
    track: 'bg-emerald-200/70 dark:bg-emerald-900',
    fill: 'bg-emerald-600'
  },
  blue: {
    box: 'border-[#c9d8f1] bg-[#eaf0fb] dark:border-slate-600 dark:bg-slate-800/60',
    label: 'text-[#24478a] dark:text-blue-200',
    track: 'bg-[#c9d8f1]/80 dark:bg-slate-600',
    fill: 'bg-[#24478a]'
  },
  violet: {
    box: 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30',
    label: 'text-violet-800 dark:text-violet-300',
    track: 'bg-violet-200/70 dark:bg-violet-900',
    fill: 'bg-violet-600'
  }
};

function Metric({ tone, label, value, detail, bar }) {
  const c = TONES[tone];
  return (
    <div className={`rounded-xl border p-4 ${c.box}`}>
      <p className={`text-[11px] font-bold uppercase leading-snug tracking-[0.12em] ${c.label}`}>{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</span>
        {detail ? <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{detail}</span> : null}
      </p>
      <Bar value={bar} track={c.track} fill={c.fill} className="mt-3" />
    </div>
  );
}

/**
 * How relevant the market is for Maison ECAL. A solid indigo panel carries the headline figure of the last scan
 * and its average; the right side holds three coloured quality metrics and the breakdown of what the filters removed.
 */
export default function MarketRelevanceCard({ stats }) {
  const { t, lang } = useI18n();
  const data = stats?.marketRelevance;
  const last = data?.lastScan;
  const avg = data?.rolling10;
  if (!last && !avg?.scanCount) return null;

  const empty = t('dashboard.marketNoData');
  const pct = (value) => formatPct(value, lang, empty);
  const skipRows = (last?.skipReasons || [])
    .filter((row) => PRIMARY_SKIP_KEYS.includes(row.key) || (row.pct != null && row.pct >= 1))
    .slice(0, 8);

  return (
    <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex items-center gap-3 border-b border-indigo-100 bg-indigo-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#3d49a5] text-white shadow-sm">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#2d3782] dark:text-indigo-200">
          {t('dashboard.marketTitle')}
        </h2>
      </header>

      {last ? (
        <div className="grid lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
          <div className="bg-[#3d49a5] p-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-200">
              {t('dashboard.marketLastScanShort')}
            </p>
            <p className="mt-2 text-5xl font-bold leading-none tracking-tight tabular-nums">{pct(last.globalRelevancePct)}</p>
            <p className="mt-3 text-sm text-indigo-100">
              {t('dashboard.marketReadOf', { recommended: last.recommended ?? 0, read: last.read ?? 0 })}
            </p>
            <Bar value={last.globalRelevancePct} track="bg-white/20" fill="bg-white" className="mt-3 h-2" />

            {avg?.scanCount ? (
              <div className="mt-6 border-t border-white/20 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-200">
                  {t('dashboard.marketAvgShort', { count: avg.scanCount })}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{pct(avg.globalRelevancePct)}</p>
                <Bar value={avg.globalRelevancePct} track="bg-white/20" fill="bg-indigo-200" className="mt-3" />
              </div>
            ) : null}
          </div>

          <div className="space-y-6 p-5">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Metric
                tone="emerald"
                label={t('dashboard.marketRelevanceScored')}
                value={pct(last.relevancePct)}
                detail={`${last.recommended ?? 0}/${last.scored ?? 0}`}
                bar={last.relevancePct}
              />
              <Metric
                tone="blue"
                label={t('dashboard.marketFilterRetention')}
                value={pct(last.filterRetentionPct)}
                detail={`${last.kept ?? 0}/${last.read ?? 0}`}
                bar={last.filterRetentionPct}
              />
              <Metric tone="violet" label={t('dashboard.marketAvgRelevance')} value={pct(avg?.relevancePct)} bar={avg?.relevancePct} />
            </dl>

            {skipRows.length ? (
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                  {t('dashboard.marketSkipTitle')}
                </h3>
                <ul className="mt-3 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {skipRows.map((row) => (
                    <li key={row.key}>
                      <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 leading-snug text-slate-700 dark:text-slate-200">{skipLabel(t, row.key)}</span>
                        <span className="flex-none font-bold tabular-nums text-slate-900 dark:text-white">{pct(row.pct)}</span>
                      </div>
                      <Bar
                        value={row.pct}
                        track="bg-amber-100 dark:bg-amber-950/60"
                        fill="bg-amber-500"
                        className="mt-1.5"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="p-5 text-sm text-slate-500">{t('dashboard.marketEmpty')}</p>
      )}
    </section>
  );
}
