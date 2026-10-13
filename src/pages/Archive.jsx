import { useEffect, useMemo, useState } from 'react';
import {
  ArchiveRestore,
  ArrowUpDown,
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Eye,
  Globe,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  Tags,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import ScoreRing from '../components/ui/ScoreRing.jsx';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useOpportunities } from '../hooks/useOpportunities.js';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { scorePercent } from '../utils/opportunityUrgency.js';

const PAGE_SIZE = 20;
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
// One colour per platform: it is the spine of each card and the segment of the split bar
const PALETTE = ['#24478a', '#10b981', '#7c3aed', '#f59e0b', '#0f766e', '#ef4444', '#64748b'];
// Lighter versions of the same colours for the bar drawn on the blue banner
const PALETTE_ON_BLUE = ['#ffffff', '#6ee7b7', '#c4b5fd', '#fcd34d', '#5eead4', '#fca5a5', '#cbd5e1'];

// One colour per kind of offer: the bar on top of a card, its tag, and the split on the banner (lighter tone)
const CATEGORY_META = {
  formation: { color: '#059669', onBlue: '#6ee7b7' },
  formation_chauffeurs: { color: '#65a30d', onBlue: '#bef264' },
  consultance: { color: '#24478a', onBlue: '#ffffff' },
  inventaire: { color: '#d97706', onBlue: '#fcd34d' },
  inventaire_actifs: { color: '#ea580c', onBlue: '#fdba74' },
  inventaire_general: { color: '#ca8a04', onBlue: '#fef08a' },
  etude_marche: { color: '#7c3aed', onBlue: '#c4b5fd' },
  assistance: { color: '#0f766e', onBlue: '#5eead4' }
};
const NO_CATEGORY = { color: '#64748b', onBlue: '#cbd5e1' };
const categoryMeta = (category) => CATEGORY_META[category] || NO_CATEGORY;

const isExpired = (opp) => opp.expiredReason === 'deadline_passed';
const archivedDate = (opp) => {
  const d = new Date(opp.updatedAt || opp.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
};
const initialsOf = (name) =>
  String(name || '?')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase() || '?';

const fmtDate = (d, dateLocale) => d.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

function PlatformTag({ name, color, t }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2.5">
      <span
        className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[11px] font-black tracking-tight text-white"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initialsOf(name)}
      </span>
      <span className="min-w-0 break-words text-[13px] font-extrabold leading-tight text-slate-800 dark:text-slate-100">{name || t('archivePage.notAvailable')}</span>
    </span>
  );
}

function ReasonTag({ expired, t }) {
  return (
    <span
      className={`inline-flex flex-none rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        expired ? 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
      }`}
    >
      {expired ? t('archivePage.expired') : t('archivePage.archived')}
    </span>
  );
}

/** One line of the strip inside a card: a small heading and its value. */
function Fact({ icon: Icon, label, tone, chip, children }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5 sm:block">
      <dt className="flex flex-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
        <span className={`grid h-5 w-5 flex-none place-items-center rounded-md ${chip}`}>
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
        {label}
      </dt>
      <dd className={`min-w-0 break-words text-right text-[13px] font-bold leading-snug sm:mt-1 sm:text-left ${tone}`}>{children}</dd>
    </div>
  );
}

/**
 * An archived offer as a card. Every card has the same four bands so a row of them reads evenly:
 * platform and reason, then the offer, then location / deadline / archive date, then score and actions.
 */
