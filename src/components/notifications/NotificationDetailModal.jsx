import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { kindKey, kindOf } from './notificationKinds.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** Id of the opportunity a notification is about, when it is about one. */
function opportunityIdOf(n) {
  const fromHref = String(n.href || '').match(/[?&]id=([a-f0-9]{24})/i);
  if (fromHref) return fromHref[1];
  const fromId = String(n.id || '').match(/^(?:opp-item|job-watch)-([a-f0-9]{24})$/i);
  return fromId && OBJECT_ID.test(fromId[1]) ? fromId[1] : null;
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <dt className="bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {label}
      </dt>
      <dd className="break-words bg-white px-3 py-2 text-[13px] font-medium text-slate-800 dark:bg-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

/**
 * Small window with everything known about one notification. Closing it (button, cross, Esc or a click
 * outside) calls `onClose`, and the parent then marks the notification as read so it leaves the list.
 */
export default function NotificationDetailModal({ notification, onClose, onOpenPage }) {
  const { t } = useI18n();
  const closeRef = useRef(null);
  const [opportunity, setOpportunity] = useState(null);

  const kind = kindOf(notification.type);
  const Icon = kind.icon;
  const locale = t('notifications.locale');
  const received = new Date(notification.createdAt);
  const receivedText = Number.isNaN(received.getTime())
    ? ''
    : received.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' });

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const id = opportunityIdOf(notification);
    if (!id) return undefined;
    let cancelled = false;
    api
      .get(`/api/opportunities/${id}`)
      .then(({ data }) => {
        if (!cancelled && data?.title) setOpportunity(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [notification]);

  const formatDate = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(locale, { dateStyle: 'long' });
  };
  const categoryLabel = opportunity?.category ? t(`opportunities.${opportunity.category}`) : '';
  const place = [];
  if (opportunity?.location) place.push(opportunity.location);
  if (
    opportunity?.ville &&
    opportunity.ville !== 'Non précisé' &&
    !String(opportunity.location || '').toLowerCase().includes(opportunity.ville.toLowerCase())
  ) {
    place.push(opportunity.ville);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#0e1c33]/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3.5 px-5 pb-4 pt-5">
          <span className={`grid h-12 w-12 flex-none place-items-center rounded-2xl ${kind.tile}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${kind.label}`}>
              {t(`notifications.kinds.${kindKey(notification.type)}`)}
            </p>
            <h2
              id="notification-detail-title"
              className="mt-1 break-words text-lg font-bold leading-snug text-slate-900 dark:text-white"
            >
              {notification.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notifications.close')}
            className="-mr-1 -mt-1 grid h-8 w-8 flex-none place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24478a] dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {notification.body ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {notification.body}
            </p>
          ) : null}

          <dl className="mt-4 space-y-1.5">
            <Row label={t('notifications.receivedOn')}>{receivedText}</Row>
            {opportunity?.organization ? <Row label={t('notifications.organization')}>{opportunity.organization}</Row> : null}
            {opportunity?.platform ? <Row label={t('notifications.platform')}>{opportunity.platform}</Row> : null}
            {categoryLabel && categoryLabel !== `opportunities.${opportunity.category}` ? (
              <Row label={t('notifications.category')}>{categoryLabel}</Row>
            ) : null}
            {place.length ? <Row label={t('notifications.place')}>{place.join(', ')}</Row> : null}
            {opportunity?.deadline ? <Row label={t('notifications.deadline')}>{formatDate(opportunity.deadline)}</Row> : null}
          </dl>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24478a] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('notifications.close')}
          </button>
          {notification.href ? (
            <button
              type="button"
              onClick={() => onOpenPage(notification.href)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/30"
            >
              {t('notifications.openPage')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
