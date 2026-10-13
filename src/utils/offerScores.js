/** Dossier quality is treated as “thin” below this (still actionable). */
export const LOW_DOSSIER_QUALITY = 40;

export function isMetierConfirmed(opp) {
  return opp?.strictMecalMatch?.status === 'metier_confirme';
}

export function metierCategoryLabel(opp, t) {
  const match = opp?.strictMecalMatch;
  if (!match) return '';
  if (match.categoryLabel) return match.categoryLabel;
  if (match.category) {
    const key = `opportunities.${match.category}`;
    const label = t(key);
    return label === key ? match.category : label;
  }
  return '';
}

export function metierStatusLabel(opp, t) {
  const match = opp?.strictMecalMatch;
  if (!match?.status) return '';
  if (match.status === 'metier_confirme') return t('pages.strictMecal.confirmed');
  if (match.status === 'a_verifier') return t('pages.strictMecal.review');
  if (match.status === 'hors_metier') return t('pages.strictMecal.hors');
  return match.statusLabel || '';
}

export function dualScoreHintKey(opp, pct) {
  const status = opp?.strictMecalMatch?.status;
  if (status === 'metier_confirme' && pct < LOW_DOSSIER_QUALITY) return 'opportunities.dualScoreHintConfirmedLow';
  if (status === 'metier_confirme') return 'opportunities.dualScoreHintConfirmedOk';
  if (status === 'a_verifier') return 'opportunities.dualScoreHintReview';
  if (status === 'hors_metier') return 'opportunities.dualScoreHintHors';
  return 'opportunities.dualScoreHintGeneric';
}

/** Quick apply may be gated on high dossier quality, except métier-confirmed offers. */
export function canQuickApplyOffer(opp, pct) {
  if (isMetierConfirmed(opp)) return true;
  return pct >= 70;
}
