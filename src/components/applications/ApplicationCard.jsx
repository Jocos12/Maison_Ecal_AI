import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GripVertical } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { deadlineUrgency, deadlineTextClass, urgencyBadgeClass } from '../../utils/opportunityUrgency.js';

export default function ApplicationCard({ app, onClick, onDragStart, onDragEnd, dragging }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const opp = app.opportunity;
  const urgency = deadlineUrgency(opp?.deadline);
  const sentAt = app.appliedDate || app.sentEmail?.sentAt;

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', app._id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(app);
      }}
      onDragEnd={() => onDragEnd?.()}
      onClick={() => onClick(app)}
      className={`w-full text-left rounded-xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${
        dragging
          ? 'opacity-40 border-blue-400'
          : urgency.level === 'critical' || urgency.level === 'passed'
            ? 'border-red-200 dark:border-red-900'
            : urgency.level === 'soon'
              ? 'border-orange-200 dark:border-orange-900'
              : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 cursor-grab text-slate-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold text-slate-950 dark:text-white">
            {opp?.title || '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{opp?.organization}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {urgency.level !== 'none' ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyBadgeClass(urgency.level)}`}>
            {urgency.level === 'passed'
              ? t('opportunities.deadlinePassed')
              : urgency.level === 'critical'
                ? t('opportunities.daysLeft', { count: urgency.days })
                : urgency.level === 'soon'
                  ? t('opportunities.closingSoon', { count: urgency.days })
                  : t('opportunities.daysLeft', { count: urgency.days })}
          </span>
        ) : null}
        {app.status === 'submitted' && sentAt ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
            {format(new Date(sentAt), 'dd MMM', { locale })}
          </span>
        ) : null}
      </div>
      {opp?.deadline ? (
        <p className={`mt-1.5 text-[10px] ${deadlineTextClass(urgency.level)}`}>
          {t('opportunities.deadline')}: {format(new Date(opp.deadline), 'dd MMM', { locale })}
        </p>
      ) : null}
      {app.notes ? <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{app.notes}</p> : null}
    </button>
  );
}
