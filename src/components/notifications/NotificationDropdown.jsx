import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, ChevronRight } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { getNotifications, markAllRead, markRead } from '../../utils/notificationStore.js';
import { syncAppNotifications } from '../../utils/syncAppNotifications.js';
import { requestMatchBrowserPermission } from '../../utils/pollMatchAlerts.js';
import NotificationDetailModal from './NotificationDetailModal.jsx';
import { kindOf } from './notificationKinds.js';

function timeAgo(iso, t) {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return t('notifications.now');
  if (minutes < 60) return t('notifications.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('notifications.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('notifications.daysAgo', { count: days });
  return new Date(iso).toLocaleDateString(t('notifications.locale'), { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Tell the server too (match and scan alerts live there), otherwise the next poll would bring them back. */
function markReadOnServer(id) {
  const value = String(id);
  const serverId = value.startsWith('match-') ? value.slice(6) : value.startsWith('scan-') ? value.slice(5) : null;
  if (serverId) api.patch(`/api/notifications/${serverId}/read`).catch(() => {});
}

/**
 * Bell of the header. The list only holds notifications that are still unread. Clicking one opens a small
 * window with all its details; closing that window marks it as read, so it leaves the list for good.
 */
export default function NotificationDropdown() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadItems, setUnreadItems] = useState(() => getNotifications().filter((n) => !n.read));
  const [selected, setSelected] = useState(null);
  const ref = useRef(null);
  const unread = unreadItems.length;

  const refresh = useCallback(() => {
    setUnreadItems(getNotifications().filter((n) => !n.read));
  }, []);

  useEffect(() => {
    syncAppNotifications().then(refresh);
    const onUpdate = () => refresh();
    window.addEventListener('mecal:notifications-updated', onUpdate);
    return () => window.removeEventListener('mecal:notifications-updated', onUpdate);
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleMarkAll = () => {
    markAllRead();
    api.patch('/api/notifications/read-all').catch(() => {});
    refresh();
  };

  const openDetail = (n) => {
    setOpen(false);
    setSelected(n);
  };

  const closeDetail = useCallback(() => {
    if (selected) {
      markRead(selected.id);
      markReadOnServer(selected.id);
    }
    setSelected(null);
    refresh();
  }, [selected, refresh]);

  const openPage = (href) => {
    closeDetail();
    navigate(href);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          requestMatchBrowserPermission().catch(() => {});
        }}
        aria-expanded={open}
        className={`relative rounded-full border p-2 transition ${
          open
            ? 'border-[#24478a] bg-[#24478a] text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
        }`}
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-3 top-[calc(100%+0.5rem)] z-50 flex max-h-[calc(100vh-17rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[calc(100vh-5.5rem)] sm:w-[24rem] dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-none items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200">
                <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">
                  {t('notifications.title')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unread > 0 ? t('notifications.unreadCount', { count: unread }) : t('notifications.allRead')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#24478a] transition hover:bg-[#e3ebf9] disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-blue-300 dark:hover:bg-slate-800 dark:disabled:text-slate-600"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              {t('notifications.markAll')}
            </button>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {unread === 0 ? (
              <li className="flex flex-col items-center px-6 py-10 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                  <BellOff className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{t('notifications.empty')}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('notifications.emptyHint')}</p>
              </li>
            ) : (
              unreadItems.map((n) => {
                const kind = kindOf(n.type);
                const Icon = kind.icon;
                return (
                  <li key={n.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => openDetail(n)}
                      className="group flex w-full gap-3 bg-[#f6f8fd] px-4 py-3 text-left transition hover:bg-[#e8eefa] focus:outline-none focus-visible:bg-[#e8eefa] dark:bg-slate-800/70 dark:hover:bg-slate-800"
                    >
                      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${kind.tile}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold leading-snug text-slate-900 dark:text-slate-100">
                          {n.title}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {n.body}
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {timeAgo(n.createdAt, t)}
                        </span>
                      </span>
                      <ChevronRight
                        className="mt-1 h-4 w-4 flex-none text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24478a] dark:text-slate-600"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      {selected ? (
        <NotificationDetailModal notification={selected} onClose={closeDetail} onOpenPage={openPage} />
      ) : null}
    </div>
  );
}
