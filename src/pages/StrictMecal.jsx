import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Ban,
  BarChart3,
  Boxes,
  Briefcase,
  Car,
  ClipboardList,
  Database,
  GraduationCap,
  Inbox,
  Layers,
  Search,
  Users,
  Warehouse,
  X
} from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
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

// icon, tile colour and bar colour of each category
const CATEGORY_META = {
  formation: { icon: GraduationCap, tone: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  formation_chauffeurs: { icon: Car, tone: 'bg-lime-100 text-lime-700', bar: 'bg-lime-500' },
  etude_marche: { icon: BarChart3, tone: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
  inventaire_actifs: { icon: Boxes, tone: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' },
  inventaire_general: { icon: Warehouse, tone: 'bg-yellow-100 text-yellow-700', bar: 'bg-yellow-500' },
  consultance: { icon: Users, tone: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' }
};
const ALL_META = { icon: Layers, tone: 'bg-[#e3ebf9] text-[#24478a]', bar: 'bg-[#24478a]' };

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

/** Ring showing how the analysed offers split: confirmed, to check, out of scope. */
function VerdictDonut({ confirmed, review, hors, label }) {
  const total = confirmed + review + hors;
  const size = 184;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 ? 3 : 0;
  const segments = [
    { value: confirmed, color: '#34d399' },
    { value: review, color: '#fbbf24' },
    { value: hors, color: '#b3c5e8' }
  ].filter((s) => s.value > 0);

  let offset = 0;
  const pct = total ? Math.round((confirmed / total) * 100) : 0;

  return (
    <div className="relative mx-auto flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={label}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#3d63ad" strokeWidth={stroke} />
        {segments.map((s) => {
          const length = Math.max(0, (s.value / total) * c - gap);
          const dash = `${length} ${c - length}`;
          const el = (
            <circle
              key={s.color}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += (s.value / total) * c;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-4xl font-extrabold leading-none tabular-nums text-white">{pct}%</p>
        <p className="mt-1.5 max-w-[7.5rem] text-[10.5px] font-medium leading-tight text-blue-100">{label}</p>
      </div>
    </div>
  );
}

function Empty({ title, hint }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800 dark:text-blue-200">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100">{title}</p>
      {hint ? <p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function StrictMecal() {
  const { t } = useI18n();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('confirmed');
  const [category, setCategory] = useState('');
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
  const confirmed = counts.confirmed || 0;
  const review = counts.review || 0;
  const hors = counts.hors || 0;
  const analyzed = confirmed + review + hors;

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

  const sourceOptions = useMemo(() => {
    const listed = sources.filter((s) => s.scraperKey);
    const rows = listed.length ? listed : platforms.map((p) => ({ scraperKey: p, name: p, key: p }));
    return [
      { value: '', label: t('pages.strictMecal.allSources') },
      ...rows.map((s) => ({ value: (s.scraperKey || '').replace(/Veille$/i, ''), label: s.name }))
    ];
  }, [sources, platforms, t]);

  const allConfirmed = useMemo(
    () => CATEGORY_ORDER.flatMap((key) => filteredByCategory[key] || []),
    [filteredByCategory]
  );
  const shownConfirmed = category ? filteredByCategory[category] || [] : allConfirmed;
  const filtering = Boolean(search.trim() || source);
  const categoryLabel = (key) => categories[key] || t(`opportunities.${key}`);

  const figures = [
    { key: 'confirmed', label: t('pages.strictMecal.confirmed'), value: confirmed, dot: 'bg-emerald-400', icon: BadgeCheck },
    { key: 'review', label: t('pages.strictMecal.review'), value: review, dot: 'bg-amber-400', icon: ClipboardList },
    { key: 'hors', label: t('pages.strictMecal.hors'), value: hors, dot: 'bg-blue-200', icon: Ban },
    { key: 'active', label: t('pages.strictMecal.active'), value: counts.totalActive ?? analyzed, dot: 'bg-sky-400', icon: Briefcase }
  ];

  const tab = (key, Icon, label, count, on) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={view === key}
      onClick={() => setView(key)}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-center text-[13px] font-bold leading-tight transition sm:flex-none sm:gap-2.5 sm:px-4 sm:text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 ${
        view === key ? on : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      <span
        className={`grid h-5 min-w-[1.25rem] place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
          view === key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="page-shell space-y-6">
      <section className="overflow-hidden rounded-3xl bg-[#24478a] p-6 text-white shadow-lg md:p-8">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              {t('pages.strictMecal.eyebrow')}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{t('pages.strictMecal.title')}</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100">{t('pages.strictMecal.subtitle')}</p>
            <p className="mt-2 text-xs text-blue-200">
              {t('pages.strictMecal.analyzedLine', { analyzed, total: counts.totalActive ?? analyzed, hors })}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {figures.map(({ key, label, value, dot, icon: Icon }) => (
                <div key={key} className="rounded-2xl bg-white/10 px-4 py-3.5 ring-1 ring-white/20">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold leading-tight text-blue-100">
                    <span className={`h-2 w-2 flex-none rounded-full ${dot}`} aria-hidden="true" />
                    <Icon className="h-3.5 w-3.5 flex-none opacity-70" aria-hidden="true" />
                    <span className="min-w-0">{label}</span>
                  </dt>
                  <dd className="mt-2 text-3xl font-extrabold leading-none tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <VerdictDonut confirmed={confirmed} review={review} hors={hors} label={t('pages.strictMecal.shareLabel')} />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div
          role="tablist"
          className="flex w-full gap-1 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200 sm:w-auto sm:flex-none dark:bg-slate-800/60 dark:ring-slate-700"
        >
          {tab('confirmed', BadgeCheck, t('pages.strictMecal.confirmed'), counts.confirmed ?? 0, 'bg-emerald-600 text-white shadow-sm')}
          {tab('review', ClipboardList, t('pages.strictMecal.review'), counts.review ?? 0, 'bg-amber-500 text-white shadow-sm')}
        </div>
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pages.strictMecal.search')}
            aria-label={t('pages.strictMecal.search')}
            className="h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-[13px] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#24478a] focus:outline-none focus:ring-4 focus:ring-[#24478a]/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('search.clear')}
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <Dropdown
          className="w-full sm:w-64"
          label={t('pages.strictMecal.allSources')}
          icon={Database}
          value={source}
          options={sourceOptions}
          onChange={setSource}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
          ))}
        </div>
      ) : view === 'confirmed' ? (
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <nav
            aria-label={t('pages.strictMecal.categoriesTitle')}
            className="flex snap-x gap-3 overflow-x-auto pb-2 lg:sticky lg:top-2 lg:flex-col lg:gap-2.5 lg:self-start lg:overflow-visible lg:pb-0"
          >
            <p className="hidden px-1 pb-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 lg:block dark:text-slate-400">
              {t('pages.strictMecal.categoriesTitle')}
            </p>
            {[{ key: '', label: t('pages.strictMecal.allCategories'), count: allConfirmed.length, meta: ALL_META }]
              .concat(
                CATEGORY_ORDER.map((key) => ({
                  key,
                  label: categoryLabel(key),
                  count: (filteredByCategory[key] || []).length,
                  meta: CATEGORY_META[key]
                }))
              )
              .map(({ key, label, count, meta }) => {
                const on = category === key;
                const Icon = meta.icon;
                const share = allConfirmed.length ? Math.round((count / allConfirmed.length) * 100) : 0;
                return (
                  <button
                    key={key || 'all'}
                    type="button"
                    onClick={() => setCategory(key)}
                    aria-pressed={on}
                    className={`group flex w-64 flex-none snap-start items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 lg:w-full ${
                      on
                        ? 'border-[#24478a] bg-[#24478a] text-white shadow-md'
                        : `border-slate-200 bg-white text-slate-800 hover:-translate-y-0.5 hover:border-[#24478a]/40 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 ${count === 0 ? 'opacity-70' : ''}`
                    }`}
                  >
                    <span
                      className={`grid h-11 w-11 flex-none place-items-center rounded-xl transition ${on ? 'bg-white/15 text-white' : meta.tone}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[13px] font-bold leading-tight">{label}</span>
                      <span
                        className={`mt-2 block h-1.5 overflow-hidden rounded-full ${on ? 'bg-white/25' : 'bg-slate-100 dark:bg-slate-700'}`}
                        aria-hidden="true"
                      >
                        <span
                          className={`block h-full rounded-full transition-all duration-500 ${on ? 'bg-white' : meta.bar}`}
                          style={{ width: `${share}%` }}
                        />
                      </span>
                    </span>
                    <span className="flex-none text-right">
                      <span className="block text-2xl font-extrabold leading-none tabular-nums">{count}</span>
                      <span
                        className={`mt-1 block text-[10px] font-semibold uppercase tracking-wide ${on ? 'text-blue-100' : 'text-slate-400'}`}
                      >
                        {t('pages.strictMecal.offersUnit')}
                      </span>
                    </span>
                  </button>
                );
              })}
          </nav>

          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {category ? categoryLabel(category) : t('pages.strictMecal.allCategories')}
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t('pages.strictMecal.offersCount', { count: shownConfirmed.length })}
              </p>
            </div>
            {shownConfirmed.length ? (
              <div className="grid items-start gap-4 xl:grid-cols-2">
                {shownConfirmed.map((opp, i) => (
                  <StrictOpportunityCard key={opp._id} opp={opp} onOpen={setModal} index={i} tone="confirmed" />
                ))}
              </div>
            ) : filtering ? (
              <Empty title={t('pages.strictMecal.noResults')} />
            ) : (
              <Empty
                title={category ? t('pages.strictMecal.emptyCategory') : t('pages.strictMecal.emptyAll')}
                hint={category ? '' : t('pages.strictMecal.emptyAllHint')}
              />
            )}
          </section>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pages.strictMecal.reviewTitle')}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('pages.strictMecal.reviewHint')}</p>
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('pages.strictMecal.offersCount', { count: filteredReview.length })}
            </p>
          </div>
          {filteredReview.length ? (
            <div className="grid items-start gap-4 xl:grid-cols-2">
              {filteredReview.map((opp, i) => (
                <StrictOpportunityCard key={opp._id} opp={opp} onOpen={setModal} index={i} tone="review" />
              ))}
            </div>
          ) : (
            <Empty title={filtering ? t('pages.strictMecal.noResults') : t('pages.strictMecal.emptyReview')} />
          )}
        </section>
      )}

      {modal ? <OpportunityModal opp={modal} onClose={() => setModal(null)} /> : null}
    </div>
  );
}
