import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Dices,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Users,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const INPUT =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

const ROLES = ['Admin', 'Manager', 'Analyste'];

// One colour per role: the avatar tile, the small badge and the segment of the donut on the banner
const ROLE_META = {
  Admin: {
    icon: ShieldCheck,
    tile: 'bg-[#24478a] text-white',
    chip: 'bg-[#e3ebf9] text-[#24478a] ring-1 ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600',
    onBlue: '#ffffff'
  },
  Manager: {
    icon: Briefcase,
    tile: 'bg-violet-100 text-violet-700',
    chip: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900',
    onBlue: '#c4b5fd'
  },
  Analyste: {
    icon: BarChart3,
    tile: 'bg-teal-100 text-teal-800',
    chip: 'bg-teal-50 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900',
    onBlue: '#5eead4'
  }
};

const ACTIVITY_META = {
  login: { icon: LogIn, tone: 'bg-[#e3ebf9] text-[#24478a]' },
  logout: { icon: LogOut, tone: 'bg-slate-100 text-slate-600' },
  user_created: { icon: UserPlus, tone: 'bg-emerald-50 text-emerald-700' },
  user_updated: { icon: Pencil, tone: 'bg-indigo-50 text-indigo-700' },
  user_deleted: { icon: Trash2, tone: 'bg-red-50 text-red-600' },
  user_approved: { icon: UserCheck, tone: 'bg-emerald-50 text-emerald-700' },
  user_rejected: { icon: UserX, tone: 'bg-amber-50 text-amber-700' }
};

const roleOf = (u) => (['Admin', 'admin'].includes(u?.role) ? 'Admin' : u?.role === 'Manager' ? 'Manager' : 'Analyste');
const idOf = (u) => String(u?._id || u?.id || '');
const isActive = (u) => u?.isApproved !== false;

function splitName(u) {
  const first = String(u?.firstName || '').trim();
  const last = String(u?.lastName || '').trim();
  if (first || last) return { first, last };
  const parts = String(u?.name || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

function initialsOf(u) {
  const { first, last } = splitName(u);
  const letters = `${first[0] || ''}${last[0] || ''}` || String(u?.email || '?')[0];
  return letters.toUpperCase();
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(14);
  window.crypto.getRandomValues(values);
  return Array.from(values, (n) => chars[n % chars.length]).join('');
}

function Avatar({ user, size = 'md' }) {
  const meta = ROLE_META[roleOf(user)];
  const box = size === 'lg' ? 'h-20 w-20 rounded-2xl text-2xl' : 'h-11 w-11 rounded-xl text-sm';
  return (
    <span className={`grid flex-none place-items-center font-extrabold tracking-wide ${box} ${meta.tile}`} aria-hidden="true">
      {initialsOf(user)}
    </span>
  );
}

function RoleBadge({ role, t }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ${meta.chip}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t(`usersPage.role${role}`)}
    </span>
  );
}

function StatusBadge({ active, t }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
      {t('usersPage.statusActive')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {t('usersPage.statusPending')}
    </span>
  );
}

