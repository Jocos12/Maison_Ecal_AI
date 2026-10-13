import { AlertTriangle, BadgeCheck, ClipboardList, FileSearch } from 'lucide-react';
import ScoreRing from '../ui/ScoreRing.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { isGenericKeywordJustification } from '../../utils/scanRelevanceDisplay.js';
import {
  LOW_DOSSIER_QUALITY,
  dualScoreHintKey,
  isMetierConfirmed,
  metierCategoryLabel,
  metierStatusLabel
} from '../../utils/offerScores.js';

export default function DualScorePanel({ opp, pct, hasScore }) {
  const { t } = useI18n();
  const match = opp?.strictMecalMatch;
  const category = metierCategoryLabel(opp, t) || t('opportunities.metierCategoryUnknown');
  const statusLabel = metierStatusLabel(opp, t);
  const confirmed = isMetierConfirmed(opp);
  const lowDossier = hasScore && pct < LOW_DOSSIER_QUALITY;
  const dossierJustif = opp.aiAnalysis?.justification;
  const showDossierJustif = dossierJustif && !isGenericKeywordJustification(dossierJustif);
  const metierJustif = match?.justification;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${
            confirmed
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
              : match
                ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`grid h-7 w-7 place-items-center rounded-lg text-white ${
                confirmed ? 'bg-emerald-600' : match ? 'bg-amber-500' : 'bg-slate-500'
              }`}
            >
              {confirmed ? (
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
              {t('opportunities.metierMatch')}
            </p>
          </div>
          <p className="mt-2.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">
            {statusLabel || t('opportunities.metierMatchUnknown')}
          </p>
          {match ? (
            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">{category}</p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{t('opportunities.metierMatchMissing')}</p>
          )}
        </div>

        {hasScore ? (
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
            <ScoreRing value={pct} size={46} stroke={4} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('opportunities.dossierQuality')}
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-600 dark:text-slate-300">
                {t('opportunities.dossierQualityPct', { pct })}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#c9d8f1] bg-[#eaf0fb] p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
        {t(dualScoreHintKey(opp, pct), { category })}
      </div>

      {confirmed && lowDossier ? (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-600" aria-hidden="true" />
          <p>{t('opportunities.lowDossierWarning')}</p>
        </div>
      ) : null}

      {metierJustif || showDossierJustif ? (
        <div className={`grid gap-3 ${metierJustif && showDossierJustif ? 'sm:grid-cols-2' : ''}`}>
          {metierJustif ? (
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 dark:border-emerald-900 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-300">
                {t('opportunities.metierMatchReason')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{metierJustif}</p>
            </div>
          ) : null}
          {showDossierJustif ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                {t('opportunities.dossierQualityReason')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{dossierJustif}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
