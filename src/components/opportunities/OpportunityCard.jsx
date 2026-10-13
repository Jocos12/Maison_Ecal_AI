import { fr } from 'date-fns/locale';
import { Building2, CalendarDays, ChevronRight, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import ScoreRing from '../ui/ScoreRing.jsx';
import { CATEGORY_BADGE, platformPillClass } from '../../utils/opportunityUi.js';
import { SourceGlyph } from '../../utils/sourceIcons.jsx';
import { formatDeadlineDate, isOpportunityNew } from '../../utils/opportunityDates.js';
import { deadlineUrgency, deadlineTextClass, scorePercent } from '../../utils/opportunityUrgency.js';
import { isGenericKeywordJustification } from '../../utils/scanRelevanceDisplay.js';
import { canQuickApplyOffer } from '../../utils/offerScores.js';

function needsLocationReview(opp) {
  return opp?.locationStatus === 'a_verifier' || opp?.aiAnalysis?.pays_confirme_rdc === 'a_verifier';
}

function Tag({ className, icon: Icon, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      {Icon ? <Icon className="h-2.5 w-2.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/**
 * One opportunity, either as a card (grid view) or as a wide row (`compact`, list view).
 * The whole block opens the details; the "quick apply" chip is a separate action.
 */
export default function OpportunityCard({
  opp,
  onOpen,
  onQuickApply,
  hasApplication = false,
  compact = false,
  index = 0
}) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const showNew = isOpportunityNew(opp);
  const urgency = deadlineUrgency(opp.deadline);
  const showUrgent = opp.isUrgent || urgency.level === 'critical';
  const showSoon = !showUrgent && urgency.level === 'soon';
  const showVerify = needsLocationReview(opp);
  const pct = scorePercent(opp);
  const hasScore = opp.aiAnalysis?.score != null || opp.aiRelevanceScore != null;
  const justification = opp.aiAnalysis?.justification;
  const showJustification = justification && !isGenericKeywordJustification(justification);
  const catBadge = CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance;
  const platformClass = platformPillClass(opp.platform);
  const place = opp.ville && opp.ville !== 'Non précisé' ? opp.ville : '';
  const canQuickApply = canQuickApplyOffer(opp, pct) && onQuickApply && !hasApplication;
  const daysLeft = urgency.days != null && urgency.days >= 0 && urgency.days <= 30 ? urgency.days : null;

  const quickApply = (e) => {
    e.stopPropagation();
    onQuickApply(opp);
  };

  const tags = (
    <div className="flex flex-wrap items-center gap-1.5">
      {showNew ? <Tag className="bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200">{t('opportunities.new')}</Tag> : null}
      {opp.isRecommended ? (
        <Tag icon={Sparkles} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          {t('opportunities.recommended')}
        </Tag>
      ) : null}
      {showUrgent ? <Tag className="bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">{t('opportunities.urgent')}</Tag> : null}
      {showSoon ? (
        <Tag className="bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
          {t('opportunities.closingSoon', { count: urgency.days })}
        </Tag>
      ) : null}
      {hasApplication ? (
        <Tag className="bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300">{t('opportunities.hasApplication')}</Tag>
      ) : null}
      {showVerify ? (
        <Tag className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{t('opportunities.locationToVerify')}</Tag>
      ) : null}
    </div>
  );

  const details = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
      {opp.organization ? (
        <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span className="truncate">{opp.organization}</span>
        </span>
      ) : null}
      {place ? (
        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900">
          <MapPin className="h-3 w-3 flex-none" aria-hidden="true" />
          {place}
        </span>
      ) : null}
      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${catBadge}`}>
        {t(`opportunities.${opp.category}`)}
      </span>
    </div>
  );

  const ring = hasScore ? (
    <span title={t('opportunities.dossierQualityPct', { pct })} className="flex-none">
      <ScoreRing value={pct} size={compact ? 40 : 44} />
    </span>
  ) : null;

  const timeTone =
    urgency.level === 'critical' || urgency.level === 'passed'
      ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
      : urgency.level === 'soon'
        ? 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900'
        : urgency.level === 'none'
          ? 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
          : 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900';

  const deadline = (
    <div className={`inline-flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1 ${timeTone}`}>
      <CalendarDays className="h-4 w-4 flex-none" aria-hidden="true" />
      <div className="min-w-0 leading-tight">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">{t('opportunities.deadline')}</p>
        <p className="text-sm font-bold">
          {urgency.level === 'none' ? t('dashboard.noDeadline') : formatDeadlineDate(opp, locale, t)}
        </p>
        {daysLeft != null ? (
          <p className="text-[11px] font-semibold opacity-80">{t('opportunities.daysLeft', { count: daysLeft })}</p>
        ) : null}
      </div>
    </div>
  );

  const quickApplyChip = canQuickApply ? (
    <span
      role="button"
      tabIndex={0}
      onClick={quickApply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') quickApply(e);
      }}
      className="rounded-lg border border-[#24478a] px-2.5 py-1 text-[11px] font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:border-blue-300 dark:text-blue-300 dark:hover:bg-blue-300 dark:hover:text-slate-900"
    >
      {t('opportunities.quickApply')}
    </span>
  ) : null;

  const animation = { animationDelay: `${(index % 12) * 40}ms` };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => onOpen(opp)}
        className="mecal-fade-up group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#24478a]/50 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/50"
        style={animation}
      >
        <span
          className={`grid h-12 w-12 flex-none place-items-center rounded-xl ring-1 ${platformClass}`}
          title={opp.platform}
        >
          <SourceGlyph source={opp.platform} platform={opp.platform} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-[#24478a] dark:text-white dark:group-hover:text-blue-300">
            {opp.title}
          </h3>
          <div className="mt-1.5">{details}</div>
          {showNew || opp.isRecommended || showUrgent || showSoon || hasApplication || showVerify ? (
            <div className="mt-2">{tags}</div>
          ) : null}
        </div>
        <div className="hidden flex-none md:block">{deadline}</div>
        {canQuickApply ? <div className="hidden flex-none lg:block">{quickApplyChip}</div> : null}
        {ring}
        <ChevronRight
          className="h-4 w-4 flex-none text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#24478a] dark:text-slate-600"
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(opp)}
      className="mecal-fade-up group flex h-full w-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#24478a]/50 hover:shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/15 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-400/50"
      style={animation}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${platformClass}`}
        >
          <SourceGlyph source={opp.platform} platform={opp.platform} className="h-3.5 w-3.5" />
          {opp.platform}
        </span>
        {ring}
      </div>

      <h3 className="mt-3 line-clamp-3 text-[15px] font-bold leading-snug text-slate-900 transition group-hover:text-[#24478a] dark:text-white dark:group-hover:text-blue-300">
        {opp.title}
      </h3>
      <div className="mt-2.5">{details}</div>
      {showJustification ? (
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{justification}</p>
      ) : null}
      {showNew || opp.isRecommended || showUrgent || showSoon || hasApplication || showVerify ? (
        <div className="mt-3">{tags}</div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="mt-3 min-w-0">{deadline}</div>
        <div className="flex items-center gap-2 pb-0.5">
          {quickApplyChip}
          {opp.sourceUrl && !opp.deadline ? (
            <span className="whitespace-nowrap text-[11px] font-semibold text-[#24478a] group-hover:underline dark:text-blue-300">
              {t('opportunities.verifyOnSource')}
            </span>
          ) : (
            <ExternalLink
              className="h-4 w-4 text-slate-300 transition group-hover:text-[#24478a] dark:text-slate-600"
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    </button>
  );
}
