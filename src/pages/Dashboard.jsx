import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import StatsCards from '../components/dashboard/StatsCards.jsx';
import MarketRelevanceCard from '../components/dashboard/MarketRelevanceCard.jsx';
import RecentOpportunityRow from '../components/dashboard/RecentOpportunityRow.jsx';
import MatchAlertsPanel from '../components/dashboard/MatchAlertsPanel.jsx';
import ScrapeErrorBadge from '../components/dashboard/ScrapeErrorBadge.jsx';
import { describeScrapeFailure } from '../utils/scrapeErrorDisplay.js';
import toast from 'react-hot-toast';

const STUCK_RUNNING_MS = 20 * 60 * 1000;

function scrapeLogTime(log) {
  return new Date(log?.finishedAt || log?.startedAt || 0).getTime();
}

/** Latest run by timestamp — ignore older orphan/error rows once a newer success exists. */
export function getLatestScrapeLog(logs = []) {
  if (!logs.length) return null;
  return [...logs].sort((a, b) => scrapeLogTime(b) - scrapeLogTime(a))[0];
}

export function shouldShowScrapeErrorBanner(stats) {
  const latest = getLatestScrapeLog(stats?.recentScrapes || []);
  if (!latest) return false;
  if (latest.status === 'success') return false;
  if (latest.status === 'error') return true;
  if (latest.status === 'running') {
    return Date.now() - scrapeLogTime(latest) > STUCK_RUNNING_MS;
  }
  return false;
}

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { user } = useApp();
  const locale = lang === 'fr' ? fr : undefined;
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        api.get('/api/stats'),
        api.get('/api/opportunities', { params: { limit: 8, page: 1 } })
      ]);
      setStats(s.data);
      setRecent(o.data.data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runScrape = async () => {
    if (!['Admin', 'admin'].includes(user?.role)) return;
    try {
      const { data } = await api.post('/api/opportunities/scrape');
      toast.success(
        `${data.totalRaw ?? 0} lues, ${data.saved ?? 0} nouvelles, ${data.archivedTotal ?? 0} expirées retirées`
      );
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const latestScrape = getLatestScrapeLog(stats?.recentScrapes);
  const showScrapeError = shouldShowScrapeErrorBanner(stats);
  const latestFailure =
    latestScrape?.status === 'error' ? describeScrapeFailure(latestScrape, t) : null;

  return (
    <div className="page-shell space-y-8">
      <section className="mecal-hero-dashboard relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-xl md:px-10 md:py-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-blue-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-blue-200">
              <Sparkles className="h-4 w-4" />
              M-ECAL · RDC
            </p>
            <h1 className="mecal-title-shine mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {t('dashboard.heroTitle')}
            </h1>
            <p className="mt-3 max-w-xl text-sm text-blue-100/90">{t('dashboard.heroSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Admin', 'admin'].includes(user?.role) && (
              <button
                type="button"
                onClick={runScrape}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow-lg transition hover:scale-105 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4" />
                {t('dashboard.refresh')}
              </button>
            )}
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {t('dashboard.viewAll')}
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          <StatsCards stats={stats} />
          <MarketRelevanceCard stats={stats} />

          {stats?.scrapeOverdue ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
              {t('dashboard.scrapeOverdue')}
            </div>
          ) : null}

          {stats?.aiDegraded?.active ? (
            <div className="rounded-2xl border border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-950 dark:border-orange-600 dark:bg-orange-950/40 dark:text-orange-100">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {t('dashboard.aiDegradedTitle')}
              </p>
              <p className="mt-1 text-xs font-medium leading-relaxed opacity-95">
                {t('dashboard.aiDegradedBanner', {
                  hours:
                    stats.aiDegraded.sinceHours < 1
                      ? '< 1'
                      : String(Math.max(1, Math.round(Number(stats.aiDegraded.sinceHours) || 0)))
                })}
              </p>
            </div>
          ) : null}

          {showScrapeError ? (
            <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
              <p className="font-bold">{t('dashboard.scrapeFailed')}</p>
              <p className="mt-1 text-xs font-medium opacity-90">{t('dashboard.scrapeFailedHint')}</p>
              {latestFailure ? (
                <div className="mt-2 space-y-2">
                  <ScrapeErrorBadge kind={latestFailure.kind} label={t(latestFailure.badgeKey)} />
                  <p className="text-xs font-medium leading-relaxed">{latestFailure.message}</p>
                </div>
              ) : stats.scrapeWatch?.lastErrorMessage ? (
                <p className="mt-2 text-xs font-medium leading-relaxed">
                  {describeScrapeFailure({ message: stats.scrapeWatch.lastErrorMessage }, t).message}
                </p>
              ) : null}
            </div>
          ) : null}

          <MatchAlertsPanel />

          {(stats?.followUpsDue || []).length > 0 ? (
            <section className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 dark:border-blue-800 dark:bg-blue-950/30">
              <h2 className="text-sm font-bold uppercase tracking-wide text-blue-800 dark:text-blue-200">
                {t('dashboard.followUpsTitle')}
              </h2>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                {t('dashboard.followUpsHint', { count: stats.followUpsDue.length })}
              </p>
              <ul className="mt-3 space-y-1">
                {stats.followUpsDue.map((item) => (
                  <li key={item.id} className="text-sm text-slate-800 dark:text-slate-200">
                    <Link to="/applications" className="font-semibold hover:underline">
                      {item.title}
                    </Link>
                    {item.organization ? <span className="text-slate-500"> · {item.organization}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {stats?.recommendedCount > 0 ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                {t('dashboard.recommendedBanner')}
              </h2>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                {t('dashboard.recommendedHint', { count: stats.recommendedCount })}
              </p>
              <ul className="mt-3 space-y-1">
                {(stats.recommendedOffers || []).map((opp) => (
                  <li key={opp._id} className="text-sm text-slate-800 dark:text-slate-200">
                    <Link to={`/opportunities?id=${opp._id}`} className="font-semibold hover:underline">
                      {opp.title}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {' '}
                      · {Math.round((opp.aiRelevanceScore || 0) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4 text-blue-500" />
            {t('dashboard.lastScrape')}:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {stats?.lastScrapeAt ? format(new Date(stats.lastScrapeAt), 'PPpp', { locale }) : '—'}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t('dashboard.scrapeAutoHint')}</p>

          {stats?.recentScrapes?.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white/90 p-5 dark:border-slate-700 dark:bg-slate-900/60">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {t('dashboard.scrapeHistory')}
              </h2>
              <ul className="space-y-2">
                {stats.recentScrapes.map((log) => {
                  const errCount = Array.isArray(log.errors) ? log.errors.length : 0;
                  const raw = Number(log.totalRaw ?? 0);
                  const skip = Number(log.skipped ?? 0);
                  const kept = Math.max(0, raw - skip);
                  const isError = log.status === 'error';
                  const failure = isError ? describeScrapeFailure(log, t) : null;
                  return (
                    <li
                      key={log._id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/80 dark:text-slate-300"
                    >
                      {isError && failure ? (
                        <ScrapeErrorBadge kind={failure.kind} label={t(failure.badgeKey)} />
                      ) : (
                        <span
                          className={
                            log.status === 'success'
                              ? 'font-bold text-emerald-600'
                              : log.status === 'running'
                                ? 'font-bold text-blue-600'
                                : 'font-bold text-red-600'
                          }
                        >
                          {log.status}
                        </span>
                      )}
                      <span>
                        {format(new Date(log.finishedAt || log.startedAt), 'dd MMM yyyy HH:mm', { locale })}
                      </span>
                      {!isError ? (
                        <>
                          <span>
                            {t('dashboard.scrapeFunnel', {
                              raw,
                              kept,
                              scored: log.scoredCount ?? 0,
                              saved: log.saved ?? 0
                            })}
                          </span>
                          <span className="font-semibold text-amber-700 dark:text-amber-400">
                            {t('dashboard.scrapeArchived', {
                              archived: log.archivedTotal ?? log.archivedExpired ?? 0
                            })}
                          </span>
                          {log.aiProvider ? (
                            <span>{t('dashboard.scrapeAiProvider', { provider: log.aiProvider })}</span>
                          ) : null}
                          {errCount > 0 ? (
                            <span className="text-red-600">
                              {t('dashboard.scrapeErrors', { count: errCount })}
                              {log.message ? ` — ${String(log.message).slice(0, 80)}` : ''}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="w-full text-red-700 dark:text-red-300">{failure.message}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {t('dashboard.recent')}
              </h2>
              <Link
                to="/opportunities"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Voir tout →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-500 dark:border-slate-700">
                {t('dashboard.none')}
              </p>
            ) : (
              <div className="space-y-3">
                {recent.map((r, i) => (
                  <RecentOpportunityRow key={r._id} opp={r} index={i} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
