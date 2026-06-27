export function isDeadlineActive(opp) {
  if (!opp?.deadline) return true;
  return new Date(opp.deadline) >= new Date();
}

export function mecalFitScore(opp) {
  const ai = opp?.aiAnalysis?.score;
  if (ai != null) return ai > 1 ? ai : ai * 100;
  if (opp?.aiRelevanceScore != null) return opp.aiRelevanceScore * 100;
  return 50;
}

export function filterSourcesOpportunities(opportunities = [], filters = {}) {
  let list = [...opportunities];

  if (filters.deadlineActive) {
    list = list.filter(isDeadlineActive);
  }

  if (filters.mecalFitOnly) {
    list = list.filter((o) => mecalFitScore(o) >= 55);
  }

  if (filters.city) {
    list = list.filter((o) => o.ville === filters.city);
  }

  if (filters.category) {
    list = list.filter((o) => o.category === filters.category);
  }

  if (filters.employmentOnly) {
    list = list.filter(
      (o) =>
        o.aiAnalysis?.est_emploi ||
        o.aiAnalysis?.type === 'offre_emploi' ||
        /recrut|emploi|consultant|poste/i.test(o.title || '')
    );
  }

  return list.sort((a, b) => mecalFitScore(b) - mecalFitScore(a));
}

export function opportunityToJob(opp) {
  return {
    title: opp.title,
    organization: opp.organization || opp.platform || 'Organisation',
    city: opp.ville || 'RDC',
    contractType: 'Non précisé',
    deadline: opp.deadline
      ? new Date(opp.deadline).toLocaleDateString('fr-FR')
      : 'Non précisé',
    sourceUrl: opp.sourceUrl || '',
    platform: opp.platform || 'M-ECAL',
    verified: Boolean(opp.sourceUrl)
  };
}
