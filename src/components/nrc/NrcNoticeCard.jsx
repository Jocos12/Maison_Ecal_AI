import { Briefcase, CalendarClock, FileText, Gavel, Sparkles, PenLine } from 'lucide-react';
import { CountryFlag, DEADLINE_STYLE, FOCUS, SCORE_STYLE, ScoreDial, countryLabel, daysLeft, deadlineTone, fmtDay } from './nrcUi.jsx';

function DeadlineBlock({ n, t, dateLocale }) {
  const days = daysLeft(n.deadline);
  const tone = deadlineTone(days, n.isArchived);
  const pill = n.isArchived
    ? t('nrcPage.closed')
    : days == null
      ? null
      : days < 0
        ? t('nrcPage.expired')
        : days === 0
          ? t('nrcPage.today')
          : t('nrcPage.daysLeft', { count: days });
  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        <CalendarClock className="h-3 w-3" aria-hidden="true" />
        {t('nrcPage.deadline')}
      </span>
      <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{n.deadline ? fmtDay(n.deadline, dateLocale) : t('nrcPage.deadlineNone')}</span>
      {pill ? <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${DEADLINE_STYLE[tone]}`}>{pill}</span> : null}
    </div>
  );
}

/** A notice of the feed: relevance dial on the left, what it is in the middle, the deadline on the right. */
export default function NrcNoticeCard({ n, active, onOpen, t, lang, dateLocale }) {
  const isJob = n.kind === 'job';
  const score = SCORE_STYLE[n.scoreLabel] || SCORE_STYLE.low;
  const place = [countryLabel(n.countryCode, n.country, lang), n.location && !n.location.toLowerCase().includes((n.country || '').toLowerCase()) ? n.location : ''].filter(Boolean).join(' · ');
  const KindIcon = isJob ? Briefcase : Gavel;

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        aria-current={active ? 'true' : undefined}
        className={`group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 md:p-5 ${FOCUS} ${
          active ? 'border-[#24478a] ring-2 ring-[#24478a]/20' : 'border-slate-200 dark:border-slate-700'
        } ${n.isArchived ? 'opacity-75' : ''}`}
      >
        <div className="flex gap-4">
          <div className="flex w-[5.25rem] flex-none flex-col items-center gap-1.5 border-r border-slate-100 pr-4 dark:border-slate-800">
            <ScoreDial value={n.score} label={n.scoreLabel} size={54} />
            <span className={`flex items-center gap-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide ${score.text}`}>
              {t(`nrcPage.label_${n.scoreLabel || 'low'}`)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold ${
                  isJob ? 'bg-violet-50 text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900' : 'bg-[#e3ebf9] text-[#24478a] ring-1 ring-[#c9d8f1] dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-600'
                }`}
              >
                <KindIcon className="h-3 w-3" aria-hidden="true" />
                {isJob ? t('nrcPage.kindJob') : t('nrcPage.kindTender')}
              </span>
              {n.noticeType && n.noticeType !== 'Tender' ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{n.noticeType}</span>
              ) : null}
              {n.isNew && !n.isArchived ? <span className="rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-white">{t('nrcPage.new')}</span> : null}
              {n.brief?.generatedAt ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('nrcPage.briefReady')}
                </span>
              ) : null}
              {n.draft?.generatedAt ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">
                  <PenLine className="h-3 w-3" aria-hidden="true" />
                  {t('nrcPage.draftReady')}
                </span>
              ) : null}
            </div>

            <h3 className="mt-2.5 break-words text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-[#24478a] dark:text-white dark:group-hover:text-blue-200">{n.title}</h3>

            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                <CountryFlag code={n.countryCode} />
                <span className="break-words">{place || t('nrcPage.countryUnknown')}</span>
              </span>
              {n.reference ? (
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  <span className="break-all">{t('nrcPage.refPrefix', { ref: n.reference })}</span>
                </span>
              ) : null}
              {n.postedDate ? <span>{t('nrcPage.posted', { date: fmtDay(n.postedDate, dateLocale) })}</span> : null}
            </p>

            {n.matchedKeywords?.length ? (
              <ul className="mt-2.5 flex flex-wrap gap-1.5">
                {n.matchedKeywords.slice(0, 4).map((k) => (
                  <li key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {k}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-3 border-t border-slate-100 pt-3 sm:hidden dark:border-slate-800">
              <DeadlineBlock n={n} t={t} dateLocale={dateLocale} />
            </div>
          </div>

          <div className="hidden w-36 flex-none border-l border-slate-100 pl-4 sm:block dark:border-slate-800">
            <DeadlineBlock n={n} t={t} dateLocale={dateLocale} />
          </div>
        </div>
      </button>
    </li>
  );
}
