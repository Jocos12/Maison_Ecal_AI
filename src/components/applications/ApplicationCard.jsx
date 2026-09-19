import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, CalendarDays, GripVertical, MapPin, Send, StickyNote } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { CATEGORY_BADGE } from '../../utils/opportunityUi.js';
import { deadlineUrgency } from '../../utils/opportunityUrgency.js';

// The colour of the date box follows how close the deadline is (same colours as on the opportunities page).
function timeTone(level) {
  if (level === 'critical' || level === 'passed')
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900';
  if (level === 'soon')
    return 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900';
  return 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900';
}

/** One application on the board. The whole card opens the details and can be dragged to another column. */
export default function ApplicationCard({ app, onClick, onDragStart, onDragEnd, dragging }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const opp = app.opportunity;
  const urgency = deadlineUrgency(opp?.deadline);
  const sentAt = app.appliedDate || app.sentEmail?.sentAt;
  const place = opp?.ville && opp.ville !== 'Non précisé' ? opp.ville : '';
  const categoryLabel = opp?.category ? t(`opportunities.${opp.category}`) : '';
  const daysText =
    urgency.level === 'passed'
      ? t('opportunities.deadlinePassed')
      : urgency.level === 'soon'
        ? t('opportunities.closingSoon', { count: urgency.days })
        : urgency.days != null
          ? t('opportunities.daysLeft', { count: urgency.days })
          : '';

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
      className={`group relative w-full cursor-pointer rounded-xl border bg-white p-3.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:bg-slate-900 ${
        dragging
          ? 'border-[#24478a] opacity-40'
          : urgency.level === 'critical' || urgency.level === 'passed'
            ? 'border-red-200 dark:border-red-900'
            : 'border-slate-200 hover:border-[#24478a]/40 dark:border-slate-700'
      }`}
    >
      <GripVertical
        className="absolute right-1.5 top-2.5 h-4 w-4 cursor-grab text-slate-300 opacity-0 transition group-hover:opacity-100"
        aria-hidden="true"
      />
      <p className="line-clamp-3 pr-4 text-[13.5px] font-bold leading-snug text-slate-900 dark:text-white">
        {opp?.title || 'n/d'}
      </p>
      {opp?.organization ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Building2 className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="line-clamp-2">{opp.organization}</span>
        </p>
      ) : null}

      {place || categoryLabel ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {place ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {place}
            </span>
          ) : null}
          {categoryLabel ? (
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance}`}>
              {categoryLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {opp?.deadline || (app.status === 'submitted' && sentAt) ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
          {opp?.deadline ? (
            <span className={`inline-flex items-start gap-2 rounded-lg px-2.5 py-1.5 ring-1 ${timeTone(urgency.level)}`}>
              <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="leading-tight">
                <span className="block text-[12px] font-bold">{format(new Date(opp.deadline), 'dd MMM yyyy', { locale })}</span>
                {daysText ? <span className="block text-[10px] font-semibold opacity-80">{daysText}</span> : null}
              </span>
            </span>
          ) : null}
          {app.status === 'submitted' && sentAt ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900">
              <Send className="h-3 w-3" aria-hidden="true" />
              {t('applications.sentOnDate', { date: format(new Date(sentAt), 'dd MMM', { locale }) })}
            </span>
          ) : null}
        </div>
      ) : null}

      {app.notes ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5 text-xs leading-snug text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <StickyNote className="mt-0.5 h-3 w-3 flex-none" aria-hidden="true" />
          <span className="line-clamp-2">{app.notes}</span>
        </p>
      ) : null}
    </button>
  );
}
