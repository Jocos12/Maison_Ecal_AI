import { fr } from 'date-fns/locale';
import { BadgeCheck, Building2, CalendarDays, HelpCircle, MapPin } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import ScoreRing from '../ui/ScoreRing.jsx';
import { CATEGORY_BADGE, platformPillClass } from '../../utils/opportunityUi.js';
import { SourceGlyph } from '../../utils/sourceIcons.jsx';
import { formatDeadlineDate, isOpportunityNew } from '../../utils/opportunityDates.js';
import { deadlineUrgency, scorePercent } from '../../utils/opportunityUrgency.js';
import { metierCategoryLabel, metierStatusLabel } from '../../utils/offerScores.js';

const TONES = {
  confirmed: {
    icon: BadgeCheck,
    tile: 'bg-emerald-600 text-white',
    panel: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'text-emerald-800 dark:text-emerald-300',
    ring: 'hover:border-emerald-400'
  },
  review: {
    icon: HelpCircle,
    tile: 'bg-amber-500 text-white',
    panel: 'bg-amber-50 dark:bg-amber-950/30',
    label: 'text-amber-800 dark:text-amber-300',
    ring: 'hover:border-amber-400'
  }
};

function timeTone(level) {
  if (level === 'critical' || level === 'passed')
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900';
  if (level === 'soon')
    return 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900';
  if (level === 'none')
    return 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  return 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900';
}

/**
 * A "case file": the offer on top (source, title, organisation, place, deadline, match ring) and, underneath,
 * the reason why the triage retained it, or why it needs a manual check.
 */
export default function StrictOpportunityCard({ opp, onOpen, index = 0, tone = 'confirmed' }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const look = TONES[tone] || TONES.confirmed;
  const VerdictIcon = look.icon;
  const justification = opp.strictMecalMatch?.justification;
  const urgency = deadlineUrgency(opp.deadline);
  const pct = scorePercent(opp);
  const hasScore = opp.aiAnalysis?.score != null || opp.aiRelevanceScore != null;
  const place = opp.ville && opp.ville !== 'Non précisé' ? opp.ville : '';
  const daysLeft = urgency.days != null && urgency.days >= 0 && urgency.days <= 30 ? urgency.days : null;
  const labelKey = tone === 'review' ? 'pages.strictMecal.whyReview' : 'pages.strictMecal.whyRetained';

  return (
    <article
      className={`mecal-fade-up flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 ${look.ring}`}
      style={{ animationDelay: `${(index % 10) * 40}ms` }}
    >
      <button
        type="button"
        onClick={() => onOpen(opp)}
        className="group block w-full flex-1 p-5 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/15"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${platformPillClass(opp.platform)}`}
          >
            <SourceGlyph source={opp.platform} platform={opp.platform} className="h-3.5 w-3.5" />
            {opp.platform}
          </span>
          <div className="flex items-center gap-2">
            {isOpportunityNew(opp) ? (
              <span className="rounded-md bg-[#e3ebf9] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#24478a] dark:bg-slate-700 dark:text-blue-200">
                {t('opportunities.new')}
              </span>
            ) : null}
            {hasScore ? (
              <span className="flex flex-col items-end" title={t('opportunities.dossierQualityPct', { pct })}>
                <ScoreRing value={pct} size={40} />
                <span className="mt-0.5 max-w-[4.5rem] text-right text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-400">
                  {t('opportunities.dossierQuality')}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        <h3 className="mt-3 line-clamp-3 text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-[#24478a] dark:text-white dark:group-hover:text-blue-300">
          {opp.title}
        </h3>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          {opp.organization ? (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="truncate">{opp.organization}</span>
            </span>
          ) : null}
          {place ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {place}
            </span>
          ) : null}
          {opp.category ? (
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance}`}>
              {t(`opportunities.${opp.category}`)}
            </span>
          ) : null}
        </div>

        <div className={`mt-4 inline-flex items-start gap-2.5 rounded-xl px-3 py-2 ring-1 ${timeTone(urgency.level)}`}>
          <CalendarDays className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <div className="leading-tight">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{t('opportunities.deadline')}</p>
            <p className="text-sm font-bold">
              {urgency.level === 'none' ? t('dashboard.noDeadline') : formatDeadlineDate(opp, locale, t)}
            </p>
            {daysLeft != null ? (
              <p className="text-[11px] font-semibold opacity-80">{t('opportunities.daysLeft', { count: daysLeft })}</p>
            ) : null}
          </div>
        </div>
      </button>

      {justification ? (
        <div className={`flex gap-3 px-5 py-4 ${look.panel}`}>
          <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${look.tile}`}>
            <VerdictIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${look.label}`}>
              {t('opportunities.metierMatch')} · {metierStatusLabel(opp, t) || t(labelKey)}
            </p>
            {metierCategoryLabel(opp, t) ? (
              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {metierCategoryLabel(opp, t)}
              </p>
            ) : null}
            <p className="mt-1 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{justification}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