function ArchiveCard({ opp, color, isAdmin, busy, selected, onToggle, onOpen, onRestore, onDelete, t, dateLocale }) {
  const pct = scorePercent(opp);
  const expired = isExpired(opp);
  const date = archivedDate(opp);
  const deadline = parseDate(opp.deadline);
  const place = opp.ville || opp.city || t('archivePage.region');
  const na = t('archivePage.notAvailable');
  const cat = categoryMeta(opp.category);
  const catLabel = opp.category ? (t(`opportunities.${opp.category}`).startsWith('opportunities.') ? opp.category.replace(/_/g, ' ') : t(`opportunities.${opp.category}`)) : t('archivePage.categoryNone');

  return (
    <li className="flex">
      <article
        className={`flex w-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition dark:bg-slate-900 ${
          selected ? 'border-[#24478a] ring-2 ring-[#24478a]/30' : 'border-slate-200 hover:shadow-md dark:border-slate-700'
        }`}
      >
        <span className="h-1.5 w-full flex-none" style={{ background: cat.color }} aria-hidden="true" />
        <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800" style={{ background: `${cat.color}12` }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(opp._id)}
            aria-label={t('archivePage.selectRow', { title: opp.title })}
            className="h-4 w-4 flex-none cursor-pointer rounded border-slate-300 accent-[#24478a]"
          />
          <span className="min-w-0 flex-1">
            <PlatformTag name={opp.platform} color={color} t={t} />
          </span>
          <ReasonTag expired={expired} t={t} />
        </header>

        <div className="flex flex-1 flex-col p-5">
          <span
            className="mb-3 inline-flex w-fit max-w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold"
            style={{ background: `${cat.color}1a`, color: cat.color }}
          >
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: cat.color }} aria-hidden="true" />
            <span className="min-w-0 break-words">{catLabel}</span>
          </span>
          <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">
            <button
              type="button"
              onClick={() => onOpen(opp)}
              className={`block w-full break-words rounded text-left transition hover:text-[#24478a] hover:underline dark:hover:text-blue-200 ${FOCUS}`}
            >
              {opp.title}
            </button>
          </h3>
          <p className="mt-2 flex items-start gap-2 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
            <Building2 className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
            <span className="min-w-0 break-words">{opp.organization || na}</span>
          </p>

          <div className="mt-auto pt-5">
            <dl className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-200 dark:divide-slate-700 dark:bg-slate-800/60 dark:ring-slate-700">
              <Fact icon={MapPin} label={t('archivePage.labelPlace')} chip="bg-teal-100 text-teal-700" tone="text-teal-800 dark:text-teal-200">
                {place}
              </Fact>
              <Fact icon={CalendarClock} label={t('archivePage.labelDeadline')} chip={!deadline ? 'bg-slate-200 text-slate-500' : expired ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'} tone={!deadline ? 'text-slate-500 dark:text-slate-400' : expired ? 'text-red-700 dark:text-red-300' : 'text-indigo-700 dark:text-indigo-300'}>
                {deadline ? fmtDate(deadline, dateLocale) : na}
              </Fact>
              <Fact icon={CalendarDays} label={t('archivePage.labelArchived')} chip="bg-amber-100 text-amber-700" tone="text-slate-700 dark:text-slate-200">
                {date ? fmtDate(date, dateLocale) : na}
              </Fact>
            </dl>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5" title={pct > 0 ? t('archivePage.score', { score: pct }) : undefined}>
            {pct > 0 ? <ScoreRing value={pct} size={38} stroke={4} /> : <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 dark:bg-slate-700">{na}</span>}
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('archivePage.colScore')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRestore(opp)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#24478a] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
              {t('archivePage.restore')}
            </button>
            <button
              type="button"
              title={t('archivePage.consult')}
              aria-label={t('archivePage.consult')}
              onClick={() => onOpen(opp)}
              className={`grid h-8 w-8 place-items-center rounded-lg border border-[#24478a]/40 bg-white text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>
            {isAdmin ? (
              <button
                type="button"
                title={t('archivePage.remove')}
                aria-label={t('archivePage.remove')}
                onClick={() => onDelete(opp)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 dark:border-slate-600 dark:bg-slate-900"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </footer>
      </article>
    </li>
  );
}

export default function Archive() {
  const { t, dateLocale } = useUiLocale();
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [sort, setSort] = useState('recent');
  const [reason, setReason] = useState('all');
  const [restoring, setRestoring] = useState(null);
  const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(() => new Set());
  const params = useMemo(() => ({ archived: true, limit: 100 }), []);
  const { items, total, loading, reload } = useOpportunities(params);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, platform, sort, reason]);

  const platformCounts = useMemo(() => {
    const map = new Map();
    for (const o of items) {
      if (o.platform) map.set(o.platform, (map.get(o.platform) || 0) + 1);
    }
    return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [items]);

  const categoryCounts = useMemo(() => {
    const map = new Map();
    for (const o of items) {
      const key = o.category || '';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()]
      .map(([key, count]) => {
        const named = key ? t(`opportunities.${key}`) : '';
        return {
          key: key || 'none',
          count,
          onBlue: categoryMeta(key).onBlue,
          label: !key ? t('archivePage.categoryNone') : named.startsWith('opportunities.') ? key.replace(/_/g, ' ') : named
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [items, t]);

  const colorOf = useMemo(() => {
    const map = new Map(platformCounts.map((p, i) => [p.name, i % PALETTE.length]));
    return (name) => PALETTE[map.get(name) ?? PALETTE.length - 1];
  }, [platformCounts]);

  const reasonCounts = useMemo(() => {
    const expired = items.filter(isExpired).length;
    return { all: items.length, expired, manual: items.length - expired };
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) => o.title?.toLowerCase().includes(q) || o.organization?.toLowerCase().includes(q) || o.platform?.toLowerCase().includes(q)
      );
    }
    if (platform) list = list.filter((o) => o.platform === platform);
    if (reason === 'expired') list = list.filter(isExpired);
    if (reason === 'manual') list = list.filter((o) => !isExpired(o));
    if (sort === 'recent') list.sort((a, b) => (archivedDate(b) || 0) - (archivedDate(a) || 0));
    else if (sort === 'title') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    else if (sort === 'score') list.sort((a, b) => scorePercent(b) - scorePercent(a));
    return list;
  }, [items, search, platform, sort, reason]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = items.filter((o) => {
      const d = archivedDate(o);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return {
      total: total || items.length,
      thisMonth,
      platforms: platformCounts.length,
      withDeadline: items.filter((o) => o.deadline).length
    };
  }, [items, total, platformCounts]);

  const selectedRows = useMemo(() => items.filter((o) => selected.has(o._id)), [items, selected]);
  const shown = filtered.slice(0, visible);
  const remaining = Math.max(0, filtered.length - visible);
  const allShownSelected = shown.length > 0 && shown.every((o) => selected.has(o._id));
  const toggleAllShown = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allShownSelected) shown.forEach((o) => next.delete(o._id));
      else shown.forEach((o) => next.add(o._id));
      return next;
    });
  const filtersActive = Boolean(search.trim() || platform || reason !== 'all');

  // With the most recent first, offers are gathered under the month they were archived in
  const groups = useMemo(() => {
    if (sort !== 'recent') return [{ id: 'all', label: '', rows: shown }];
    const map = new Map();
    for (const opp of shown) {
      const d = archivedDate(opp);
      const id = d ? `${d.getFullYear()}-${d.getMonth()}` : 'unknown';
      if (!map.has(id)) {
        const label = d ? d.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }) : t('archivePage.monthUnknown');
        map.set(id, { id, label: label.charAt(0).toUpperCase() + label.slice(1), rows: [] });
      }
      map.get(id).rows.push(opp);
    }
    return [...map.values()];
  }, [shown, sort, dateLocale, t]);

  const resetFilters = () => {
    setSearch('');
    setPlatform('');
    setReason('all');
  };

  const restoreOne = async (opp) => {
    setRestoring(opp._id);
    try {
      await api.patch(`/api/opportunities/${opp._id}/unarchive`);
      toast.success(t('archivePage.toastRestored'));
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || t('archivePage.toastRestoreFail'));
    } finally {
      setRestoring(null);
    }
  };

  const restoreMany = async (rows) => {
    if (!rows.length) return;
    setRestoring('bulk');
    try {
      await Promise.all(rows.map((o) => api.patch(`/api/opportunities/${o._id}/unarchive`)));
      toast.success(t('archivePage.toastRestoredMany', { count: rows.length }));
    } catch {
      toast.error(t('archivePage.toastPartial'));
    } finally {
      setSelected(new Set());
      setRestoring(null);
      reload();
    }
  };

  const restoreAll = () => {
    setConfirmRestoreAll(false);
    restoreMany(filtered);
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const askDelete = (opp) => {
    if (!isAdmin) {
      toast.error(t('archivePage.toastAdminOnly'));
      return;
    }
    setDeleteTarget(opp);
  };

  const confirmDelete = async () => {
    const opp = deleteTarget;
    setDeleteTarget(null);
    if (!opp) return;
    try {
      await api.delete(`/api/opportunities/${opp._id}`);
      toast.success(t('archivePage.toastDeleted'));
      reload();
    } catch (e) {
      toast.error(e.response?.data?.message || t('archivePage.toastDeleteFail'));
    }
  };

  const reasonOptions = [
    ['all', t('archivePage.reasonAll')],
    ['expired', t('archivePage.reasonExpired')],
    ['manual', t('archivePage.reasonManual')]
  ];

  return (
    <div className="page-shell space-y-6 pb-10">
      {/* Banner: what the archive holds, and how it splits across platforms */}
      <section className="relative overflow-hidden rounded-3xl bg-[#24478a] p-6 text-white shadow-sm md:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full border-[26px] border-white/5" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-center">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
                  <ArchiveRestore className="h-7 w-7" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('sidebar.groups.data')}</p>
                  <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{t('pages.archive.title')}</h1>
                </div>
              </div>
              <button
                type="button"
                onClick={reload}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-[#24478a] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {t('archivePage.refresh')}
              </button>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100">{t('pages.archive.subtitle')}</p>
            <dl className="mt-6 grid grid-cols-3 gap-2.5">
              {[
                [t('archivePage.thisMonth'), stats.thisMonth, CalendarDays, 'bg-amber-300 text-amber-950'],
                [t('archivePage.platforms'), stats.platforms, Globe, 'bg-violet-300 text-violet-950'],
                [t('archivePage.withDeadline'), stats.withDeadline, CalendarClock, 'bg-emerald-300 text-emerald-950']
              ].map(([label, value, StatIcon, chip]) => (
                <div key={label} className="rounded-2xl bg-white/10 px-3 py-3 sm:px-4">
                  <span className={`mb-2.5 grid h-8 w-8 place-items-center rounded-lg ${chip}`}>
                    <StatIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <dd className="text-2xl font-extrabold leading-none tabular-nums">{value}</dd>
                  <dt className="mt-1.5 break-words text-[11px] font-semibold leading-snug text-blue-100 sm:text-xs">{label}</dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl bg-white/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('archivePage.total')}</p>
            <p className="mt-2 text-6xl font-extrabold leading-none tabular-nums">{stats.total}</p>
            <p className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
              <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              {t('archivePage.composition')}
            </p>
            {platformCounts.length ? (
              <>
                <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/15" role="img" aria-label={t('archivePage.composition')}>
                  {platformCounts.map((p, i) => (
                    <span
                      key={p.name}
                      title={`${p.name} : ${p.count}`}
                      className="h-full"
                      style={{ width: `${(p.count / items.length) * 100}%`, background: PALETTE_ON_BLUE[i % PALETTE_ON_BLUE.length] }}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {platformCounts.map((p, i) => (
                    <li key={p.name} className="flex items-center gap-1.5 text-xs font-semibold text-blue-50">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: PALETTE_ON_BLUE[i % PALETTE_ON_BLUE.length] }} aria-hidden="true" />
                      {p.name}
                      <span className="tabular-nums text-blue-200">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-xs text-blue-100">{t('archivePage.compositionNone')}</p>
            )}

            {categoryCounts.length ? (
              <>
                <p className="mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
                  <Tags className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('archivePage.byCategory')}
                </p>
                <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-white/15" role="img" aria-label={t('archivePage.byCategory')}>
                  {categoryCounts.map((c) => (
                    <span key={c.key} title={`${c.label} : ${c.count}`} className="h-full" style={{ width: `${(c.count / items.length) * 100}%`, background: c.onBlue }} />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {categoryCounts.map((c) => (
                    <li key={c.key} className="flex items-center gap-1.5 text-xs font-semibold text-blue-50">
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: c.onBlue }} aria-hidden="true" />
                      {c.label}
                      <span className="tabular-nums text-blue-200">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className={`${CARD} space-y-4 p-4 md:p-5`}>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_13rem]">
          <label className="relative block min-w-0">
            <span className="sr-only">{t('archivePage.searchPlaceholder')}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('archivePage.searchPlaceholder')}
              className="h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <Dropdown
            label={t('archivePage.platformLabel')}
            icon={Globe}
            value={platform}
            defaultValue=""
            onChange={setPlatform}
            options={[{ value: '', label: t('archivePage.allPlatforms') }, ...platformCounts.map((p) => ({ value: p.name, label: p.name, hint: String(p.count) }))]}
          />
          <Dropdown
            label={t('archivePage.sortLabel')}
            icon={ArrowUpDown}
            value={sort}
            defaultValue="recent"
            onChange={setSort}
            options={[
              { value: 'recent', label: t('archivePage.sortRecent') },
              { value: 'title', label: t('archivePage.sortTitle') },
              { value: 'score', label: t('archivePage.sortScore') }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="group">
            {reasonOptions.map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={reason === id}
                onClick={() => setReason(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${FOCUS} ${
                  reason === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                <span className={`h-2 w-2 flex-none rounded-full ${id === 'expired' ? 'bg-red-400' : id === 'manual' ? 'bg-amber-400' : reason === id ? 'bg-white' : 'bg-[#24478a]'}`} aria-hidden="true" />
                {label}
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${reason === id ? 'bg-white/20' : 'bg-slate-300/70 dark:bg-slate-600'}`}>{reasonCounts[id]}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('archivePage.results', { count: filtered.length, total: stats.total })}</p>
            {filtered.length > 0 ? (
              <button
                type="button"
                disabled={restoring === 'bulk'}
                onClick={() => setConfirmRestoreAll(true)}
                className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
              >
                {restoring === 'bulk' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" aria-hidden="true" />}
                {t('archivePage.restoreAll', { count: filtered.length })}
              </button>
            ) : null}
          </div>
        </div>
        {items.length < stats.total ? <p className="text-xs text-slate-500 dark:text-slate-400">{t('archivePage.partial', { shown: items.length, total: stats.total })}</p> : null}
      </section>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {t('archivePage.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
            <ArchiveRestore className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{filtersActive ? t('archivePage.emptyFiltered') : t('archivePage.emptyTitle')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{filtersActive ? '' : t('archivePage.emptyText')}</p>
          {filtersActive ? (
            <button
              type="button"
              onClick={resetFilters}
              className={`mt-4 rounded-xl border border-[#24478a] px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:text-blue-200 ${FOCUS}`}
            >
              {t('archivePage.reset')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          {/* selection bar: turns blue as soon as something is ticked */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-sm transition-colors md:px-5 ${
              selectedRows.length ? 'bg-[#24478a] text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <label className="flex cursor-pointer items-center gap-3 text-sm font-bold">
              <input type="checkbox" checked={allShownSelected} onChange={toggleAllShown} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#24478a]" />
              {selectedRows.length ? t('archivePage.selectedCount', { count: selectedRows.length }) : t('archivePage.selectAll')}
            </label>
            {selectedRows.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="rounded-lg px-3 py-2 text-xs font-bold text-blue-100 transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                >
                  {t('archivePage.clearSelection')}
                </button>
                <button
                  type="button"
                  disabled={restoring === 'bulk'}
                  onClick={() => restoreMany(selectedRows)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-[#24478a] shadow-sm transition hover:bg-blue-50 disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
                >
                  {restoring === 'bulk' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                  {t('archivePage.restoreSelected')}
                </button>
              </div>
            ) : null}
          </div>

          {groups.map((group) => (
            <section key={group.id}>
              {group.label ? (
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200">
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{group.label}</h2>
                  <span className="rounded-full bg-[#e3ebf9] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#24478a] dark:bg-slate-700 dark:text-blue-200">
                    {t('archivePage.monthCount', { count: group.rows.length })}
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
                </div>
              ) : null}
              <ul className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {group.rows.map((opp) => (
                  <ArchiveCard
                    key={opp._id}
                    opp={opp}
                    color={colorOf(opp.platform)}
                    isAdmin={isAdmin}
                    busy={restoring === opp._id || restoring === 'bulk'}
                    selected={selected.has(opp._id)}
                    onToggle={toggleOne}
                    onOpen={setModal}
                    onRestore={restoreOne}
                    onDelete={askDelete}
                    t={t}
                    dateLocale={dateLocale}
                  />
                ))}
              </ul>
            </section>
          ))}
          {remaining > 0 ? (
            <button
              type="button"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              {t('archivePage.showMore', { count: Math.min(PAGE_SIZE, remaining) })}
            </button>
          ) : null}
        </div>
      )}

      {confirmRestoreAll ? (
        <ConfirmDialog
          icon={RotateCcw}
          title={t('archivePage.confirmAllTitle')}
          text={t('archivePage.confirmAllText', { count: filtered.length })}
          confirmLabel={t('archivePage.confirmRestore')}
          cancelLabel={t('archivePage.cancel')}
          closeLabel={t('archivePage.close')}
          onConfirm={restoreAll}
          onClose={() => setConfirmRestoreAll(false)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="red"
          icon={Trash2}
          title={t('archivePage.confirmDeleteTitle')}
          text={t('archivePage.confirmDeleteText')}
          confirmLabel={t('archivePage.confirmDelete')}
          cancelLabel={t('archivePage.cancel')}
          closeLabel={t('archivePage.close')}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      {modal ? <OpportunityModal opp={modal} onClose={() => setModal(null)} onCreated={reload} /> : null}
    </div>
  );
}
