import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  Loader2,
  RotateCcw,
  SearchX,
  XCircle
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { describeScrapeFailure } from '../../utils/scrapeErrorDisplay.js';
import ScrapeErrorBadge from './ScrapeErrorBadge.jsx';

const PAGE_SIZE = 5;
const HOUR_MS = 60 * 60 * 1000;

/** Value of a <input type="datetime-local"> (local time, minute precision). */
function toInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function presetRange(key) {
  const now = new Date();
  if (key === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: toInputValue(start), to: '' };
  }
  if (key === '24h') return { from: toInputValue(new Date(now.getTime() - 24 * HOUR_MS)), to: '' };
  if (key === '7d') return { from: toInputValue(new Date(now.getTime() - 7 * 24 * HOUR_MS)), to: '' };
  return { from: '', to: '' };
}

/** Bounds sent to the server; the end of the chosen minute is included. */
function toBounds(from, to) {
  const start = from ? new Date(from) : null;
  const end = to ? new Date(new Date(to).getTime() + 59_999) : null;
  return {
    from: start && !Number.isNaN(start.getTime()) ? start : null,
    to: end && !Number.isNaN(end.getTime()) ? end : null
  };
}

function StatusBadge({ log, failure, t }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold';
  if (log.status === 'error' && failure) {
    return <ScrapeErrorBadge kind={failure.kind} label={t(failure.badgeKey)} />;
  }
  if (log.status === 'success') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('dashboard.status.success')}
      </span>
    );
  }
  if (log.status === 'running') {
    return (
      <span className={`${base} bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t('dashboard.status.running')}
      </span>
    );
  }
  return (
    <span className={`${base} bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300`}>
      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {t('dashboard.status.error')}
    </span>
  );
}

function FunnelStep({ value, label, highlight = false }) {
  return (
    <div className="px-2 first:pl-0">
      <p
        className={`text-base font-bold tabular-nums leading-none ${
          highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Chip({ icon: Icon, className, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      <Icon className="h-3 w-3 flex-none" aria-hidden="true" />
      {children}
    </span>
  );
}

const inputClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]';

/**
 * Collection history: five runs at a time, newest first. The date and time fields (or the quick buttons)
 * narrow the list to the runs of that period, and the arrows move through the pages.
 */
export default function ScrapeHistoryCard({ stats, locale }) {
  const { t } = useI18n();
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const fallbackLogs = stats?.recentScrapes;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const bounds = toBounds(from, to);
      setLoading(true);
      try {
        const { data } = await api.get('/api/stats/scrapes', {
          params: {
            page,
            limit: PAGE_SIZE,
            ...(bounds.from ? { from: bounds.from.toISOString() } : {}),
            ...(bounds.to ? { to: bounds.to.toISOString() } : {})
          }
        });
        if (!cancelled) setResult({ items: data.items || [], total: data.total ?? 0, pages: data.pages ?? 1 });
      } catch {
        // Server without the history endpoint: filter what the dashboard already holds.
        if (cancelled) return;
        const all = (fallbackLogs || []).filter((log) => {
          const at = new Date(log.finishedAt || log.startedAt);
          return (!bounds.from || at >= bounds.from) && (!bounds.to || at <= bounds.to);
        });
        setResult({
          items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
          total: all.length,
          pages: Math.max(1, Math.ceil(all.length / PAGE_SIZE))
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [from, to, page, fallbackLogs]);

  const pickPreset = (key) => {
    const range = presetRange(key);
    setPreset(key);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  const changeField = (setter) => (e) => {
    setter(e.target.value);
    setPreset('custom');
    setPage(1);
  };

  const rangeText = useMemo(() => {
    if (!result.total) return '';
    const start = (page - 1) * PAGE_SIZE + 1;
    return t('dashboard.historyRange', { from: start, to: Math.min(result.total, page * PAGE_SIZE), total: result.total });
  }, [result.total, page, t]);

  if (!stats?.recentScrapes?.length && !stats?.lastScrapeAt && preset === 'all') return null;

  const last = stats?.lastScrapeAt ? format(new Date(stats.lastScrapeAt), 'PPp', { locale }) : t('dashboard.noCollection');
  const presets = [
    ['all', t('dashboard.presetAll')],
    ['today', t('dashboard.presetToday')],
    ['24h', t('dashboard.preset24h')],
    ['7d', t('dashboard.preset7d')]
  ];
  const gridCols = 'md:grid-cols-[8rem_7.5rem_minmax(0,1fr)_minmax(0,13.5rem)]';

  return (
    <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-100 bg-teal-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-teal-700 text-white shadow-sm">
            <History className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-teal-900 dark:text-teal-200">
              {t('dashboard.scrapeHistory')}
            </h2>
            <p className="mt-0.5 text-xs text-teal-800/80 dark:text-slate-400">{t('dashboard.historySubtitle')}</p>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-teal-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          <Clock className="h-3.5 w-3.5 text-teal-700 dark:text-teal-300" aria-hidden="true" />
          {t('dashboard.lastScrape')}
          <span className="font-bold text-slate-900 dark:text-white">{last}</span>
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('dashboard.historyPeriod')}>
          {presets.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => pickPreset(key)}
              aria-pressed={preset === key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 ${
                preset === key
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="mb-1 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {t('dashboard.historyFrom')}
            </span>
            <input type="datetime-local" value={from} max={to || undefined} onChange={changeField(setFrom)} className={inputClass} />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span className="mb-1 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" aria-hidden="true" />
              {t('dashboard.historyTo')}
            </span>
            <input type="datetime-local" value={to} min={from || undefined} onChange={changeField(setTo)} className={inputClass} />
          </label>
          {preset !== 'all' ? (
            <button
              type="button"
              onClick={() => pickPreset('all')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('dashboard.historyReset')}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`hidden gap-4 border-b border-slate-100 bg-slate-50 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid ${gridCols} dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400`}
      >
        <span>{t('dashboard.historyStatus')}</span>
        <span>{t('dashboard.historyDate')}</span>
        <span>{t('dashboard.historyPipeline')}</span>
        <span>{t('dashboard.historyResult')}</span>
      </div>

      <div className={`transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`} aria-busy={loading}>
        {result.items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <SearchX className="h-5 w-5" aria-hidden="true" />}
            </span>
            {loading ? null : (
              <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('dashboard.historyEmpty')}</p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {result.items.map((log) => {
              const errCount = Array.isArray(log.errors) ? log.errors.length : 0;
              const raw = Number(log.totalRaw ?? 0);
              const skip = Number(log.skipped ?? 0);
              const kept = Math.max(0, raw - skip);
              const isError = log.status === 'error';
              const failure = isError ? describeScrapeFailure(log, t) : null;
              const when = new Date(log.finishedAt || log.startedAt);
              const archived = log.archivedTotal ?? log.archivedExpired ?? 0;
              return (
                <li
                  key={log._id}
                  className={`grid gap-x-4 gap-y-3 px-5 py-3.5 transition hover:bg-slate-50/70 ${gridCols} md:items-center dark:hover:bg-slate-800/30`}
                >
                  <div>
                    <StatusBadge log={log} failure={failure} t={t} />
                  </div>
                  <div className="text-sm leading-tight">
                    <p className="font-semibold text-slate-900 dark:text-white">{format(when, 'dd MMM yyyy', { locale })}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{format(when, 'HH:mm')}</p>
                  </div>

                  {isError ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800 md:col-span-2 dark:bg-red-950/40 dark:text-red-200">
                      {failure?.message}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 divide-x divide-slate-200 dark:divide-slate-700">
                        <FunnelStep value={raw} label={t('dashboard.funnel.read')} />
                        <FunnelStep value={kept} label={t('dashboard.funnel.kept')} />
                        <FunnelStep value={log.scoredCount ?? 0} label={t('dashboard.funnel.scored')} />
                        <FunnelStep value={log.saved ?? 0} label={t('dashboard.funnel.saved')} highlight={(log.saved ?? 0) > 0} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip icon={Archive} className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                          {t('dashboard.expiredRemoved', { count: archived })}
                        </Chip>
                        {log.aiProvider ? (
                          <Chip icon={Bot} className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {t('dashboard.aiUsed', { provider: log.aiProvider })}
                          </Chip>
                        ) : null}
                        {errCount > 0 ? (
                          <Chip icon={XCircle} className="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            {t('dashboard.scrapeErrors', { count: errCount })}
                          </Chip>
                        ) : null}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {result.total > 0 ? (
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/30">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{rangeText}</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label={t('dashboard.historyPrev')}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
              {page} / {result.pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(result.pages, p + 1))}
              disabled={page >= result.pages}
              aria-label={t('dashboard.historyNext')}
              className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-default disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </footer>
      ) : null}
    </section>
  );
}
