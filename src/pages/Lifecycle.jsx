import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ArrowRight, Eye, Loader2, Percent, Waypoints } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import FormModal, { btnGhost, btnPrimary } from '../components/ui/FormModal.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { announceApplicationStatus } from '../utils/businessNotifications.js';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const SUBMITTED = new Set(['submitted', 'pending', 'interview', 'won', 'rejected']);
const STATUS_ORDER = [
  ['application', 'draft'],
  ['application', 'submitted'],
  ['application', 'pending'],
  ['application', 'interview'],
  ['application', 'won'],
  ['application', 'rejected'],
  ['contract', 'en_attente'],
  ['contract', 'en_cours'],
  ['contract', 'gagne'],
  ['contract', 'termine'],
  ['contract', 'perdu']
];
const BAR_COLOR = {
  draft: '#94a3b8',
  submitted: '#d97706',
  pending: '#24478a',
  interview: '#4f46e5',
  won: '#059669',
  rejected: '#dc2626',
  en_attente: '#d97706',
  en_cours: '#24478a',
  gagne: '#059669',
  termine: '#0f766e',
  perdu: '#dc2626'
};
const btnDanger =
  'inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:opacity-60';

function stamp(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusLabel(t, kind, status) {
  if (status === 'archived') return t('lifecyclePage.archived');
  if (kind === 'contract') return t(`contractsPage.statuses.${status}`);
  return t(`lifecyclePage.appStatus.${status}`);
}

function humanError(error, fallback) {
  const raw = error?.response?.data?.message;
  if (typeof raw !== 'string') return fallback;
  const text = raw.trim();
  if (!text || text.length > 180) return fallback;
  if (/error\s*\d|exception|stack|econn|mongo|cast to|validation failed|status code/i.test(text)) return fallback;
  return text;
}

function DossierCard({ row, t }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <p className="truncate text-base font-extrabold text-slate-900 dark:text-white" title={row.title || ''}>
        {row.title || '—'}
      </p>
      <p className="mt-1 truncate text-sm text-slate-500" title={row.organization || ''}>
        {row.organization || '—'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={row.status}>{statusLabel(t, row.kind, row.status)}</StatusBadge>
        <span className="text-xs font-semibold text-slate-400">{t(`lifecyclePage.kind.${row.kind}`)}</span>
      </div>
    </div>
  );
}

export default function Lifecycle() {
  const { t, dateLocale } = useUiLocale();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [detail, setDetail] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [pendingAdvance, setPendingAdvance] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/lifecycle', { params: showArchived ? { archived: '1' } : {} });
      setRows(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (e) {
      setLoadError(humanError(e, t('lifecyclePage.loadFail')));
    } finally {
      setLoading(false);
    }
  }, [showArchived, t]);

  useEffect(() => {
    load();
  }, [load]);

  const analysis = useMemo(() => {
    const counts = new Map();
    for (const row of rows) {
      const key = `${row.kind}:${row.status}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const labels = STATUS_ORDER.map(([kind, status]) => statusLabel(t, kind, status));
    const statusBars = STATUS_ORDER.filter(([kind, status]) => counts.get(`${kind}:${status}`)).map(([kind, status]) => {
      const label = statusLabel(t, kind, status);
      const shared = labels.filter((item) => item === label).length > 1;
      return {
        key: `${kind}:${status}`,
        label: shared ? `${label} · ${t(`lifecyclePage.kind.${kind}`)}` : label,
        count: counts.get(`${kind}:${status}`),
        color: BAR_COLOR[status] || '#24478a'
      };
    });

    const months = new Map();
    for (const row of rows) {
      const date = row.updatedAt ? new Date(row.updatedAt) : null;
      if (!date || Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.set(key, (months.get(key) || 0) + 1);
    }
    const monthBars = [...months.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        label: new Intl.DateTimeFormat(dateLocale, { month: 'short', year: '2-digit' }).format(new Date(`${key}-01T12:00:00`)),
        count
      }));

    const submitted = rows.filter((row) => row.kind === 'application' && SUBMITTED.has(row.status));
    const won = submitted.filter((row) => row.status === 'won').length;
    return {
      statusBars,
      monthBars,
      conversion: submitted.length ? Math.round((won / submitted.length) * 100) : null,
      won,
      submitted: submitted.length
    };
  }, [rows, t, dateLocale]);

  const advance = async (row) => {
    if (!row?.next) return;
    setBusyId(row.id);
    try {
      await api.post(`/api/lifecycle/${row.kind}/${row.id}/advance`);
      if (row.kind === 'application') announceApplicationStatus({ _id: row.id, title: row.title }, row.next);
      toast.success(t('lifecyclePage.advanced'));
      setPendingAdvance(null);
      setDetail(null);
      await load();
    } catch (e) {
      toast.error(humanError(e, t('lifecyclePage.advanceFail')));
    } finally {
      setBusyId('');
    }
  };

  const archive = async () => {
    if (!pendingArchive) return;
    setBusyId(pendingArchive.id);
    try {
      await api.post(`/api/lifecycle/${pendingArchive.kind}/${pendingArchive.id}/archive`);
      toast.success(t('lifecyclePage.archivedDone'));
      setPendingArchive(null);
      setDetail(null);
      await load();
    } catch (e) {
      toast.error(humanError(e, t('lifecyclePage.archiveFail')));
    } finally {
      setBusyId('');
    }
  };

  const events = detail?.events || [];
  const onlyKnown = events.length > 0 && events.every((event) => event.recorded === false);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('lifecyclePage.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{t('lifecyclePage.subtitle')}</p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          {t('lifecyclePage.showArchived')}
        </label>
      </header>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100" role="alert">
          <p className="font-bold">{t('lifecyclePage.errorTitle')}</p>
          <p className="mt-1 text-xs font-medium leading-relaxed">{loadError}</p>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        <article className={`${CARD} p-5 xl:col-span-1`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('lifecyclePage.chartStatusTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('lifecyclePage.chartStatusHint')}</p>
          {loading ? (
            <div className="mt-4 h-52 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : analysis.statusBars.length === 0 ? (
            <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500 dark:border-slate-600">
              {t('lifecyclePage.chartEmpty')}
            </div>
          ) : (
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.statusBars} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(36,71,138,0.06)' }} />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={16}>
                    {analysis.statusBars.map((bar) => (
                      <Cell key={bar.key} fill={bar.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className={`${CARD} p-5`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('lifecyclePage.chartTimeTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('lifecyclePage.chartTimeHint')}</p>
          {loading ? (
            <div className="mt-4 h-52 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : analysis.monthBars.length < 2 ? (
            <div className="mt-4 flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-slate-500 dark:border-slate-600">
              {rows.length === 0 ? t('lifecyclePage.chartEmpty') : t('lifecyclePage.chartTimeEmpty')}
            </div>
          ) : (
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.monthBars} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(36,71,138,0.06)' }} />
                  <Bar dataKey="count" fill="#24478a" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="flex flex-col rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.14em] text-emerald-800 dark:text-emerald-300">
              {t('lifecyclePage.conversionTitle')}
            </p>
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Percent className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-5 text-4xl font-bold leading-none tracking-tight text-emerald-950 dark:text-emerald-50">
            {analysis.conversion == null ? '—' : `${analysis.conversion} %`}
          </p>
          <p className="mt-5 border-t border-emerald-200 pt-3 text-xs font-medium leading-relaxed text-emerald-800/80 dark:border-emerald-900 dark:text-emerald-300/80">
            {analysis.conversion == null
              ? t('lifecyclePage.conversionNone')
              : t('lifecyclePage.conversionOf', { won: analysis.won, total: analysis.submitted })}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-emerald-800/70 dark:text-emerald-300/70">{t('lifecyclePage.conversionHint')}</p>
        </article>
      </section>

      <section className={`${CARD} overflow-hidden`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{t('lifecyclePage.empty')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('lifecyclePage.emptyHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
                <col className="w-[14%]" />
                <col className="w-[132px]" />
              </colgroup>
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/60">
                <tr className="h-11">
                  {[
                    t('lifecyclePage.colTitle'),
                    t('lifecyclePage.colOrg'),
                    t('lifecyclePage.colStatus'),
                    t('lifecyclePage.colStage'),
                    t('lifecyclePage.colUpdated'),
                    t('lifecyclePage.colActions')
                  ].map((label) => (
                    <th key={label} className="px-4 text-left align-middle font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.kind}-${row.id}`} className="h-16 border-t border-slate-100 dark:border-slate-800">
                    <td className="overflow-hidden px-4 align-middle">
                      <p className="truncate font-semibold text-slate-900 dark:text-white" title={row.title || ''}>
                        {row.title || '—'}
                      </p>
                      <p className="truncate text-xs text-slate-400">{t(`lifecyclePage.kind.${row.kind}`)}</p>
                    </td>
                    <td className="overflow-hidden px-4 align-middle">
                      <p className="truncate text-slate-600 dark:text-slate-300" title={row.organization || ''}>
                        {row.organization || '—'}
                      </p>
                    </td>
                    <td className="px-4 align-middle">
                      <StatusBadge status={row.status}>{statusLabel(t, row.kind, row.status)}</StatusBadge>
                    </td>
                    <td className="px-4 align-middle">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100">
                          {statusLabel(t, row.kind, row.status)}
                        </span>
                        {row.next ? (
                          <>
                            <ArrowRight className="h-3.5 w-3.5 flex-none text-slate-400" aria-hidden="true" />
                            <span className="truncate text-slate-500">{statusLabel(t, row.kind, row.next)}</span>
                          </>
                        ) : (
                          <span className="truncate text-xs font-medium text-slate-400">{t('lifecyclePage.noNext')}</span>
                        )}
                      </div>
                    </td>
                    <td className="truncate px-4 align-middle text-slate-600 dark:text-slate-300">{stamp(row.updatedAt, dateLocale)}</td>
                    <td className="px-3 align-middle">
                      <div className="flex items-center gap-1">
                        <button type="button" title={t('lifecyclePage.view')} onClick={() => setDetail(row)} className="grid h-9 w-9 place-items-center rounded-xl text-[#24478a] transition hover:bg-[#eef3fb]">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={row.next ? t('lifecyclePage.advance') : t('lifecyclePage.noNext')}
                          disabled={!row.next || busyId === row.id}
                          onClick={() => setPendingAdvance(row)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title={t('lifecyclePage.archive')}
                          disabled={Boolean(row.archivedAt)}
                          onClick={() => setPendingArchive(row)}
                          className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail ? (
        <FormModal
          wide
          icon={Waypoints}
          title={t('lifecyclePage.detailTitle')}
          subtitle={t(`lifecyclePage.kind.${detail.kind}`)}
          onClose={() => setDetail(null)}
          closeLabel={t('lifecyclePage.close')}
          footer={
            <>
              <button type="button" onClick={() => setDetail(null)} className={btnGhost}>
                {t('lifecyclePage.close')}
              </button>
              <button type="button" disabled={!detail.next || busyId === detail.id} onClick={() => setPendingAdvance(detail)} className={btnPrimary}>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                {detail.next ? t('lifecyclePage.advance') : t('lifecyclePage.noNext')}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <h3 className="break-words text-xl font-extrabold leading-tight text-slate-900 dark:text-white">{detail.title || '—'}</h3>
              <p className="mt-1 break-words text-sm text-slate-500">{detail.organization || '—'}</p>
              <div className="mt-3">
                <StatusBadge status={detail.status}>{statusLabel(t, detail.kind, detail.status)}</StatusBadge>
              </div>
            </div>
            {events.length === 0 ? (
              <p className="text-sm text-slate-500">{t('lifecyclePage.noEvents')}</p>
            ) : (
              <ol className="space-y-0">
                {events.map((event, index) => (
                  <li key={`${event.status}-${event.at}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
                    {index < events.length - 1 ? (
                      <span className="absolute bottom-0 left-[15px] top-8 w-px bg-[#c9d8f1] dark:bg-slate-600" aria-hidden="true" />
                    ) : null}
                    <span
                      className={`relative z-10 mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full text-xs font-bold text-white ring-4 ring-white dark:ring-slate-900 ${
                        event.recorded === false ? 'bg-amber-400' : 'bg-[#24478a]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <StatusBadge status={event.status}>{statusLabel(t, detail.kind, event.status)}</StatusBadge>
                      <p className="mt-1 text-xs text-slate-500">{stamp(event.at, dateLocale)}</p>
                    </div>
                  </li>
                ))}
                {detail.next ? (
                  <li className="relative flex items-center gap-4 pt-2">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full border-2 border-dashed border-slate-300 text-slate-400" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-slate-500">{statusLabel(t, detail.kind, detail.next)}</p>
                      <p className="text-xs text-slate-400">{t('lifecyclePage.notYet')}</p>
                    </div>
                  </li>
                ) : null}
              </ol>
            )}
            {onlyKnown ? <p className="text-sm leading-relaxed text-slate-500">{t('lifecyclePage.knownOnly')}</p> : null}
            {detail.archivedAt ? (
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {t('lifecyclePage.archivedOn', { date: stamp(detail.archivedAt, dateLocale) })}
              </p>
            ) : null}
          </div>
        </FormModal>
      ) : null}

      {pendingArchive ? (
        <FormModal
          icon={Archive}
          title={t('lifecyclePage.archiveTitle')}
          subtitle={t('lifecyclePage.archiveHint')}
          onClose={() => setPendingArchive(null)}
          closeLabel={t('lifecyclePage.close')}
          footer={
            <>
              <button type="button" onClick={() => setPendingArchive(null)} className={btnGhost}>
                {t('lifecyclePage.close')}
              </button>
              <button type="button" disabled={busyId === pendingArchive.id} onClick={archive} className={btnDanger}>
                {busyId === pendingArchive.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                {t('lifecyclePage.archive')}
              </button>
            </>
          }
        >
          <DossierCard row={pendingArchive} t={t} />
        </FormModal>
      ) : null}

      {pendingAdvance ? (
        <FormModal
          icon={ArrowRight}
          title={t('lifecyclePage.advanceTitle')}
          subtitle={t('lifecyclePage.advanceHint')}
          onClose={() => setPendingAdvance(null)}
          closeLabel={t('lifecyclePage.close')}
          footer={
            <>
              <button type="button" onClick={() => setPendingAdvance(null)} className={btnGhost}>
                {t('lifecyclePage.close')}
              </button>
              <button type="button" disabled={!pendingAdvance.next || busyId === pendingAdvance.id} onClick={() => advance(pendingAdvance)} className={btnPrimary}>
                {busyId === pendingAdvance.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                {t('lifecyclePage.confirmAdvance')}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <DossierCard row={pendingAdvance} t={t} />
            {pendingAdvance.next ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <ArrowRight className="h-4 w-4 text-[#24478a]" aria-hidden="true" />
                {statusLabel(t, pendingAdvance.kind, pendingAdvance.next)}
              </p>
            ) : null}
          </div>
        </FormModal>
      ) : null}
    </div>
  );
}
