import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Briefcase, ClipboardList, Inbox, Info, Search } from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';
import StrictOpportunityCard from '../components/strictMecal/StrictOpportunityCard.jsx';

const CATEGORY_ORDER = [
  'formation',
  'formation_chauffeurs',
  'etude_marche',
  'inventaire_actifs',
  'inventaire_general',
  'consultance'
];

function matchesFilters(opp, search, source) {
  if (source) {
    const a = String(opp.platform || '').toLowerCase();
    const b = String(source || '').toLowerCase();
    if (a !== b && !a.includes(b) && !b.includes(a)) return false;
  }
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const blob = `${opp.title || ''} ${opp.description || ''} ${opp.organization || ''} ${opp.strictMecalMatch?.justification || ''}`.toLowerCase();
  return blob.includes(q);
}

function EmptyState({ title }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-400 dark:bg-blue-950/50 dark:text-blue-300">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    </div>
  );
}

export default function StrictMecal() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('confirmed');
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [sources, setSources] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/api/strict-mecal')
      .then(({ data: res }) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    api
      .get('/api/sources')
      .then(({ data: res }) => {
        if (!cancelled) setSources(Array.isArray(res) ? res : res.sources || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = data?.counts || {};
  const categories = data?.categories || {};
  const analyzed = (counts.confirmed || 0) + (counts.review || 0) + (counts.hors || 0);

  const platforms = useMemo(() => {
    const set = new Set();
    Object.values(data?.byCategory || {}).forEach((list) => {
      (list || []).forEach((o) => o.platform && set.add(o.platform));
    });
    (data?.review || []).forEach((o) => o.platform && set.add(o.platform));
    return [...set].sort();
  }, [data]);

  const filteredByCategory = useMemo(() => {
    const next = {};
    for (const key of CATEGORY_ORDER) {
      next[key] = (data?.byCategory?.[key] || []).filter((o) => matchesFilters(o, search, source));
    }
    return next;
  }, [data, search, source]);

  const filteredReview = useMemo(
    () => (data?.review || []).filter((o) => matchesFilters(o, search, source)),
    [data, search, source]
  );

  const sourceOptions = sources.filter((s) => s.scraperKey).length
    ? sources.filter((s) => s.scraperKey)
    : platforms.map((p) => ({ scraperKey: p, name: p, key: p }));

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('pages.strictMecal.title')}
        </h1>
        <p className="flex max-w-xl items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            {t('pages.strictMecal.subtitle')}{' '}
            {t('pages.strictMecal.analyzedLine', {
              analyzed,
              total: counts.totalActive ?? analyzed,
              hors: counts.hors ?? 0
            })}
          </span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <div className="mecal-stat-glass relative overflow-hidden rounded-2xl p-5 ring-1 ring-blue-500/25 md:col-span-3">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-600/15 blur-2xl" />
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/30">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-blue-600/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              {t('pages.strictMecal.heroMetric')}
            </span>
          </div>
          <p className="mt-4 text-4xl font-black tracking-tight text-blue-700 dark:text-blue-300 sm:text-5xl">
            {counts.confirmed ?? '—'}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('pages.strictMecal.confirmed')}</p>
        </div>
        <div className="mecal-stat-glass rounded-2xl p-5 ring-1 ring-amber-500/20">
          <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{counts.review ?? '—'}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('pages.strictMecal.review')}</p>
        </div>
        <div className="mecal-stat-glass rounded-2xl p-5 ring-1 ring-slate-200 dark:ring-slate-700">
          <div className="rounded-2xl bg-slate-500/15 p-3 text-slate-600 dark:text-slate-300">
            <Briefcase className="h-6 w-6" />
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {counts.totalActive ?? '—'}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('pages.strictMecal.activeUnchanged')}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 md:p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('pages.strictMecal.search')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          >
            <option value="">{t('pages.strictMecal.allSources')}</option>
            {sourceOptions.map((s) => (
              <option key={s.key || s.scraperKey} value={(s.scraperKey || '').replace(/Veille$/i, '')}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="inline-flex w-full rounded-full bg-slate-100 p-1 dark:bg-slate-800 sm:w-auto">
        <button
          type="button"
          onClick={() => setView('confirmed')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 sm:flex-none ${
            view === 'confirmed' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {t('pages.strictMecal.confirmed')} ({counts.confirmed ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setView('review')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 sm:flex-none ${
            view === 'review' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {t('pages.strictMecal.review')} ({counts.review ?? 0})
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">{t('pages.strictMecal.loading')}</p>
      ) : (
        <div className="relative">
          <div
            className={`space-y-8 transition-all duration-300 ${
              view === 'confirmed' ? 'translate-y-0 opacity-100' : 'pointer-events-none absolute inset-x-0 translate-y-2 opacity-0'
            }`}
          >
            {CATEGORY_ORDER.map((key) => {
              const items = filteredByCategory[key] || [];
              return (
                <section key={key} className="space-y-3">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {categories[key] || key}{' '}
                    <span className="text-sm font-semibold text-slate-400">({items.length})</span>
                  </h2>
                  {!items.length ? (
                    <EmptyState title={t('pages.strictMecal.emptyCategory')} />
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-1 xl:grid-cols-2">
                      {items.map((opp, i) => (
                        <StrictOpportunityCard key={opp._id} opp={opp} onOpen={setModal} index={i} tone="confirmed" />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <div
            className={`space-y-3 transition-all duration-300 ${
              view === 'review' ? 'translate-y-0 opacity-100' : 'pointer-events-none absolute inset-x-0 translate-y-2 opacity-0'
            }`}
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pages.strictMecal.reviewTitle')}</h2>
            {!filteredReview.length ? (
              <EmptyState title={t('pages.strictMecal.emptyReview')} />
            ) : (
              <div className="grid gap-5 sm:grid-cols-1 xl:grid-cols-2">
                {filteredReview.map((opp, i) => (
                  <StrictOpportunityCard key={opp._id} opp={opp} onOpen={setModal} index={i} tone="review" />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {modal ? <OpportunityModal opp={modal} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
