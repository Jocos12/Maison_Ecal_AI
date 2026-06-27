import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';
import { ExternalLink } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing.jsx';
import { CATEGORY_BADGE, platformPillClass } from '../../utils/opportunityUi.js';

const cityColors = {
  Bukavu: 'bg-green-500 text-white',
  Goma: 'bg-blue-500 text-white',
  Kinshasa: 'bg-orange-500 text-white',
  Kalemie: 'bg-violet-500 text-white',
  Lubumbashi: 'bg-red-500 text-white',
  RDC: 'bg-slate-600 text-white'
};

function isRecent(createdAt) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < 48 * 60 * 60 * 1000;
}

function isClosingSoon(deadline) {
  if (!deadline) return false;
  const days = (new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 7;
}

function needsLocationReview(opp) {
  return opp?.locationStatus === 'a_verifier' || opp?.aiAnalysis?.pays_confirme_rdc === 'a_verifier';
}

function scorePercent(opp) {
  if (opp.aiAnalysis?.score != null) {
    return opp.aiAnalysis.score > 1 ? Math.round(opp.aiAnalysis.score) : Math.round(opp.aiAnalysis.score * 100);
  }
  if (opp.aiRelevanceScore != null) return Math.round(opp.aiRelevanceScore * 100);
  return 0;
}

export default function OpportunityCard({ opp, onOpen, compact = false, index = 0 }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const showNew = opp.isNew || isRecent(opp.createdAt);
  const showUrgent = opp.isUrgent || isClosingSoon(opp.deadline);
  const showVerify = needsLocationReview(opp);
  const pct = scorePercent(opp);
  const catBadge = CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance;
  const platformClass = platformPillClass(opp.platform);

  return (
    <button
      type="button"
      onClick={() => onOpen(opp)}
      className={`mecal-fade-up group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-blue-500/50 ${
        compact ? 'flex flex-col gap-3 md:flex-row md:items-center' : 'flex flex-col gap-3'
      }`}
      style={{ animationDelay: `${(index % 12) * 50}ms` }}
    >
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 flex-1 font-bold leading-snug text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
            {opp.title}
          </h3>
          {pct > 0 ? <ScoreRing value={pct} /> : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {showNew ? (
            <span className="mecal-pulse-badge rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {t('opportunities.new')}
            </span>
          ) : null}
          {showUrgent ? (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              {t('opportunities.urgent')}
            </span>
          ) : null}
          {showVerify ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-950">
              {t('opportunities.locationToVerify')}
            </span>
          ) : null}
          {opp.ville && opp.ville !== 'Non précisé' ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cityColors[opp.ville] || cityColors.RDC}`}
            >
              {opp.ville}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catBadge}`}>
            {t(`opportunities.${opp.category}`)}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ring-1 ${platformClass}`}>
            {opp.platform}
          </span>
        </div>

        {opp.organization ? (
          <p className="line-clamp-1 text-sm text-slate-500 dark:text-slate-400">{opp.organization}</p>
        ) : null}
      </div>

      <div
        className={`flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800 ${
          compact ? 'md:border-t-0 md:pt-0 md:pl-4 md:border-l' : 'mt-auto'
        }`}
      >
        <span className={showUrgent ? 'font-semibold text-red-600' : 'text-slate-500'}>
          {t('opportunities.deadline')}:{' '}
          {opp.deadline ? format(new Date(opp.deadline), 'dd MMM yyyy', { locale }) : '—'}
        </span>
        <ExternalLink className="h-4 w-4 text-slate-400 transition group-hover:text-blue-600" />
      </div>
    </button>
  );
}
