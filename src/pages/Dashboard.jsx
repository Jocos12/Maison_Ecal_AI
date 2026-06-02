import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import StatsCards from '../components/dashboard/StatsCards.jsx';
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
        api.get('/api/opportunities', { params: { limit: 5, page: 1 } })
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('dashboard.title')}</h1>
        <div className="flex flex-wrap gap-2">
          {['Admin', 'admin'].includes(user?.role) && (
            <button
              type="button"
              onClick={runScrape}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              {t('dashboard.refresh')}
            </button>
          )}
          <Link
            to="/opportunities"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('dashboard.viewAll')}
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <>
          <StatsCards stats={stats} />
          <p className="text-sm text-slate-500">
            {t('dashboard.lastScrape')}:{' '}
            {stats?.lastScrapeAt
              ? format(new Date(stats.lastScrapeAt), 'PPpp', { locale })
              : '—'}
          </p>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white mb-3">{t('dashboard.recent')}</h2>
            {recent.length === 0 ? (
              <p className="text-slate-500">{t('dashboard.none')}</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((r) => (
                  <li
                    key={r._id}
                    className="rounded-lg border border-slate-200 bg-white/75 px-4 py-3 flex justify-between gap-4 dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <span className="text-slate-800 line-clamp-1 dark:text-slate-200">{r.title}</span>
                    <span className="text-xs text-slate-500 shrink-0">{r.platform}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