function Switch({ checked, onChange, label, hint }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition ${FOCUS} ${
        checked ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 flex-none rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true">
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function Field({ id, label, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

/** Create or edit an account: names, e-mail, password, role and the two status switches. */
function UserFormModal({ mode, initial, onClose, onSaved, t }) {
  const names = splitName(initial);
  const [form, setForm] = useState({
    firstName: mode === 'edit' ? names.first : '',
    lastName: mode === 'edit' ? names.last : '',
    email: mode === 'edit' ? initial?.email || '' : '',
    password: '',
    role: mode === 'edit' ? roleOf(initial) : 'Analyste',
    isApproved: mode === 'edit' ? isActive(initial) : true,
    isVerified: mode === 'edit' ? initial?.isVerified !== false : true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    const first = form.firstName.trim();
    const last = form.lastName.trim();
    if (!first || !last) {
      toast.error(t('usersPage.namesRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error(t('usersPage.emailInvalid'));
      return;
    }
    if ((mode === 'create' || form.password) && form.password.length < 8) {
      toast.error(t('usersPage.passwordShort'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: `${first} ${last}`,
        email: form.email.trim(),
        role: form.role,
        isApproved: form.isApproved,
        isVerified: form.isVerified
      };
      if (form.password) payload.password = form.password;
      if (mode === 'create') {
        await api.post('/api/admin/users', payload);
        toast.success(t('usersPage.toastCreated'));
      } else {
        await api.put(`/api/admin/users/${idOf(initial)}`, payload);
        toast.success(t('usersPage.toastUpdated'));
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || t('usersPage.toastSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const create = mode === 'create';
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="relative bg-[#24478a] px-6 py-5 text-white">
          <span className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full border-[22px] border-white/5" aria-hidden="true" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-[#24478a]">
              {create ? <UserPlus className="h-6 w-6" aria-hidden="true" /> : <Pencil className="h-6 w-6" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-lg font-extrabold leading-tight">{create ? t('usersPage.createTitle') : t('usersPage.editTitle')}</h2>
              <p className="mt-0.5 text-[13px] leading-snug text-blue-100">{create ? t('usersPage.createText') : t('usersPage.editText')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('usersPage.close')}
              className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[68vh] space-y-5 overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="user-first-name" label={t('usersPage.firstName')}>
              <input id="user-first-name" value={form.firstName} onChange={(e) => set('firstName')(e.target.value)} maxLength={60} autoComplete="off" className={INPUT} />
            </Field>
            <Field id="user-last-name" label={t('usersPage.lastName')}>
              <input id="user-last-name" value={form.lastName} onChange={(e) => set('lastName')(e.target.value)} maxLength={60} autoComplete="off" className={INPUT} />
            </Field>
          </div>

          <Field id="user-email" label={t('usersPage.email')}>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input id="user-email" type="email" value={form.email} onChange={(e) => set('email')(e.target.value)} autoComplete="off" className={`${INPUT} pl-10`} />
            </div>
          </Field>

          <Field
            id="user-password"
            label={create ? t('usersPage.password') : t('usersPage.passwordNew')}
            hint={create ? t('usersPage.passwordHint') : t('usersPage.passwordEditHint')}
          >
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  id="user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => set('password')(e.target.value)}
                  autoComplete="new-password"
                  className={`${INPUT} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('usersPage.hide') : t('usersPage.show')}
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  set('password')(generatePassword());
                  setShowPassword(true);
                }}
                className={`inline-flex h-11 flex-none items-center gap-2 rounded-xl border border-[#24478a] bg-white px-3.5 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
              >
                <Dices className="h-4 w-4" aria-hidden="true" />
                {t('usersPage.generate')}
              </button>
            </div>
          </Field>

          <div>
            <span className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">{t('usersPage.roleLabel')}</span>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('usersPage.roleLabel')}>
              {ROLES.map((role) => {
                const meta = ROLE_META[role];
                const RoleIcon = meta.icon;
                const on = form.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set('role')(role)}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${FOCUS} ${
                      on ? 'border-[#24478a] bg-[#eef3fb] ring-2 ring-[#24478a]/20 dark:bg-slate-800' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${meta.tile}`}>
                        <RoleIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {on ? <Check className="h-4 w-4 text-[#24478a] dark:text-blue-300" aria-hidden="true" /> : null}
                    </span>
                    <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{t(`usersPage.role${role}`)}</span>
                    <span className="text-xs leading-snug text-slate-500 dark:text-slate-400">{t(`usersPage.hint${role}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Switch checked={form.isApproved} onChange={set('isApproved')} label={t('usersPage.approved')} hint={t('usersPage.approvedHint')} />
            <Switch checked={form.isVerified} onChange={set('isVerified')} label={t('usersPage.verifiedLabel')} hint={t('usersPage.verifiedHint')} />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
          >
            {t('usersPage.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden="true" />}
            {create ? t('usersPage.createAction') : t('usersPage.save')}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

/** Donut of the role split, drawn for the blue banner. */
function RoleDonut({ counts, total, t }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 flex-none">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={t('usersPage.composition')}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="14" />
          {total > 0
            ? ROLES.map((role) => {
                const value = counts[role];
                if (!value) return null;
                const length = (value / total) * circumference;
                const segment = (
                  <circle
                    key={role}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={ROLE_META[role].onBlue}
                    strokeWidth="14"
                    strokeDasharray={`${Math.max(length - 2, 0)} ${circumference}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return segment;
              })
            : null}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-extrabold leading-none tabular-nums">{total}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200">{t('usersPage.statMembers')}</p>
          </div>
        </div>
      </div>
      <ul className="min-w-0 space-y-2">
        {ROLES.map((role) => (
          <li key={role} className="flex items-center gap-2.5 text-[13px] font-semibold text-blue-50">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: ROLE_META[role].onBlue }} aria-hidden="true" />
            <span className="min-w-0 break-words">{t(`usersPage.role${role}`)}</span>
            <span className="tabular-nums text-blue-200">{counts[role]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{children}</dd>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user } = useApp();
  const { t, dateLocale } = useUiLocale();
  const tRef = useRef(t);
  tRef.current = t;
  const [tab, setTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [system, setSystem] = useState(null); // counters over every account, the signed-in one included
  const [pending, setPending] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null); // { mode: 'create' | 'edit', user }
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'reject', user }

  const isAdmin = Boolean(user) && ['Admin', 'admin'].includes(user.role);
  const selfId = String(user?.id || user?._id || '');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const [pendingRes, allRes, activityRes] = await Promise.all([
        api.get('/api/admin/users/pending'),
        api.get('/api/admin/users'),
        api.get('/api/admin/activity/recent', { params: { limit: 20 } })
      ]);
      setPending(pendingRes.data?.users || []);
      setMembers(allRes.data?.users || []);
      setSystem(allRes.data?.stats || null);
      setActivity(activityRes.data?.activity || []);
    } catch (e) {
      toast.error(e.response?.data?.message || tRef.current('usersPage.toastLoadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  // The signed-in administrator is never part of the list: their own account lives in Settings
  const others = useMemo(() => members.filter((u) => idOf(u) !== selfId), [members, selfId]);
  const pendingOthers = useMemo(() => pending.filter((u) => idOf(u) !== selfId), [pending, selfId]);

  // The counters cover every account of the platform, this administrator's own included, even though it is not listed
  const counts = useMemo(() => {
    if (system?.byRole) return system.byRole;
    const byRole = { Admin: 0, Manager: 0, Analyste: 0 };
    others.forEach((u) => {
      byRole[roleOf(u)] += 1;
    });
    return byRole;
  }, [system, others]);

  const stats = useMemo(
    () => ({
      total: system?.total ?? others.length,
      active: system?.active ?? others.filter(isActive).length,
      pending: system?.pending ?? pendingOthers.length,
      verified: system?.verified ?? others.filter((u) => u.isVerified !== false).length
    }),
    [system, others, pendingOthers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return others.filter((u) => {
      if (q && !`${u.name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase().includes(q)) return false;
      if (roleFilter && roleOf(u) !== roleFilter) return false;
      if (statusFilter === 'active' && !isActive(u)) return false;
      if (statusFilter === 'pending' && isActive(u)) return false;
      if (statusFilter === 'unverified' && u.isVerified !== false) return false;
      return true;
    });
  }, [others, search, roleFilter, statusFilter]);

  const selected = others.find((u) => idOf(u) === selectedId) || null;

  // On a wide screen the detail panel is always showing someone; on a phone it only opens on tap
  useEffect(() => {
    if (tab !== 'members' || selected || !filtered.length) return;
    if (window.matchMedia('(min-width: 1024px)').matches) setSelectedId(idOf(filtered[0]));
  }, [tab, selected, filtered]);

  const filtersActive = Boolean(search.trim() || roleFilter || statusFilter);
  const fmt = (value, withTime = true) =>
    value
      ? new Date(value).toLocaleString(dateLocale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
        })
      : null;

  const approve = async (u) => {
    setBusyId(idOf(u));
    try {
      await api.patch(`/api/admin/users/${idOf(u)}/approve`);
      toast.success(t('usersPage.toastApproved'));
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t('usersPage.toastApproveError'));
    } finally {
      setBusyId(null);
    }
  };

  const runConfirmed = async () => {
    const { kind, user: target } = confirm;
    setConfirm(null);
    setBusyId(idOf(target));
    try {
      if (kind === 'delete') {
        await api.delete(`/api/admin/users/${idOf(target)}`);
        toast.success(t('usersPage.toastDeleted'));
      } else {
        await api.patch(`/api/admin/users/${idOf(target)}/reject`);
        toast.success(t('usersPage.toastRejected'));
      }
      if (idOf(target) === selectedId) setSelectedId(null);
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t(kind === 'delete' ? 'usersPage.toastDeleteError' : 'usersPage.toastRejectError'));
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
        <ShieldCheck className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{t('admin.accessDenied')}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('admin.accessDeniedHint')}</p>
      </div>
    );
  }

  const tabs = [
    { id: 'members', icon: Users, count: others.length },
    { id: 'pending', icon: UserCheck, count: pendingOthers.length, alert: pendingOthers.length > 0 },
    { id: 'activity', icon: Activity, count: activity.length }
  ];

  const roleOptions = [
    { value: '', label: t('usersPage.allRoles') },
    ...ROLES.map((role) => ({ value: role, label: t(`usersPage.role${role}`), hint: String(counts[role]) }))
  ];
  const statusOptions = [
    { value: '', label: t('usersPage.allStatuses') },
    { value: 'active', label: t('usersPage.statusActive'), dot: 'bg-emerald-500' },
    { value: 'pending', label: t('usersPage.statusPending'), dot: 'bg-amber-500' },
    { value: 'unverified', label: t('usersPage.statusUnverified'), dot: 'bg-slate-400' }
  ];

  return (
    <div className="page-shell space-y-6 pb-10">
      {/* Banner: who the administrator looks after, and how the team splits by role */}
      <section className="relative overflow-hidden rounded-3xl bg-[#24478a] p-6 text-white shadow-sm md:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-28 left-1/2 h-52 w-52 rounded-full border-[26px] border-white/5" aria-hidden="true" />
        <div className="relative grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
                <Users className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('usersPage.eyebrow')}</p>
                <h1 className="break-words text-3xl font-extrabold leading-tight tracking-tight">{t('usersPage.title')}</h1>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100">{t('usersPage.subtitle')}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setForm({ mode: 'create', user: null })}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] shadow-sm transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t('usersPage.newUser')}
              </button>
              <button
                type="button"
                onClick={() => load({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-[#24478a] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                {t('usersPage.refresh')}
              </button>
            </div>

            <dl className="mt-6 grid max-w-xl grid-cols-3 gap-2.5">
              {[
                [t('usersPage.statActive'), stats.active, 'bg-emerald-400'],
                [t('usersPage.statPending'), stats.pending, 'bg-amber-300'],
                [t('usersPage.statVerified'), stats.verified, 'bg-white']
              ].map(([label, value, dot]) => (
                <div key={label} className="rounded-2xl bg-white/10 px-3 py-3 sm:px-4">
                  <dd className="text-2xl font-extrabold leading-none tabular-nums">{value}</dd>
                  <dt className="mt-1.5 flex items-start gap-1.5 break-words text-[11px] font-semibold leading-snug text-blue-100 sm:text-xs">
                    <span className={`mt-1 h-1.5 w-1.5 flex-none rounded-full ${dot}`} aria-hidden="true" />
                    {label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl bg-white/10 p-5">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('usersPage.composition')}</p>
            <RoleDonut counts={counts} total={stats.total} t={t} />
          </div>
        </div>

        <p className="relative mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-medium leading-relaxed text-blue-50">
          <UserRound className="h-4 w-4 flex-none text-blue-200" aria-hidden="true" />
          <span className="min-w-0 flex-1 basis-56">{t('usersPage.notListed')}</span>
          <Link to="/settings" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 font-bold text-white transition hover:bg-white hover:text-[#24478a]">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('usersPage.openSettings')}
          </Link>
        </p>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="tablist">
        {tabs.map(({ id, icon: TabIcon, count, alert }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2.5 text-[13px] font-bold transition sm:flex-none sm:px-4 sm:text-sm ${FOCUS} ${
              tab === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            <TabIcon className="hidden h-4 w-4 flex-none sm:block" aria-hidden="true" />
            {t(`usersPage.tab_${id}`)}
            <span
              className={`rounded-full px-2 text-[11px] tabular-nums ${
                tab === id ? 'bg-white/20' : alert ? 'bg-amber-400 text-amber-950' : 'bg-slate-300/70 dark:bg-slate-600'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {t('usersPage.loading')}
        </div>
      ) : null}

      {/* Members: list on the left, the chosen person on the right */}
      {!loading && tab === 'members' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] lg:items-start">
          <section className={`${CARD} overflow-hidden`}>
            <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-700 md:p-5">
              <label className="relative block">
                <span className="sr-only">{t('usersPage.searchPlaceholder')}</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('usersPage.searchPlaceholder')}
                  className="h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Dropdown label={t('usersPage.roleFilter')} icon={ShieldCheck} value={roleFilter} defaultValue="" onChange={setRoleFilter} options={roleOptions} />
                <Dropdown label={t('usersPage.statusFilter')} icon={Globe} value={statusFilter} defaultValue="" onChange={setStatusFilter} options={statusOptions} />
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('usersPage.results', { count: filtered.length, total: others.length })}</p>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
                  <Users className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="mt-4 text-base font-bold text-slate-900 dark:text-white">{filtersActive ? t('usersPage.noMatch') : t('usersPage.noOthers')}</p>
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('');
                      setStatusFilter('');
                    }}
                    className={`mt-4 rounded-xl border border-[#24478a] px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:text-blue-200 ${FOCUS}`}
                  >
                    {t('usersPage.reset')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForm({ mode: 'create', user: null })}
                    className={`mt-4 inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3a72] ${FOCUS}`}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('usersPage.newUser')}
                  </button>
                )}
              </div>
            ) : (
              <ul className="max-h-[42rem] overflow-y-auto">
                {filtered.map((u) => {
                  const on = idOf(u) === selectedId;
                  const role = roleOf(u);
                  return (
                    <li key={idOf(u)} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setSelectedId(idOf(u))}
                        aria-current={on ? 'true' : undefined}
                        className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition md:px-5 ${FOCUS} ${
                          on ? 'bg-[#eef3fb] shadow-[inset_3px_0_0_#24478a] dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <Avatar user={u} />
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{u.name}</span>
                          <span className="mt-0.5 block break-all text-[13px] text-slate-500 dark:text-slate-400">{u.email}</span>
                          <span className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                            <RoleBadge role={role} t={t} />
                            <StatusBadge active={isActive(u)} t={t} />
                          </span>
                        </span>
                        <span className="hidden flex-none flex-col items-end gap-1.5 sm:flex">
                          <RoleBadge role={role} t={t} />
                          <StatusBadge active={isActive(u)} t={t} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Detail: a side panel on wide screens, a sheet sliding over the page on phones */}
          <aside
            className={`lg:sticky lg:top-2 max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:flex max-lg:items-end max-lg:bg-slate-900/50 ${selected ? '' : 'max-lg:hidden'}`}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setSelectedId(null);
            }}
          >
            {selected ? (
              <div className={`${CARD} w-full overflow-hidden max-lg:max-h-[92vh] max-lg:overflow-y-auto max-lg:rounded-b-none max-lg:rounded-t-3xl`}>
                <div className="relative h-20 bg-[#24478a]">
                  <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full border-[22px] border-white/5" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    aria-label={t('usersPage.close')}
                    className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600 lg:hidden"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-5 pb-5">
                  <div className="relative -mt-10 w-fit rounded-2xl ring-4 ring-white dark:ring-slate-900">
                    <Avatar user={selected} size="lg" />
                  </div>
                  <h2 className="mt-3 break-words text-xl font-extrabold leading-tight text-slate-900 dark:text-white">{selected.name}</h2>
                  <p className="mt-0.5 break-all text-sm text-slate-500 dark:text-slate-400">{selected.email}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RoleBadge role={roleOf(selected)} t={t} />
                    <StatusBadge active={isActive(selected)} t={t} />
                  </div>

                  <dl className="mt-5 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
                    <InfoRow icon={BadgeCheck} label={t('usersPage.fEmail')}>
                      {selected.isVerified !== false ? t('usersPage.verified') : t('usersPage.unverified')}
                    </InfoRow>
                    <InfoRow icon={Phone} label={t('usersPage.fPhone')}>
                      {selected.phone || <span className="font-medium text-slate-400">{t('usersPage.notProvided')}</span>}
                    </InfoRow>
                    <InfoRow icon={Clock} label={t('usersPage.fLastLogin')}>
                      {fmt(selected.lastLoginAt) || <span className="font-medium text-slate-400">{t('usersPage.neverLoggedIn')}</span>}
                    </InfoRow>
                    <InfoRow icon={CalendarDays} label={t('usersPage.fRegistered')}>
                      {fmt(selected.createdAt, false) || t('usersPage.notProvided')}
                    </InfoRow>
                  </dl>

                  <div className="mt-6 space-y-2">
                    {!isActive(selected) ? (
                      <button
                        type="button"
                        disabled={busyId === idOf(selected)}
                        onClick={() => approve(selected)}
                        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#24478a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
                      >
                        {busyId === idOf(selected) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                        {t('usersPage.approve')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setForm({ mode: 'edit', user: selected })}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${FOCUS} ${
                        isActive(selected)
                          ? 'bg-[#24478a] text-white shadow-sm hover:bg-[#1c3a72]'
                          : 'border border-[#24478a] bg-white text-[#24478a] hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200'
                      }`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      {t('usersPage.edit')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === idOf(selected)}
                      onClick={() => setConfirm({ kind: 'delete', user: selected })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:opacity-60 dark:border-red-900 dark:bg-slate-900"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t('usersPage.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="hidden w-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center lg:block dark:border-slate-600 dark:bg-slate-900">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
                  <UserRound className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{t('usersPage.pickMember')}</p>
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {/* Registrations waiting for a decision */}
      {!loading && tab === 'pending' ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('usersPage.pendingTitle')}</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('usersPage.pendingText')}</p>
          </div>
          {pendingOthers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
                <Inbox className="h-8 w-8" aria-hidden="true" />
              </span>
              <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{t('usersPage.pendingEmpty')}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('usersPage.pendingEmptyText')}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {pendingOthers.map((u) => (
                <article key={idOf(u)} className={`${CARD} overflow-hidden`}>
                  <div className="flex items-start gap-4 p-5">
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-bold leading-snug text-slate-900 dark:text-white">{u.name}</p>
                      <p className="mt-0.5 break-all text-[13px] text-slate-500 dark:text-slate-400">{u.email}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RoleBadge role={roleOf(u)} t={t} />
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ${
                            u.isVerified ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                          {u.isVerified ? t('usersPage.verified') : t('usersPage.unverified')}
                        </span>
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('usersPage.registeredOn', { date: fmt(u.createdAt) || t('usersPage.notProvided') })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                    <button
                      type="button"
                      disabled={busyId === idOf(u)}
                      onClick={() => setConfirm({ kind: 'reject', user: u })}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:opacity-60 dark:border-red-900 dark:bg-slate-900"
                    >
                      <UserX className="h-4 w-4" aria-hidden="true" />
                      {t('usersPage.reject')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === idOf(u)}
                      onClick={() => approve(u)}
                      className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
                    >
                      {busyId === idOf(u) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                      {t('usersPage.approve')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Recent activity as a timeline */}
      {!loading && tab === 'activity' ? (
        <section className={`${CARD} p-5 md:p-6`}>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">{t('usersPage.activityTitle')}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('usersPage.activitySubtitle')}</p>
          {activity.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:border-slate-600">{t('usersPage.activityEmpty')}</p>
          ) : (
            <ol className="relative mt-6 space-y-5 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
              {activity.map((row) => {
                const meta = ACTIVITY_META[row.action] || ACTIVITY_META.login;
                const ActionIcon = meta.icon;
                return (
                  <li key={row.id} className="relative flex items-start gap-4">
                    <span className={`relative z-10 grid h-10 w-10 flex-none place-items-center rounded-xl ring-4 ring-white dark:ring-slate-900 ${meta.tone}`}>
                      <ActionIcon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="min-w-0 break-words text-sm font-bold text-slate-900 dark:text-white">
                          {t(`admin.activityActions.${row.action}`) === `admin.activityActions.${row.action}` ? row.action : t(`admin.activityActions.${row.action}`)}
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {' '}
                            {t('usersPage.by')} {row.name || row.email}
                          </span>
                        </p>
                        <time className="flex-none text-xs font-semibold text-slate-400">{fmt(row.createdAt)}</time>
                      </div>
                      {row.targetEmail || row.details ? <p className="mt-1 break-words text-[13px] text-slate-600 dark:text-slate-300">{row.details || row.targetEmail}</p> : null}
                      {row.ip ? <p className="mt-1 text-xs text-slate-400">{t('usersPage.ip', { ip: row.ip })}</p> : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : null}

      {form ? <UserFormModal mode={form.mode} initial={form.user} onClose={() => setForm(null)} onSaved={() => load({ silent: true })} t={t} /> : null}

      {confirm ? (
        <ConfirmDialog
          tone="red"
          icon={confirm.kind === 'delete' ? Trash2 : UserX}
          title={confirm.kind === 'delete' ? t('usersPage.deleteTitle') : t('usersPage.rejectTitle')}
          text={t(confirm.kind === 'delete' ? 'usersPage.deleteText' : 'usersPage.rejectText', { name: confirm.user.name, email: confirm.user.email })}
          confirmLabel={confirm.kind === 'delete' ? t('usersPage.deleteConfirm') : t('usersPage.rejectConfirm')}
          cancelLabel={t('usersPage.cancel')}
          closeLabel={t('usersPage.close')}
          onConfirm={runConfirmed}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </div>
  );
}
