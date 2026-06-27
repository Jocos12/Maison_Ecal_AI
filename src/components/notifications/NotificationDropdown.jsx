import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead
} from '../../utils/notificationStore.js';
import { syncAppNotifications } from '../../utils/syncAppNotifications.js';

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => getNotifications());
  const [unread, setUnread] = useState(() => getUnreadCount());
  const ref = useRef(null);

  const refresh = useCallback(() => {
    setItems(getNotifications());
    setUnread(getUnreadCount());
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
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleMarkAll = () => {
    markAllRead();
    refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-bold text-slate-800 dark:text-white">Notifications</p>
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
            >
              Tout marquer comme lu
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-500">Aucune notification</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.href || '#'}
                    onClick={() => {
                      markRead(n.id);
                      refresh();
                      setOpen(false);
                    }}
                    className={`block border-b border-slate-50 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 ${
                      n.read
                        ? 'bg-white dark:bg-slate-900'
                        : 'border-l-2 border-l-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
