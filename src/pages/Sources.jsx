import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CirclePause,
  Clock,
  ExternalLink,
  Globe2,
  Landmark,
  Layers,
  Link2,
  MapPin,
  Play,
  RefreshCw,
  Signal,
  XCircle
} from 'lucide-react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import ScoreRing from '../components/ui/ScoreRing.jsx';
import { platformPillClass, CATEGORY_BADGE } from '../utils/opportunityUi.js';
import { scorePercent } from '../utils/opportunityUrgency.js';
import { SourceGlyph } from '../utils/sourceIcons.jsx';

const GROUPS = [
  { id: 'rdc', icon: Landmark, keys: ['ARSP', 'SIGMAP', 'AchatPublicRDC', 'ProfilRDC'] },
  { id: 'intl', icon: Globe2, keys: ['UNGM', 'UNGMVeille', 'ReliefWeb', 'AfDB', 'AfDBVeille'] }
];

function groupSources(sources) {
  const used = new Set();
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: sources.filter((s) => {
      const key = s.scraperKey || s.key;
      const hit = g.keys.includes(key) || g.keys.includes(s.key);
      if (hit) used.add(s._id);
      return hit;
    })
  }));
  grouped.push({ id: 'other', icon: Layers, items: sources.filter((s) => !used.has(s._id)) });
  return grouped.filter((g) => g.items.length);
}

/** healthy | zero | error | inactive */
function healthOf(source) {
  if (source.enabled === false || source.health === 'inactive') return 'inactive';
  if (source.health === 'error') return 'error';
  if (source.health === 'healthy') return 'healthy';
  return 'zero';
}

const HEALTH_LOOK = {
  healthy: {
    icon: CheckCircle2,
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    cell: 'bg-emerald-400',
    tile: 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  },
  zero: {
    icon: AlertCircle,
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    cell: 'bg-amber-400',
    tile: 'bg-amber-100 text-amber-700 ring-amber-200'
  },
  error: {
    icon: XCircle,
    badge: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    cell: 'bg-rose-400',
    tile: 'bg-red-100 text-red-700 ring-red-200'
  },
  inactive: {
    icon: CirclePause,
    badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    cell: 'bg-blue-200/50',
    tile: 'bg-slate-100 text-slate-500 ring-slate-200'
  }
};

