export function rankOffersLocally(offers = []) {
  const isJob = (o) =>
    o.aiAnalysis?.type === 'offre_emploi' ||
    o.aiAnalysis?.est_emploi ||
    /recrut|emploi|consultant|poste|vacance/i.test(o.title || '');

  if (!offers.length) {
    return { summary: 'Aucune offre vérifiée à analyser.', picks: [], provider: 'local' };
  }

  const picks = [...offers]
    .sort(
      (a, b) =>
        (b.aiAnalysis?.score ?? b.aiRelevanceScore ?? 0) -
        (a.aiAnalysis?.score ?? a.aiRelevanceScore ?? 0)
    )
    .slice(0, 3)
    .map((o) => ({
      id: o._id,
      score: Math.round(
        (o.aiAnalysis?.score ?? o.aiRelevanceScore ?? 50) *
          ((o.aiAnalysis?.score ?? 0) > 1 ? 1 : 100)
      ),
      reason: isJob(o)
        ? 'Offre emploi/recrutement — priorité haute'
        : 'Mission logistique vérifiée RDC',
      action: isJob(o) ? 'postuler' : 'surveiller',
      offer: o
    }));

  const jobs = offers.filter(isJob).length;
  return {
    summary: `${offers.length} offre(s) vérifiée(s) RDC (${jobs} emploi/recrutement). Classement par score de veille M-ECAL.`,
    picks,
    provider: 'local'
  };
}
