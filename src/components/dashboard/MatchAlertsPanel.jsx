import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { markRead } from '../../utils/notificationStore.js';

export default function MatchAlertsPanel() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/notifications', { params: { unread: '1', limit: 15 } });
      setItems(data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onUpd = () => load();
    window.addEventListener('mecal:notifications-updated', onUpd);
    return () => window.removeEventListener('mecal:notifications-updated', onUpd);
  }, [load]);

  const markOne = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      markRead(`match-${id}`);
      load();
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      load();
    } catch {
      /* ignore */
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 dark:border-indigo-800 dark:bg-indigo-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
            {t('dashboard.matchAlertsTitle')}
          </h2>
          <p className="mt-1 text-xs text-indigo-700 dark:text-indigo-300">{t('dashboard.matchAlertsHint')}</p>
        </div>
        <button type="button" onClick={markAll} className="text-xs font-semibold text-indigo-700 hover:underline">
          {t('dashboard.matchAlertsMarkAll')}
        </button>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((n) => (
          <li key={n._id} className="text-sm text-slate-800 dark:text-slate-200">
            <Link
              to={`/opportunities?id=${n.opportunity}`}
              onClick={() => markOne(n._id)}
              className="font-semibold hover:underline"
            >
              {n.title}
            </Link>
            {n.organization ? <span className="text-slate-500"> · {n.organization}</span> : null}
            {n.matchReason ? <p className="mt-0.5 text-xs text-slate-500">{n.matchReason}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
