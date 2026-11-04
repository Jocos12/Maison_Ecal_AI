import { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import Dropdown from '../components/ui/Dropdown.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const ACTIONS = ['create', 'update', 'delete', 'archive', 'status_change', 'application_sent'];
const ENTITIES = ['contract', 'application', 'user'];

function stamp(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function shown(t, field, value) {
  if (value == null || value === '') return '—';
  if (field === 'status') {
    const contract = t(`contractsPage.statuses.${value}`);
    if (contract !== `contractsPage.statuses.${value}`) return contract;
    const app = t(`lifecyclePage.appStatus.${value}`);
    if (app !== `lifecyclePage.appStatus.${value}`) return app;
  }
  if (field === 'archived') return t('auditPage.archived');
  if (field === 'password') return t('auditPage.passwordChanged');
  if (field === 'isApproved' || field === 'isVerified') return value === true ? t('auditPage.yes') : t('auditPage.no');
  if (field === 'type') {
    const label = t(`contractsPage.types.${value}`);
    if (label !== `contractsPage.types.${value}`) return label;
  }
  return String(value);
}

export default function AuditJournal() {
  const { t, dateLocale } = useUiLocale();
  const { user } = useApp();
  const isAdmin = Boolean(user) && ['Admin', 'admin'].includes(user.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/audit', {
        params: {
          ...(action ? { action } : {}),
          ...(actor ? { actor } : {}),
          ...(entity ? { entity } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(q.trim() ? { q: q.trim() } : {})
        }
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.response?.data?.message || t('auditPage.loadFail'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, action, actor, entity, from, to, q, t]);

  useEffect(() => {
    const timer = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [load, q]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
        <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{t('admin.accessDenied')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('admin.accessDeniedHint')}</p>
      </div>
    );
  }

  const field = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('auditPage.title')}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t('auditPage.subtitle')}</p>
      </header>

      <section className={`${CARD} p-4`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Dropdown
            label={t('auditPage.colAction')}
            value={action}
            onChange={setAction}
            options={[{ value: '', label: t('auditPage.allActions') }, ...ACTIONS.map((value) => ({ value, label: t(`auditPage.actions.${value}`) }))]}
          />
          <Dropdown
            label={t('auditPage.colAuthor')}
            value={actor}
            onChange={setActor}
            options={[
              { value: '', label: t('auditPage.allAuthors') },
              { value: 'human', label: t('auditPage.human') },
              { value: 'agent', label: t('auditPage.agent') }
            ]}
          />
          <Dropdown
            label={t('auditPage.colEntity')}
            value={entity}
            onChange={setEntity}
            options={[{ value: '', label: t('auditPage.allEntities') }, ...ENTITIES.map((value) => ({ value, label: t(`auditPage.entities.${value}`) }))]}
          />
          <label className="text-xs font-semibold text-slate-500">
            {t('auditPage.from')}
            <input className={field} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {t('auditPage.to')}
            <input className={field} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {t('auditPage.search')}
            <input className={field} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('auditPage.searchHint')} />
          </label>
        </div>
      </section>

      <section className={`${CARD} overflow-hidden`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{t('auditPage.empty')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('auditPage.emptyHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[14%]" />
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[26%]" />
              </colgroup>
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/60">
                <tr className="h-11">
                  {[t('auditPage.colWhen'), t('auditPage.colAction'), t('auditPage.colEntity'), t('auditPage.colAuthor'), t('auditPage.colChange')].map((label) => (
                    <th key={label} className="px-4 align-middle font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="h-16 border-t border-slate-100 dark:border-slate-800">
                    <td className="truncate px-4 align-middle text-slate-600 dark:text-slate-300">{stamp(row.at, dateLocale)}</td>
                    <td className="px-4 align-middle">
                      <span className="inline-flex rounded-lg bg-[#e3ebf9] px-2.5 py-1 text-xs font-bold text-[#24478a] ring-1 ring-[#c9d8f1]">
                        {t(`auditPage.actions.${row.action}`)}
                      </span>
                    </td>
                    <td className="overflow-hidden px-4 align-middle">
                      <p className="truncate font-semibold text-slate-900 dark:text-white" title={row.entityLabel}>{row.entityLabel || '—'}</p>
                      <p className="truncate text-xs text-slate-400">{t(`auditPage.entities.${row.entityType}`)}</p>
                    </td>
                    <td className="overflow-hidden px-4 align-middle">
                      <p className="flex min-w-0 items-center gap-2">
                        {row.actorType === 'agent' ? (
                          <Bot className="h-4 w-4 flex-none text-[#24478a]" aria-hidden="true" />
                        ) : (
                          <UserRound className="h-4 w-4 flex-none text-slate-500" aria-hidden="true" />
                        )}
                        <span className="truncate font-semibold text-slate-800 dark:text-slate-100" title={row.authorLabel}>{row.authorLabel}</span>
                      </p>
                      {row.actorType === 'agent' ? (
                        <p className="mt-0.5 truncate pl-6 text-xs text-slate-400">{t(`auditPage.channels.${row.channel}`)}</p>
                      ) : null}
                    </td>
                    <td className="overflow-hidden px-4 align-middle text-slate-600 dark:text-slate-300">
                      {row.changes?.length ? (
                        <p className="truncate" title={row.changes.map((change) => `${change.field}: ${shown(t, change.field, change.from)} → ${shown(t, change.field, change.to)}`).join(' · ')}>
                          {row.changes.map((change) => `${t(`auditPage.fields.${change.field}`)} : ${shown(t, change.field, change.from)} → ${shown(t, change.field, change.to)}`).join(' · ')}
                        </p>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