function HealthBadge({ health }) {
  const { t } = useI18n();
  const look = HEALTH_LOOK[health];
  const Icon = look.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${look.badge}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(`pages.sources.health.${health}`)}
    </span>
  );
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className="flex flex-none items-center gap-2 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20"
    >
      <span className={`text-[11px] font-bold ${checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}

/** `stacked`: the actions go under the text (used inside a narrow card). */
function OfferRow({ opp, stacked = false }) {
  const { t } = useI18n();
  const cat = CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance;
  const pct = scorePercent(opp);
  const catLabel = opp.category ? t(`opportunities.${opp.category}`) : '';
  const place = opp.ville && opp.ville !== 'Non précisé' ? opp.ville : '';

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#24478a]/40 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 ${
        stacked ? '' : 'sm:flex-row sm:items-center'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
      <span
        className={`grid h-11 w-11 flex-none place-items-center rounded-xl ring-1 ${platformPillClass(opp.platform)}`}
        title={opp.platform}
      >
        <SourceGlyph source={opp.platform} platform={opp.platform} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-white">{opp.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {opp.organization ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="truncate">{opp.organization}</span>
            </span>
          ) : null}
          {place ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {place}
            </span>
          ) : null}
          {catLabel && catLabel !== `opportunities.${opp.category}` ? (
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${cat}`}>{catLabel}</span>
          ) : null}
        </div>
      </div>
      </div>
      <div className={`flex flex-none items-center gap-3 ${stacked ? 'justify-between' : ''}`}>
        <span title={t('opportunities.relevanceForMecal', { pct })}>
          <ScoreRing value={pct} size={40} />
        </span>
        {opp.sourceUrl ? (
          <a
            href={opp.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#24478a] px-3 py-1.5 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:border-blue-300 dark:text-blue-300"
          >
            {t('pages.sources.viewOnline')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, tone, label, children }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/70">
      <div className={`flex items-center gap-1.5 ${tone}`}>
        <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-1.5 text-sm font-bold leading-tight text-slate-900 dark:text-white">{children}</div>
    </div>
  );
}

function SourceCard({ source, expanded, highlighted, onToggleOpen, onToggleEnabled, onScan, scanning, isAdmin, locale }) {
  const { t } = useI18n();
  const offers = source.sampleOffers || [];
  const isOpen = expanded === source._id;
  const count = source.relevantCount ?? source.opportunitiesCount ?? 0;
  const health = healthOf(source);
  const look = HEALTH_LOOK[health];
  const scanned = source.lastScrapedAt ? format(new Date(source.lastScrapedAt), 'dd MMM yyyy, HH:mm', { locale }) : t('pages.sources.never');
  const scan = source.lastStatus === 'error' ? 'error' : source.lastStatus === 'success' ? 'success' : 'idle';
  const scanTone =
    scan === 'success' ? 'text-emerald-700 dark:text-emerald-300' : scan === 'error' ? 'text-red-600 dark:text-red-300' : 'text-slate-500';

  return (
    <article
      id={`source-${source._id}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-slate-900 ${
        highlighted ? 'border-[#24478a] ring-4 ring-[#24478a]/15' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <span className={`grid h-12 w-12 flex-none place-items-center rounded-2xl ring-1 ${look.tile}`}>
            <SourceGlyph source={source.scraperKey || source.key} platform={source.name} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{source.name}</h3>
              <HealthBadge health={health} />
            </div>
            {source.description ? (
              <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{source.description}</p>
            ) : null}
          </div>
          <Switch
            checked={source.enabled !== false}
            onChange={() => onToggleEnabled(source)}
            label={source.enabled !== false ? t('pages.sources.enabled') : t('pages.sources.disabled')}
          />
        </div>

        {source.url ? (
          <a
            className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-[#24478a] ring-1 ring-slate-200 transition hover:bg-[#e3ebf9] dark:bg-slate-800 dark:text-blue-300 dark:ring-slate-700"
            href={source.url}
            target="_blank"
            rel="noreferrer"
            title={source.url}
          >
            <Link2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span className="truncate">{hostOf(source.url)}</span>
            <ExternalLink className="h-3 w-3 flex-none" aria-hidden="true" />
          </a>
        ) : null}

        {source.enabled === false && source.inactiveReason ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
            <p>{source.inactiveReason}</p>
            <button
              type="button"
              onClick={() => onToggleEnabled(source)}
              className="mt-1.5 font-bold text-[#24478a] hover:underline dark:text-blue-300"
            >
              {t('pages.sources.reactivate')}
            </button>
          </div>
        ) : null}

        {source.lastStatus === 'error' && source.lastErrorMessage ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {source.lastErrorMessage}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Stat icon={Clock} tone="text-indigo-600 dark:text-indigo-300" label={t('pages.sources.frequency')}>
            {source.frequencyHours}h
          </Stat>
          <Stat icon={Layers} tone="text-teal-600 dark:text-teal-300" label={t('pages.sources.online')}>
            {count}
          </Stat>
          <Stat icon={Signal} tone={scanTone} label={t('pages.sources.scanStatus')}>
            <span className={scanTone}>{t(`pages.sources.status.${scan}`)}</span>
          </Stat>
          <Stat icon={CalendarClock} tone="text-indigo-600 dark:text-indigo-300" label={t('pages.sources.lastScan')}>
            <span className="text-xs">{scanned}</span>
          </Stat>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isAdmin && source.scraperKey ? (
            <button
              type="button"
              disabled={scanning}
              onClick={() => onScan(source)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25 disabled:cursor-wait disabled:opacity-70"
            >
              <Play className={`h-3.5 w-3.5 ${scanning ? 'animate-pulse' : ''}`} aria-hidden="true" />
              {scanning ? t('pages.sources.scanning') : t('pages.sources.scanNow')}
            </button>
          ) : null}
          {count > 0 ? (
            <button
              type="button"
              onClick={() => onToggleOpen(source._id)}
              aria-expanded={isOpen}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-[#24478a] transition hover:bg-[#e3ebf9] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:text-blue-300 dark:hover:bg-slate-800"
            >
              {isOpen ? t('pages.sources.hideOffers') : t('pages.sources.showOffers', { count })}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          ) : (
            <p className="text-xs text-slate-400">
              {source.lastStatus === 'idle' ? t('pages.sources.noOffersIdle') : t('pages.sources.noOffers')}
            </p>
          )}
        </div>
      </div>

      {isOpen && offers.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          {offers.map((opp) => (
            <OfferRow key={opp._id} opp={opp} stacked />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function Sources() {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const [sources, setSources] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [scanningId, setScanningId] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [searchParams] = useSearchParams();
  const focusId = searchParams.get('id');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/sources');
      const list = Array.isArray(data) ? data : data.sources || [];
      setSources(list);
      setOpportunities(Array.isArray(data?.opportunities) ? data.opportunities : []);
    } catch {
      toast.error(t('pages.sources.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming from the global search: open that source and bring it into view.
  useEffect(() => {
    if (!focusId || loading || !sources.some((s) => s._id === focusId)) return;
    setExpanded(focusId);
    const timer = setTimeout(() => {
      document.getElementById(`source-${focusId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [focusId, loading, sources]);

  const toggle = async (source) => {
    await api.put(`/api/sources/${source._id}`, { enabled: !source.enabled });
    load();
  };

  const scanOne = async (source) => {
    if (!isAdmin) return;
    setScanningId(source._id);
    try {
      await api.post(`/api/sources/${source._id}/scrape`);
      toast.success(t('pages.sources.scanStarted', { name: source.name }));
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setScanningId(null);
    }
  };

  const jumpTo = (id) => {
    document.getElementById(`source-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashId(id);
    window.setTimeout(() => setFlashId((cur) => (cur === id ? null : cur)), 2200);
  };

  const groups = useMemo(() => groupSources(sources), [sources]);
  const relevantTotal = opportunities.length;
  const activeCount = sources.filter((s) => s.enabled).length;
  const withOffers = sources.filter((s) => (s.relevantCount || 0) > 0).length;

  const figures = [
    { key: 'relevant', value: relevantTotal },
    { key: 'active', value: activeCount },
    { key: 'withOffers', value: withOffers }
  ];
  const legend = ['healthy', 'zero', 'error', 'inactive'].map((key) => ({
    key,
    count: sources.filter((s) => healthOf(s) === key).length
  }));

  return (
    <div className="page-shell space-y-8">
      <section className="rounded-3xl bg-[#24478a] p-6 text-white shadow-lg md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch">
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-200">
                <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('pages.sources.eyebrow')}
              </p>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#24478a] shadow-sm transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-80"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {t('pages.sources.refresh')}
              </button>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{t('pages.sources.title')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100">{t('pages.sources.subtitle')}</p>

            <dl className="mt-auto grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/20 pt-0 ring-1 ring-white/20 [&>div]:bg-[#2a4f96] sm:mt-7">
              {figures.map(({ key, value }) => (
                <div key={key} className="px-4 py-4">
                  <dd className="text-3xl font-extrabold leading-none tabular-nums">{value}</dd>
                  <dt className="mt-2 text-[11px] font-semibold leading-tight text-blue-100">{t(`pages.sources.figures.${key}`)}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/20">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.14em]">{t('pages.sources.healthTitle')}</h2>
              <span className="text-xs font-semibold text-blue-200">{sources.length}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="list">
              {sources.map((s) => {
                const h = healthOf(s);
                return (
                  <button
                    key={s._id}
                    type="button"
                    role="listitem"
                    onClick={() => jumpTo(s._id)}
                    title={`${s.name} : ${t(`pages.sources.health.${h}`)}`}
                    aria-label={`${s.name} : ${t(`pages.sources.health.${h}`)}`}
                    className={`h-8 w-8 rounded-lg transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${HEALTH_LOOK[h].cell}`}
                  />
                );
              })}
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {legend.map(({ key, count }) => (
                <li key={key} className="flex items-center gap-2 text-xs text-blue-100">
                  <span className={`h-2.5 w-2.5 flex-none rounded-sm ${HEALTH_LOOK[key].cell}`} aria-hidden="true" />
                  <span className="flex-1">{t(`pages.sources.health.${key}`)}</span>
                  <span className="font-bold tabular-nums text-white">{count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-blue-200">{t('pages.sources.healthHint')}</p>
          </div>
        </div>
      </section>

      {loading && sources.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
          ))}
        </div>
      ) : null}

      {groups.map((group) => {
        const GroupIcon = group.icon;
        return (
          <section key={group.id} className="space-y-4">
            <header className="flex items-center gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800 dark:text-blue-200">
                <GroupIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{t(`pages.sources.groups.${group.id}`)}</h2>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('pages.sources.sourcesCount', { count: group.items.length })}
                </p>
              </div>
              <span className="ml-2 h-px flex-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
            </header>
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {group.items.map((source) => (
                <SourceCard
                  key={source._id}
                  source={source}
                  expanded={expanded}
                  highlighted={focusId === source._id || flashId === source._id}
                  onToggleOpen={(id) => setExpanded((cur) => (cur === id ? null : id))}
                  onToggleEnabled={toggle}
                  onScan={scanOne}
                  scanning={scanningId === source._id}
                  isAdmin={isAdmin}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#24478a] text-white shadow-sm">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{t('pages.sources.allTitle')}</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('pages.sources.allSubtitle')}</p>
            </div>
          </div>
          <Link
            to="/opportunities"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#24478a] shadow-sm ring-1 ring-slate-200 transition hover:bg-[#24478a] hover:text-white dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-600"
          >
            {t('pages.sources.seeInOpportunities')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </header>
        <div className="p-4 md:p-5">
          {loading && opportunities.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t('pages.sources.loading')}</p>
          ) : opportunities.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-700">
              {t('pages.sources.listEmpty')}
            </p>
          ) : (
            <>
              <div className="space-y-2.5">
                {opportunities.slice(0, 20).map((opp) => (
                  <OfferRow key={opp._id} opp={opp} />
                ))}
              </div>
              {opportunities.length > 20 ? (
                <p className="mt-4 text-center text-xs font-medium text-slate-500">
                  {t('pages.sources.showing', { shown: 20, total: opportunities.length })}
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
