import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import StatsCards from '../components/dashboard/StatsCards.jsx';
import RecentOpportunityRow from '../components/dashboard/RecentOpportunityRow.jsx';
import toast from 'react-hot-toast';

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
      toast.success(`Raw: ${data.totalRaw}, saved: ${data.saved}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="space-y-8">
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

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4 text-blue-500" />
            {t('dashboard.lastScrape')}:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {stats?.lastScrapeAt ? format(new Date(stats.lastScrapeAt), 'PPpp', { locale }) : '—'}
            </span>
          </div>

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
