import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Label } from '../components/ui/label.jsx';

const ROLES = ['Analyste', 'Manager', 'Admin'];

/** Champs clairs — fond blanc, contour bleu (sans styles auth sombres). */
const LIGHT_FIELD =
  'flex h-11 w-full rounded-xl border-2 border-blue-400 bg-white px-4 py-2 text-sm text-slate-900 shadow-none outline-none transition-all placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50';

function AdminTextField({ className = '', ...props }) {
  return <input className={[LIGHT_FIELD, className].filter(Boolean).join(' ')} {...props} />;
}

function AdminSelect({ className = '', children, ...props }) {
  return (
    <select
      className={[LIGHT_FIELD, 'appearance-none bg-white', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}

const LIGHT_LABEL = 'text-slate-700 dark:text-slate-300';

const PANEL_MIN_H = 'min-h-[520px]';

const ACTION_LABEL_KEYS = {
  login: 'admin.activityActions.login',
  logout: 'admin.activityActions.logout',
  user_created: 'admin.activityActions.user_created',
  user_updated: 'admin.activityActions.user_updated',
  user_deleted: 'admin.activityActions.user_deleted',
  user_approved: 'admin.activityActions.user_approved',
  user_rejected: 'admin.activityActions.user_rejected'
};

function formatDate(value, lang = 'fr') {
  if (!value) return '—';
  const locale = lang === 'en' ? 'en-US' : lang === 'sw' ? 'sw-KE' : 'fr-FR';
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function emptyForm() {
  return {
    name: '',
    email: '',
    password: '',
    role: 'Analyste',
    isApproved: true,
    isVerified: true
  };
}

function UserFormModal({ open, mode, initial, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm({
        name: initial.name || '',
        email: initial.email || '',
        password: '',
        role: initial.role || 'Analyste',
        isApproved: initial.isApproved !== false,
        isVerified: initial.isVerified !== false
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'create') {
        await api.post('/api/admin/users', form);
        toast.success(t('admin.toast.created'));
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
          isApproved: form.isApproved,
          isVerified: form.isVerified
        };
        if (form.password?.trim()) payload.password = form.password;
        await api.put(`/api/admin/users/${initial._id || initial.id}`, payload);
        toast.success(t('admin.toast.updated'));
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.toast.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={t('common.close')}
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="pr-10 text-lg font-bold text-slate-900 dark:text-white">
          {mode === 'create' ? t('admin.newUser') : t('admin.editUser')}
        </h3>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-user-name" className={LIGHT_LABEL}>
              {t('admin.form.fullName')}
            </Label>
            <AdminTextField
              id="admin-user-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-email" className={LIGHT_LABEL}>
              {t('admin.form.email')}
            </Label>
            <AdminTextField
              id="admin-user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-user-password" className={LIGHT_LABEL}>
              {t('admin.form.password')}{' '}
              {mode === 'edit' ? t('admin.form.passwordEditHint') : ''}
            </Label>
            <AdminTextField
              id="admin-user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required={mode === 'create'}
              minLength={mode === 'create' ? 8 : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label className={LIGHT_LABEL}>{t('admin.form.role')}</Label>
            <AdminSelect
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700 dark:text-slate-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isApproved}
                onChange={(e) => setForm((f) => ({ ...f, isApproved: e.target.checked }))}
                className="accent-blue-600"
              />
              {t('admin.form.approved')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isVerified}
                onChange={(e) => setForm((f) => ({ ...f, isVerified: e.target.checked }))}
                className="accent-blue-600"
              />
              {t('admin.form.verified')}
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user } = useApp();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState('users');
  const [pending, setPending] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, mode: 'create', user: null });

  const isAdmin = user && ['Admin', 'admin'].includes(user.role);

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
      setAllUsers(allRes.data?.users || []);
      setActivity(activityRes.data?.activity || []);
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.toast.loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allUsers;
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
    );
  }, [allUsers, search]);

  const approve = async (id) => {
    setActionId(id);
    try {
      await api.patch(`/api/admin/users/${id}/approve`);
      toast.success(t('admin.toast.approved'));
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.toast.approveError'));
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id) => {
    if (!window.confirm(t('admin.confirm.reject'))) return;
    setActionId(id);
    try {
      await api.patch(`/api/admin/users/${id}/reject`);
      toast.success(t('admin.toast.rejected'));
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.toast.rejectError'));
    } finally {
      setActionId(null);
    }
  };

  const removeUser = async (u) => {
    const id = u._id || u.id;
    if (!window.confirm(t('admin.confirm.delete', { email: u.email }))) return;
    setActionId(id);
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success(t('admin.toast.deleted'));
      await load({ silent: true });
    } catch (e) {
      toast.error(e.response?.data?.message || t('admin.toast.deleteError'));
    } finally {
      setActionId(null);
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
    { id: 'users', label: t('admin.tabs.users'), icon: Users, count: allUsers.length },
    { id: 'pending', label: t('admin.tabs.pending'), icon: UserCheck, count: pending.length },
    { id: 'activity', label: t('admin.tabs.activity'), icon: Activity, count: activity.length }
  ];

  return (
    <div className="page-shell space-y-6 px-1 sm:px-0">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
              <Users className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">{t('admin.title')}</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('admin.subtitle')}</p>
            </div>
          </div>
          <div className="flex h-11 shrink-0 items-center lg:justify-end">
            {tab === 'users' ? (
              <Button
                type="button"
                onClick={() => setModal({ open: true, mode: 'create', user: null })}
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                {t('admin.newUser')}
              </Button>
            ) : (
              <span
                className="invisible inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2 text-sm sm:w-auto"
                aria-hidden
              >
                <Plus className="h-4 w-4" />
                {t('admin.newUser')}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                tab === id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  tab === id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
      </header>

      <section
        className={`relative rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${PANEL_MIN_H}`}
      >
        {(loading || refreshing) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-900/70">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {!loading && tab === 'users' ? (
          <>
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t('admin.allUsers', { count: filteredUsers.length })}
              </h2>
              <AdminTextField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.search')}
                className="max-w-full sm:max-w-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 sm:px-6">{t('admin.cols.name')}</th>
                    <th className="px-4 py-3 sm:px-6">{t('admin.cols.email')}</th>
                    <th className="hidden px-4 py-3 md:table-cell sm:px-6">{t('admin.cols.role')}</th>
                    <th className="px-4 py-3 sm:px-6">{t('admin.cols.status')}</th>
                    <th className="hidden px-4 py-3 lg:table-cell sm:px-6">{t('admin.cols.lastLogin')}</th>
                    <th className="hidden px-4 py-3 xl:table-cell sm:px-6">{t('admin.cols.registered')}</th>
                    <th className="px-4 py-3 text-right sm:px-6">{t('admin.cols.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-sm text-slate-500">
                        {t('admin.empty.users')}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const id = u._id || u.id;
                      return (
                        <tr key={id}>
                          <td className="px-4 py-3 font-medium text-slate-900 sm:px-6 dark:text-white">
                            {u.name}
                          </td>
                          <td className="max-w-[140px] truncate px-4 py-3 text-slate-600 sm:max-w-none sm:px-6 dark:text-slate-400">
                            {u.email}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell sm:px-6">{u.role}</td>
                          <td className="px-4 py-3 sm:px-6">
                            {u.isApproved !== false ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                {t('admin.status.approved')}
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                {t('admin.status.pending')}
                              </span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-500 lg:table-cell sm:px-6">
                            {formatDate(u.lastLoginAt, lang)}
                          </td>
                          <td className="hidden px-4 py-3 text-slate-500 xl:table-cell sm:px-6">
                            {formatDate(u.createdAt, lang)}
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setModal({ open: true, mode: 'edit', user: u })}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                title={t('admin.actions.edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={actionId === id}
                                onClick={() => removeUser(u)}
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950/30"
                                title={t('admin.actions.delete')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {!loading && tab === 'pending' ? (
          <>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {t('admin.pendingTitle', { count: pending.length })}
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
                {t('admin.pendingEmpty')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {pending.map((u) => (
                  <li
                    key={u._id || u.id}
                    className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                      <p className="truncate text-sm text-slate-600 dark:text-slate-400">{u.email}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t('admin.roleLabel')} : {u.role} · {t('admin.registeredOn')} {formatDate(u.createdAt, lang)} ·{' '}
                        {u.isVerified ? t('admin.verified') : t('admin.unverified')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionId === (u._id || u.id)}
                        onClick={() => approve(u._id || u.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actionId === (u._id || u.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t('admin.actions.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={actionId === (u._id || u.id)}
                        onClick={() => reject(u._id || u.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 disabled:opacity-50"
                      >
                        <UserX className="h-4 w-4" />
                        {t('admin.actions.reject')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}

        {!loading && tab === 'activity' ? (
          <>
            <div className="border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-white">{t('admin.activityTitle')}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('admin.activitySubtitle')}</p>
            </div>
            {activity.length === 0 ? (
              <p className="flex min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
                {t('admin.activityEmpty')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 sm:px-6">{t('admin.cols.date')}</th>
                      <th className="px-4 py-3 sm:px-6">{t('admin.cols.user')}</th>
                      <th className="px-4 py-3 sm:px-6">{t('admin.cols.action')}</th>
                      <th className="hidden px-4 py-3 md:table-cell sm:px-6">{t('admin.targetDetail')}</th>
                      <th className="hidden px-4 py-3 lg:table-cell sm:px-6">{t('admin.cols.ip')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activity.map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500 sm:px-6">
                          {formatDate(row.createdAt, lang)}
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <p className="font-medium text-slate-900 dark:text-white">{row.name || '—'}</p>
                          <p className="truncate text-xs text-slate-500">{row.email}</p>
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                            {ACTION_LABEL_KEYS[row.action] ? t(ACTION_LABEL_KEYS[row.action]) : row.action}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-slate-600 md:table-cell sm:px-6 dark:text-slate-400">
                          {row.targetEmail ? <span className="text-xs">{row.targetEmail}</span> : null}
                          {row.details ? <p className="text-xs text-slate-500">{row.details}</p> : null}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell sm:px-6">
                          {row.ip || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </section>

      <UserFormModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.user}
        onClose={() => setModal({ open: false, mode: 'create', user: null })}
        onSaved={() => load({ silent: true })}
      />
    </div>
  );
}
