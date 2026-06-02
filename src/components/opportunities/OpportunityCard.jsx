import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';
import { ExternalLink, Sparkles } from 'lucide-react';

const catColors = {
  formation: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  formation_chauffeurs: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  consultance: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  inventaire: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  inventaire_actifs: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
  inventaire_general: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30',
  etude_marche: 'bg-violet-500/15 text-violet-200 border-violet-500/30',
  assistance: 'bg-slate-500/20 text-slate-200 border-slate-500/30'
};

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

export default function OpportunityCard({ opp, onOpen, compact = false }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const showNew = opp.isNew || isRecent(opp.createdAt);
  const showUrgent = opp.isUrgent || isClosingSoon(opp.deadline);

  return (
    <button
      type="button"
      onClick={() => onOpen(opp)}
      className={`w-full text-left rounded-xl border border-slate-200 bg-white/80 p-4 hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-lg transition dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:shadow-blue-900/20 ${
        compact ? 'flex flex-col gap-2 md:flex-row md:items-center md:justify-between' : 'flex flex-col gap-2'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 md:flex-1">
        <h3 className="font-semibold text-slate-950 leading-snug line-clamp-2 dark:text-white">{opp.title}</h3>
        <div className="flex flex-wrap gap-1 shrink-0">
          {showNew && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
              {t('opportunities.new')}
            </span>
          )}
          {showUrgent && (
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-red-600 text-white">
              {t('opportunities.urgent')}
            </span>
          )}
          {opp.ville && opp.ville !== 'Non précisé' && (
            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${cityColors[opp.ville] || cityColors.RDC}`}>
              {opp.ville}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={`rounded-full border px-2 py-0.5 ${catColors[opp.category] || catColors.assistance}`}>
          {t(`opportunities.${opp.category}`)}
        </span>
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-slate-600 dark:border-slate-600 dark:text-slate-300">{opp.platform}</span>
      </div>
      {opp.organization && <p className="text-sm text-slate-500 line-clamp-1 dark:text-slate-400">{opp.organization}</p>}
      <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-2 border-t border-slate-200 dark:border-slate-800">
        <span>
          {t('opportunities.deadline')}:{' '}
          {opp.deadline
            ? format(new Date(opp.deadline), 'dd MMM yyyy', { locale })
            : '—'}
        </span>
        {opp.aiRelevanceScore != null && (
          <span className="flex items-center gap-1 text-blue-300" title={t('opportunities.aiScore')}>
            <Sparkles className="h-3 w-3" />
            {Math.round(opp.aiRelevanceScore * 100)}%
          </span>
        )}
        <ExternalLink className="h-4 w-4 text-slate-500" />
      </div>
    </button>
  );
}
