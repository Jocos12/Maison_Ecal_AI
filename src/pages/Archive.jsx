import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArchiveRestore,
  Calendar,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../context/I18nContext.jsx';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useOpportunities } from '../hooks/useOpportunities.js';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';

function scorePercent(opp) {
  if (opp.aiAnalysis?.score != null) {
    return opp.aiAnalysis.score > 1 ? Math.round(opp.aiAnalysis.score) : Math.round(opp.aiAnalysis.score * 100);
  }
  if (opp.aiRelevanceScore != null) return Math.round(opp.aiRelevanceScore * 100);
  return 0;
}

function ArchivedRow({ opp, onOpen, onRestore, restoring }) {
  const pct = scorePercent(opp);
  const archivedAt = opp.updatedAt || opp.createdAt;

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Archivée
          </span>
          {opp.platform ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              {opp.platform}
            </span>
          ) : null}
          {pct > 0 ? (
            <span className="text-[10px] font-semibold text-indigo-600">Score {pct}</span>
          ) : null}
        </div>
        <h3 className="mt-2 line-clamp-2 font-bold text-slate-900 group-hover:text-blue-700 dark:text-white">
          {opp.title}
        </h3>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{opp.organization || '—'}</span>
          <span>📍 {opp.ville || opp.city || 'RDC'}</span>
          {archivedAt ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(archivedAt), 'dd MMM yyyy', { locale: fr })}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpen(opp)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Consulter
        </button>
        <button
          type="button"
          disabled={restoring === opp._id}
          onClick={() => onRestore(opp)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {restoring === opp._id ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Restaurer
        </button>
      </div>
    </article>
  );
}

export default function Archive() {
  const { t } = useI18n();
  const { user } = useApp();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [sort, setSort] = useState('recent');
  const [restoring, setRestoring] = useState(null);
  const params = useMemo(() => ({ archived: true, limit: 100 }), []);
  const { items, total, loading, reload } = useOpportunities(params);

  const platforms = useMemo(() => {
    const set = new Set(items.map((o) => o.platform).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.title?.toLowerCase().includes(q) ||
          o.organization?.toLowerCase().includes(q) ||
          o.platform?.toLowerCase().includes(q)
      );
    }
    if (platform) list = list.filter((o) => o.platform === platform);
    if (sort === 'recent') {
      list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } else if (sort === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'score') {
      list.sort((a, b) => scorePercent(b) - scorePercent(a));
    }
    return list;
  }, [items, search, platform, sort]);

  const stats = useMemo(() => {
    const thisMonth = items.filter((o) => {
      const d = new Date(o.updatedAt || o.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const withDeadline = items.filter((o) => o.deadline).length;
    return { total: total || items.length, thisMonth, platforms: platforms.length, withDeadline };
  }, [items, total, platforms]);

  const restoreOne = async (opp) => {
    setRestoring(opp._id);
    try {
      await api.patch(`/api/opportunities/${opp._id}/unarchive`);
      toast.success('Opportunité restaurée');
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Restauration impossible');
    } finally {
      setRestoring(null);
    }
  };

  const restoreAll = async () => {
    if (!filtered.length) return;
    if (!window.confirm(`Restaurer ${filtered.length} opportunité(s) vers la liste active ?`)) return;
    setRestoring('bulk');
    try {
      await Promise.all(filtered.map((o) => api.patch(`/api/opportunities/${o._id}/unarchive`)));
      toast.success(`${filtered.length} opportunité(s) restaurée(s)`);
      reload();
    } catch {
      toast.error('Restauration partielle ou échec');
      reload();
    } finally {
      setRestoring(null);
    }
  };

  const deleteOne = async (opp) => {
    if (!['Admin', 'admin'].includes(user?.role)) {
      toast.error('Réservé aux administrateurs');
      return;
    }
    if (!window.confirm('Supprimer définitivement cette opportunité archivée ?')) return;
    try {
      await api.delete(`/api/opportunities/${opp._id}`);
      toast.success('Opportunité supprimée');
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Suppression impossible');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">{t('sidebar.groups.data')}</p>
          <h1 className="mt-1 text-2xl font-bold">{t('pages.archive.title')}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300">{t('pages.archive.subtitle')}</p>
        </div>
        <ArchiveRestore className="absolute -bottom-2 -right-2 h-28 w-28 text-white/10" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total archivées', value: stats.total, color: 'text-slate-900 dark:text-white' },
          { label: 'Ce mois-ci', value: stats.thisMonth, color: 'text-blue-600' },
          { label: 'Plateformes', value: stats.platforms, color: 'text-indigo-600' },
          { label: 'Avec échéance', value: stats.withDeadline, color: 'text-amber-600' }
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher titre, organisation, plateforme…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="">Toutes plateformes</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
        >
          <option value="recent">Plus récentes</option>
          <option value="title">Titre A→Z</option>
          <option value="score">Meilleur score</option>
        </select>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {filtered.length} résultat(s) sur {stats.total} archivée(s)
        </p>
        {filtered.length > 0 ? (
          <button
            type="button"
            disabled={restoring === 'bulk'}
            onClick={restoreAll}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurer tout ({filtered.length})
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Chargement de l&apos;archive…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <ArchiveRestore className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-medium text-slate-600 dark:text-slate-400">Aucune opportunité archivée</p>
          <p className="mt-1 text-sm text-slate-500">
            Les offres archivées depuis Opportunités apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opp) => (
            <div key={opp._id} className="relative">
              <ArchivedRow
                opp={opp}
                onOpen={setModal}
                onRestore={restoreOne}
                restoring={restoring}
              />
              {['Admin', 'admin'].includes(user?.role) ? (
                <button
                  type="button"
                  title="Supprimer définitivement"
                  onClick={() => deleteOne(opp)}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modal ? (
        <OpportunityModal opp={modal} onClose={() => setModal(null)} onCreated={reload} />
      ) : null}
    </div>
  );
}
