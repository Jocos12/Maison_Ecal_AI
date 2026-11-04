import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  CalendarRange,
  Check,
  CircleDollarSign,
  ClipboardList,
  Copy,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  Percent,
  Plus,
  ScrollText,
  StickyNote,
  Trash2,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import FormModal, { btnGhost, btnPrimary, Field, fieldClass, InfoRow } from '../components/ui/FormModal.jsx';
import StatusBadge from '../components/ui/StatusBadge.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { announceContractDeadlines } from '../utils/businessNotifications.js';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const TYPES = ['appel_offres', 'emploi', 'prestation', 'consultance'];
const STATUSES = ['en_cours', 'gagne', 'termine', 'perdu', 'en_attente'];
const EMPTY_FORM = {
  title: '',
  client: '',
  type: 'prestation',
  status: 'en_attente',
  amount: '',
  startDate: '',
  endDate: '',
  notes: ''
};

function day(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function money(value, locale) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(value));
}

export default function Contracts() {
  const { t, dateLocale } = useUiLocale();
  const { user } = useApp();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState('all');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState({ key: 'startDate', dir: 'desc' });
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const filters = useMemo(() => ({ owner, status, type, from, to }), [owner, status, type, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        owner,
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {})
      };
      const [listRes, statsRes] = await Promise.all([
        api.get('/api/contracts', { params }),
        api.get('/api/contracts/stats', { params })
      ]);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setStats(statsRes.data);
    } catch (e) {
      toast.error(e.response?.data?.message || t('contractsPage.saveFail'));
    } finally {
      setLoading(false);
    }
  }, [owner, status, type, from, to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const toggleSort = (key) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      title: row.title || '',
      client: row.client || '',
      type: row.type,
      status: row.status,
      amount: row.amount ?? '',
      startDate: day(row.startDate),
      endDate: day(row.endDate),
      notes: row.notes || ''
    });
    setModal({ mode: 'edit', id: row._id });
  };

  const openView = (row) => setModal({ mode: 'view', row });

  const focusId = searchParams.get('id');
  const openedFromLink = useRef(null);
  useEffect(() => {
    if (!focusId || !rows.length || openedFromLink.current === focusId) return;
    const row = rows.find((item) => String(item._id) === focusId);
    if (!row) return;
    openedFromLink.current = focusId;
    openView(row);
  }, [focusId, rows]);

  const save = async () => {
    if (!form.title.trim() || !form.client.trim() || !form.type) {
      toast.error(t('contractsPage.required'));
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, amount: form.amount === '' ? null : Number(form.amount) };
      const { data } = modal.mode === 'edit'
        ? await api.put(`/api/contracts/${modal.id}`, payload)
        : await api.post('/api/contracts', payload);
      announceContractDeadlines(data);
      toast.success(t('contractsPage.saved'));
      setModal(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('contractsPage.saveFail'));
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (row) => {
    try {
      await api.post(`/api/contracts/${row._id}/duplicate`);
      toast.success(t('contractsPage.duplicated'));
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('contractsPage.saveFail'));
    }
  };

  const remove = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await api.delete(`/api/contracts/${pendingDelete._id}`);
      toast.success(t('contractsPage.deleted'));
      setPendingDelete(null);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('contractsPage.saveFail'));
    } finally {
      setBusy(false);
    }
  };

  const ask = async () => {
    const text = question.trim();
    if (!text) return;
    const intent = text.toLowerCase();
    if (/supprim|effac|modifi/.test(intent)) {
      const hit = rows.find((row) => intent.includes(String(row.title || '').toLowerCase().slice(0, 18)));
      if (/supprim|effac/.test(intent)) {
        if (hit) setPendingDelete(hit);
        setAnswer(
          hit
            ? `Je prépare la suppression de « ${hit.title} ». Confirmez dans la fenêtre : rien n'est effacé avant.`
            : 'Précisez le titre du contrat. Je ne supprime rien sans votre confirmation.'
        );
        return;
      }
      if (hit) openEdit(hit);
      setAnswer(
        hit
          ? `Le formulaire de « ${hit.title} » est ouvert. Rien n'est modifié tant que vous n'enregistrez pas.`
          : 'Précisez le titre. Je n’ouvre la modification qu’après l’avoir identifié, et rien n’est enregistré tout seul.'
      );
      return;
    }
    setAsking(true);
    try {
      const { data } = await api.post('/api/contracts/ask', { question: text, ...filters });
      setAnswer(data.reply || '');
    } catch (e) {
      toast.error(e.response?.data?.message || t('contractsPage.saveFail'));
    } finally {
      setAsking(false);
    }
  };

  const typeOptions = [
    { value: '', label: t('contractsPage.allTypes') },
    ...TYPES.map((value) => ({ value, label: t(`contractsPage.types.${value}`) }))
  ];
  const statusOptions = [
    { value: '', label: t('contractsPage.allStatuses') },
    ...STATUSES.map((value) => ({ value, label: t(`contractsPage.statuses.${value}`) }))
  ];
  const field =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('contractsPage.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('contractsPage.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b3a73]"
        >
          <Plus className="h-4 w-4" />
          {t('contractsPage.new')}
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t('contractsPage.total'),
            value: stats ? stats.total : '—',
            hint: t('contractsPage.hintTotal'),
            icon: ScrollText,
            card: 'border-[#c9d8f1] bg-[#eaf0fb] dark:border-slate-600 dark:bg-slate-800/60',
            tile: 'bg-[#24478a] text-white',
            labelTone: 'text-[#24478a] dark:text-blue-200',
            number: 'text-[#0e1c33] dark:text-white',
            hintTone: 'text-[#24478a]/80 dark:text-blue-200/80'
          },
          {
            label: t('contractsPage.wonMine'),
            value: stats ? money(stats.wonAmountMine, dateLocale) : '—',
            hint: t('contractsPage.hintWon'),
            icon: CircleDollarSign,
            card: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30',
            tile: 'bg-emerald-600 text-white',
            labelTone: 'text-emerald-800 dark:text-emerald-300',
            number: 'text-emerald-950 dark:text-emerald-50',
            hintTone: 'text-emerald-800/80 dark:text-emerald-300/80'
          },
          {
            label: t('contractsPage.rate'),
            value: stats?.successRate == null ? t('contractsPage.rateNone') : `${stats.successRate} %`,
            hint: t('contractsPage.hintRate'),
            icon: Percent,
            card: 'border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30',
            tile: 'bg-teal-600 text-white',
            labelTone: 'text-teal-800 dark:text-teal-300',
            number: 'text-teal-950 dark:text-teal-50',
            hintTone: 'text-teal-800/80 dark:text-teal-300/80'
          },
          {
            label: t('contractsPage.inProgress'),
            value: stats ? stats.inProgress : '—',
            hint: t('contractsPage.hintProgress'),
            icon: ClipboardList,
            card: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30',
            tile: 'bg-amber-500 text-white',
            labelTone: 'text-amber-800 dark:text-amber-300',
            number: 'text-amber-950 dark:text-amber-50',
            hintTone: 'text-amber-800/80 dark:text-amber-300/80'
          }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`flex flex-col rounded-2xl border p-5 shadow-sm ${card.card}`}>
              <div className="flex items-start justify-between gap-3">
                <p className={`text-[11px] font-bold uppercase leading-snug tracking-[0.14em] ${card.labelTone}`}>{card.label}</p>
                <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl shadow-sm ${card.tile}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className={`mt-5 text-3xl font-bold leading-none tracking-tight tabular-nums ${card.number}`}>{card.value}</p>
              <p className={`mt-5 border-t border-black/5 pt-3 text-xs font-medium dark:border-white/10 ${card.hintTone}`}>{card.hint}</p>
            </article>
          );
        })}
      </section>

      <section className={`${CARD} p-4`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{t('contractsPage.filters')}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Dropdown
            label={t('contractsPage.colOwner')}
            value={owner}
            defaultValue="all"
            onChange={setOwner}
            options={[
              { value: 'all', label: t('contractsPage.all') },
              { value: 'me', label: t('contractsPage.mine') }
            ]}
          />
          <Dropdown label={t('contractsPage.colStatus')} value={status} onChange={setStatus} options={statusOptions} />
          <Dropdown label={t('contractsPage.colType')} value={type} onChange={setType} options={typeOptions} />
          <label className="text-xs font-semibold text-slate-500">
            {t('contractsPage.from')}
            <input className={field} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            {t('contractsPage.to')}
            <input className={field} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.8fr)]">
        <section className={`${CARD} overflow-hidden`}>
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{t('contractsPage.empty')}</p>
              <p className="mt-1 text-sm text-slate-500">{t('contractsPage.emptyHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    {[
                      ['title', t('contractsPage.colTitle')],
                      ['client', t('contractsPage.colClient')],
                      ['status', t('contractsPage.colStatus')],
                      ['amount', t('contractsPage.colAmount')],
                      ['startDate', t('contractsPage.colDate')],
                      ['ownerName', t('contractsPage.colOwner')]
                    ].map(([key, label]) => (
                      <th key={key} className="px-4 py-3.5 text-left font-bold">
                        <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-[#24478a]">
                          {label}
                          {sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-left font-bold">{t('contractsPage.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row._id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="max-w-[16rem] px-4 py-3.5 font-semibold text-slate-900 dark:text-white">{row.title}</td>
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{row.client}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status}>{t(`contractsPage.statuses.${row.status}`)}</StatusBadge>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">{money(row.amount, dateLocale)}</td>
                      <td className="px-4 py-3.5">{day(row.startDate) || '—'}</td>
                      <td className="px-4 py-3.5">
                        {row.ownerName || '—'}
                        {user?._id && String(row.ownerId) === String(user._id) ? ` (${t('contractsPage.you')})` : ''}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          <button type="button" title={t('contractsPage.view')} onClick={() => openView(row)} className="grid h-9 w-9 place-items-center rounded-xl text-[#24478a] transition hover:bg-[#eef3fb] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button type="button" title={t('contractsPage.edit')} onClick={() => openEdit(row)} className="grid h-9 w-9 place-items-center rounded-xl text-indigo-700 transition hover:bg-indigo-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" title={t('contractsPage.duplicate')} onClick={() => duplicate(row)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/30">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button type="button" title={t('contractsPage.remove')} onClick={() => setPendingDelete(row)} className="grid h-9 w-9 place-items-center rounded-xl text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/20">
                            <Trash2 className="h-4 w-4" />
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

        <aside className={`${CARD} flex flex-col p-4`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('contractsPage.aiTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('contractsPage.aiHint')}</p>
          <div className="mt-4 min-h-24 flex-1 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {answer || t('contractsPage.aiEmpty')}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('contractsPage.aiPlaceholder')}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <button type="submit" disabled={asking} className="rounded-xl bg-[#24478a] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {asking ? '…' : t('contractsPage.ask')}
            </button>
          </form>
        </aside>
      </div>

      {modal && modal.mode !== 'view' ? (
        <FormModal
          icon={modal.mode === 'edit' ? Pencil : FilePlus2}
          title={modal.mode === 'edit' ? t('contractsPage.editTitle') : t('contractsPage.createTitle')}
          subtitle={modal.mode === 'edit' ? t('contractsPage.editText') : t('contractsPage.createText')}
          onClose={() => setModal(null)}
          closeLabel={t('contractsPage.cancel')}
          footer={
            <>
              <button type="button" onClick={() => setModal(null)} className={btnGhost}>
                {t('contractsPage.cancel')}
              </button>
              <button type="submit" form="contract-form" disabled={busy} className={btnPrimary}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                {t('contractsPage.save')}
              </button>
            </>
          }
        >
          <form
            id="contract-form"
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('contractsPage.sectionIdentity')}</p>
            <Field id="contract-title" label={t('contractsPage.fieldTitle')}>
              <input id="contract-title" className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field id="contract-client" label={t('contractsPage.fieldClient')}>
              <input id="contract-client" className={fieldClass} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="contract-type" label={t('contractsPage.fieldType')}>
                <select id="contract-type" className={fieldClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((value) => (
                    <option key={value} value={value}>{t(`contractsPage.types.${value}`)}</option>
                  ))}
                </select>
              </Field>
              <Field id="contract-status" label={t('contractsPage.fieldStatus')}>
                <select id="contract-status" className={fieldClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>{t(`contractsPage.statuses.${value}`)}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('contractsPage.sectionFollow')}</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="contract-amount" label={t('contractsPage.fieldAmount')}>
                <input id="contract-amount" className={fieldClass} type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field id="contract-start" label={t('contractsPage.fieldStart')}>
                <input id="contract-start" className={fieldClass} type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </Field>
              <Field id="contract-end" label={t('contractsPage.fieldEnd')}>
                <input id="contract-end" className={fieldClass} type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </Field>
            </div>
            <Field id="contract-notes" label={t('contractsPage.fieldNotes')}>
              <textarea id="contract-notes" className={`${fieldClass} !h-auto py-2.5`} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </form>
        </FormModal>
      ) : null}

      {modal?.mode === 'view' ? (
        <FormModal
          icon={Eye}
          title={t('contractsPage.detailTitle')}
          subtitle={modal.row.client}
          onClose={() => setModal(null)}
          closeLabel={t('contractsPage.cancel')}
          footer={
            <>
              <button type="button" onClick={() => setModal(null)} className={btnGhost}>
                {t('contractsPage.cancel')}
              </button>
              <button
                type="button"
                onClick={() => openEdit(modal.row)}
                className={btnPrimary}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                {t('contractsPage.edit')}
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-extrabold leading-tight text-slate-900 dark:text-white">{modal.row.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge status={modal.row.status}>{t(`contractsPage.statuses.${modal.row.status}`)}</StatusBadge>
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                  {t(`contractsPage.types.${modal.row.type}`)}
                </span>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Building2} label={t('contractsPage.fieldClient')}>{modal.row.client}</InfoRow>
              <InfoRow icon={CircleDollarSign} label={t('contractsPage.fieldAmount')}>{money(modal.row.amount, dateLocale)}</InfoRow>
              <InfoRow icon={CalendarRange} label={t('contractsPage.fieldStart')}>{day(modal.row.startDate) || '—'}</InfoRow>
              <InfoRow icon={CalendarRange} label={t('contractsPage.fieldEnd')}>{day(modal.row.endDate) || '—'}</InfoRow>
              <InfoRow icon={UserRound} label={t('contractsPage.colOwner')}>{modal.row.ownerName || '—'}</InfoRow>
            </dl>
            {modal.row.notes ? (
              <InfoRow icon={StickyNote} label={t('contractsPage.fieldNotes')}>{modal.row.notes}</InfoRow>
            ) : null}
          </div>
        </FormModal>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          tone="red"
          icon={Trash2}
          title={t('contractsPage.deleteTitle')}
          text={t('contractsPage.deleteText', { title: pendingDelete.title })}
          confirmLabel={t('contractsPage.confirmDelete')}
          cancelLabel={t('contractsPage.cancel')}
          busy={busy}
          onConfirm={remove}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </div>
  );
}
