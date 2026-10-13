import { useRef, useState } from 'react';
import { Camera, Loader2, ShieldCheck, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { AVATAR_MAX_INPUT_BYTES, toAvatarDataUrl } from '../../utils/avatarImage.js';

const ROLE_TONES = {
  admin: 'bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200',
  manager: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  analyste: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  user: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
};

function roleKey(role) {
  const value = String(role || '').toLowerCase();
  return ROLE_TONES[value] ? value : 'user';
}

function initialsOf(user) {
  const words = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return String(user?.email || '?')[0].toUpperCase();
}

/**
 * Card pinned to the bottom of the sidebar: profile picture, name, e-mail and role of the signed-in user.
 * The picture can be changed by clicking it. In the narrow rail only the picture is shown.
 */
export default function SidebarUserFooter({ compact = false }) {
  const { user, setUser } = useApp();
  const { t } = useI18n();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const key = roleKey(user.role);
  const RoleIcon = key === 'admin' ? ShieldCheck : UserRound;
  const roleLabel = t(`sidebar.roles.${key}`);

  const pickFile = () => {
    if (!busy) fileRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > AVATAR_MAX_INPUT_BYTES) {
      toast.error(t('sidebar.photoInvalid'));
      return;
    }
    setBusy(true);
    try {
      const image = await toAvatarDataUrl(file);
      const { data } = await api.put('/api/auth/avatar', { image });
      setUser((current) => ({ ...current, avatar: data?.avatar ?? image }));
      toast.success(t('sidebar.photoUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('sidebar.photoError'));
    } finally {
      setBusy(false);
    }
  };

  const removePhoto = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.delete('/api/auth/avatar');
      setUser((current) => ({ ...current, avatar: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('sidebar.photoError'));
    } finally {
      setBusy(false);
    }
  };

  const avatar = (
    <div className="group/avatar relative h-11 w-11 flex-none">
      <button
        type="button"
        onClick={pickFile}
        aria-label={t('sidebar.changePhoto')}
        title={compact ? `${user.name} (${roleLabel})` : t('sidebar.changePhoto')}
        className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-white transition focus:outline-none focus-visible:ring-[#24478a] dark:ring-slate-700"
      >
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="grid h-full w-full place-items-center bg-[#24478a] text-sm font-bold tracking-wide text-white">
            {initialsOf(user)}
          </span>
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-[#0e1c33]/55 text-white transition ${
            busy ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-800"
      />
      {user.avatar && !compact ? (
        <button
          type="button"
          onClick={removePhoto}
          aria-label={t('sidebar.removePhoto')}
          title={t('sidebar.removePhoto')}
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition hover:text-red-600 focus:opacity-100 focus:outline-none group-hover/avatar:opacity-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      className={`flex-none border-t border-slate-200/80 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50 ${
        compact ? 'flex justify-center px-2 py-3' : 'p-3'
      }`}
    >
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
      {compact ? (
        avatar
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {avatar}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight text-slate-900 dark:text-white" title={user.name}>
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400" title={user.email}>
              {user.email}
            </p>
            <span
              className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ROLE_TONES[key]}`}
            >
              <RoleIcon className="h-3 w-3" aria-hidden="true" />
              {roleLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
