import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ArrowRight, Briefcase, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import StatsCards from '../components/dashboard/StatsCards.jsx';
import MarketRelevanceCard from '../components/dashboard/MarketRelevanceCard.jsx';
import RecentOpportunityRow from '../components/dashboard/RecentOpportunityRow.jsx';
import MatchAlertsPanel from '../components/dashboard/MatchAlertsPanel.jsx';
import ScrapeErrorBadge from '../components/dashboard/ScrapeErrorBadge.jsx';
import ScrapeHistoryCard from '../components/dashboard/ScrapeHistoryCard.jsx';
import { describeScrapeFailure } from '../utils/scrapeErrorDisplay.js';
import toast from 'react-hot-toast';

const STUCK_RUNNING_MS = 20 * 60 * 1000;
const RECENT_LIMIT = 5;
const REFRESH_MAX_WAIT_MS = 45 * 1000;

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
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);
  const isAdmin = ['Admin', 'admin'].includes(user?.role);

  // `silent` refreshes the figures in place, without swapping the page for loading placeholders.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [s, o] = await Promise.all([
        api.get('/api/stats'),
        api.get('/api/opportunities', { params: { limit: RECENT_LIMIT, page: 1, sort: 'recent' } })
      ]);
      setStats(s.data);
      setRecent(o.data.data);
      return s.data;
    } catch (e) {
      toast.error(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // The refresh scans the fast sources only (about 15 s); the server runs it in the background and we poll its status.
  const finishRefresh = useCallback(async () => {
    stopPolling();
    const fresh = await load({ silent: true });
    const latest = getLatestScrapeLog(fresh?.recentScrapes);
    setRefreshing(false);
    if (latest?.status === 'error') {
      toast.error(t('dashboard.refreshFailed'), { id: 'dashboard-refresh', duration: 6000 });
    } else {
      toast.success(
        t('dashboard.refreshDone', {
          raw: latest?.totalRaw ?? 0,
          saved: latest?.saved ?? 0,
          archived: latest?.archivedTotal ?? 0
        }),
        { id: 'dashboard-refresh', duration: 6000 }
      );
    }
  }, [load, stopPolling, t]);

  const startPolling = useCallback(() => {
    stopPolling();
    const startedAt = Date.now();
    pollRef.current = window.setInterval(async () => {
      try {
        const { data } = await api.get('/api/opportunities/scrape/status');
        if (data?.running === false) {
          finishRefresh();
          return;
        }
      } catch {
        /* keep waiting, the next tick tries again */
      }
      // Never keep the button busy for long: past the ceiling the scan carries on in the background.
      if (Date.now() - startedAt > REFRESH_MAX_WAIT_MS) {
        stopPolling();
        await load({ silent: true });
        setRefreshing(false);
        toast(t('dashboard.refreshSlow'), { id: 'dashboard-refresh', duration: 6000 });
      }
    }, 1500);
  }, [finishRefresh, load, stopPolling, t]);

  useEffect(() => stopPolling, [stopPolling]);

  const runScrape = async () => {
    if (refreshing) return;
    if (!isAdmin) {
      toast.error(t('dashboard.refreshAdminOnly'));
      return;
    }
    setRefreshing(true);
    toast.loading(t('dashboard.refreshing'), { id: 'dashboard-refresh' });
    load({ silent: true });
    try {
      const res = await api.post('/api/opportunities/scrape', { background: true, quick: true });
      if (res.status === 202 && res.data?.started === false) {
        // The automatic full scan is already running (about ten minutes): do not wait for it.
        await load({ silent: true });
        setRefreshing(false);
        toast(t('dashboard.refreshAlready'), { id: 'dashboard-refresh', duration: 6000 });
      } else if (res.status === 202) {
        startPolling();
      } else {
        // Older server: it answered only once the whole collection was finished.
        const data = res.data || {};
        toast.success(
          t('dashboard.refreshDone', {
            raw: data.totalRaw ?? 0,
            saved: data.saved ?? 0,
            archived: data.archivedTotal ?? 0
          }),
          { id: 'dashboard-refresh', duration: 6000 }
        );
        await load({ silent: true });
        setRefreshing(false);
      }
    } catch (e) {
      setRefreshing(false);
      toast.error(e.response?.data?.message || e.message || t('dashboard.refreshFailed'), {
        id: 'dashboard-refresh',
        duration: 6000
      });
    }
  };

  // Keep the last word (M-ECAL) on one line so it never breaks at its hyphen.
  const heroWords = t('dashboard.heroTitle').split(' ');
  const heroTitleTail = heroWords.pop();
  const heroTitleHead = heroWords.join(' ');

  const latestScrape = getLatestScrapeLog(stats?.recentScrapes);
  const showScrapeError = shouldShowScrapeErrorBanner(stats);
  const latestFailure =
    latestScrape?.status === 'error' ? describeScrapeFailure(latestScrape, t) : null;

  return (
    <div className="page-shell space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#24478a] px-6 py-8 text-white shadow-xl md:px-10 md:py-11">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute right-8 top-1/2 hidden h-52 w-80 -translate-y-1/2 md:block"
          viewBox="0 0 320 208"
        >
          <defs>
            <pattern id="hero-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.8" fill="#ffffff" fillOpacity="0.28" />
            </pattern>
          </defs>
          <rect width="320" height="208" fill="url(#hero-dots)" />
        </svg>

        <div className="relative max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100">
            <Sparkles className="h-3.5 w-3.5" />
            M-ECAL · RDC
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-[2.6rem] md:leading-[1.1]">
            {heroTitleHead} <span className="whitespace-nowrap">{heroTitleTail}</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-blue-100">{t('dashboard.heroSubtitle')}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                type="button"
                onClick={runScrape}
                disabled={refreshing}
                aria-busy={refreshing}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#24478a] shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:cursor-wait disabled:opacity-90 disabled:hover:translate-y-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('dashboard.refreshing') : t('dashboard.refresh')}
              </button>
            )}
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            >
              {t('dashboard.viewAll')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {refreshing ? (
            <p role="status" className="mt-4 flex max-w-md items-start gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs leading-relaxed text-blue-50">
              <Loader2 className="mt-0.5 h-4 w-4 flex-none animate-spin" />
              {t('dashboard.refreshingHint')}
            </p>
          ) : null}
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

          <ScrapeHistoryCard stats={stats} locale={locale} />

          <section className="overflow-hidden rounded-2xl border border-[#c9d8f1] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c9d8f1] bg-[#eaf0fb]/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#24478a] text-white shadow-sm">
                  <Briefcase className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#1b3a72] dark:text-blue-200">
                    {t('dashboard.recent')}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#24478a]/80 dark:text-slate-400">{t('dashboard.recentSubtitle')}</p>
                </div>
              </div>
              <Link
                to="/opportunities"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#24478a] shadow-sm ring-1 ring-[#c9d8f1] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-600 dark:hover:bg-slate-700"
              >
                {t('dashboard.viewAll')}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </header>
            {recent.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">{t('dashboard.none')}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recent.slice(0, RECENT_LIMIT).map((r, i) => (
                  <li key={r._id}>
                    <RecentOpportunityRow opp={r} index={i} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
