export function getMatchScore(app) {
  const opp = app.opportunity;
  if (!opp) return 0;
  if (opp.aiAnalysis?.score != null) return Math.round(Number(opp.aiAnalysis.score));
  if (opp.aiRelevanceScore != null) return Math.round(Number(opp.aiRelevanceScore) * 100);
  return 0;
}

export function isAnswered(status) {
  return ['interview', 'won', 'rejected'].includes(status);
}

export function isPending(status) {
  return ['pending', 'submitted'].includes(status);
}

export function isApplied(status) {
  return status !== 'draft';
}

function daysSince(date) {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export function applicationDate(app) {
  const raw = app?.appliedDate || app?.sentOn || app?.createdAt || app?.updatedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export { daysSince };

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function buildMarketingStats(applications = []) {
  const applied = applications.filter((a) => isApplied(a.status));
  const answered = applied.filter((a) => isAnswered(a.status));
  const pending = applied.filter((a) => isPending(a.status));
  const scores = applied.map(getMatchScore).filter((s) => s > 0);
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;

  const pendingDays = pending.map((a) => daysSince(a.appliedDate || a.createdAt));
  const avgPendingDays = pendingDays.length
    ? Math.round(pendingDays.reduce((sum, d) => sum + d, 0) / pendingDays.length)
    : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const thisMonth = applied.filter((a) => new Date(a.createdAt) >= monthStart);
  const lastMonth = applied.filter((a) => {
    const d = new Date(a.createdAt);
    return d >= prevMonthStart && d <= prevMonthEnd;
  });

  const avgThisMonth = thisMonth.length
    ? Math.round(thisMonth.map(getMatchScore).reduce((s, x) => s + x, 0) / thisMonth.length)
    : avgScore;
  const avgLastMonth = lastMonth.length
    ? Math.round(lastMonth.map(getMatchScore).reduce((s, x) => s + x, 0) / lastMonth.length)
    : avgScore;
  const scoreEvolution = avgScore - avgLastMonth;

  const enriched = applied.map((a) => ({
    source: a.opportunity?.platform || 'M-ECAL',
    category: a.opportunity?.category || a.opportunity?.aiAnalysis?.categorie || 'n/d',
    matchScore: getMatchScore(a),
    status: a.status,
    createdAt: a.createdAt,
    appliedDate: a.appliedDate
  }));

  return {
    total: applied.length,
    answered: answered.length,
    answerRate: applied.length ? Math.round((answered.length / applied.length) * 100) : 0,
    pending: pending.length,
    avgPendingDays,
    avgScore,
    scoreEvolution,
    bySource: groupBy(enriched, (a) => a.source),
    byCategory: groupBy(enriched, (a) => a.category),
    noFollowUp: applied.filter(
      (a) => isPending(a.status) && daysSince(a.appliedDate || a.createdAt) > 7
    ).length
  };
}

export function buildWeeklyChart(applications = [], locale = 'fr-FR') {
  const applied = applications.filter((a) => isApplied(a.status));
  const dated = applied
    .map((a) => ({ a, d: applicationDate(a) }))
    .filter((x) => x.d);

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  let spanStart = new Date(now.getTime() - 5 * WEEK_MS);
  spanStart.setHours(0, 0, 0, 0);

  if (dated.length) {
    const oldest = new Date(Math.min(...dated.map((x) => x.d.getTime())));
    oldest.setHours(0, 0, 0, 0);
    if (oldest < spanStart) spanStart = oldest;
  }

  const spanMs = Math.max(WEEK_MS, now.getTime() - spanStart.getTime());
  const bucketMs = Math.max(WEEK_MS, Math.ceil(spanMs / 6));

  const weeks = [];
  for (let i = 5; i >= 0; i -= 1) {
    const end = new Date(now.getTime() - i * bucketMs);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - bucketMs + 1);
    start.setHours(0, 0, 0, 0);
    weeks.push({ start, end, index: 6 - i });
  }

  return weeks.map(({ start, end, index }) => {
    const inRange = dated.filter((x) => x.d >= start && x.d <= end).map((x) => x.a);
    return {
      week: `S${index}`,
      periode: `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`,
      soumises: inRange.length,
      repondues: inRange.filter((a) => isAnswered(a.status)).length
    };
  });
}

export const STATUS_LABELS = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  pending: 'En attente',
  interview: 'Entretien',
  won: 'Accepté',
  rejected: 'Rejeté'
};

export const EMAIL_TEMPLATES = [
  { key: 'cold_outreach', label: 'Cold outreach', desc: 'Premier contact M-ECAL' },
  { key: 'followup_j7', label: 'Suivi J+7', desc: 'Relance après candidature' },
  { key: 'followup_j14', label: 'Relance J+14', desc: 'Sans réponse' },
  { key: 'collaboration_b2b', label: 'Collaboration B2B', desc: 'Partenariat logistique' },
  { key: 'newsletter', label: 'Newsletter', desc: 'Veille mensuelle RDC' },
  { key: 'post_interview', label: 'Post-entretien', desc: 'Remerciement & suite' }
];

export function getRecentApplications(applications = [], limit = 4) {
  return applications
    .filter((a) => isApplied(a.status))
    .slice(0, limit)
    .map((a) => ({
      id: a._id,
      title: a.opportunity?.title || 'Candidature',
      source: a.opportunity?.platform || 'M-ECAL',
      score: getMatchScore(a),
      status: a.status,
      statusLabel: STATUS_LABELS[a.status] || a.status,
      daysPending: daysSince(a.appliedDate || a.createdAt),
      opportunityId: a.opportunity?._id || a.opportunity
    }));
}

export function getPendingApplications(applications = []) {
  return applications
    .filter((a) => isPending(a.status))
    .map((a) => ({
      id: a._id,
      title: a.opportunity?.title || 'Candidature',
      source: a.opportunity?.platform || 'M-ECAL',
      daysPending: daysSince(a.appliedDate || a.sentOn || a.createdAt),
      status: a.status,
      opportunityId: a.opportunity?._id || a.opportunity,
      contact: a.contactPerson?.email || a.actualRecipientContact || ''
    }))
    .sort((a, b) => b.daysPending - a.daysPending);
}

export function getStatusIconType(status) {
  if (['pending', 'submitted'].includes(status)) return 'clock';
  if (status === 'interview') return 'send';
  if (['won', 'rejected'].includes(status)) return 'check';
  return 'clock';
}

export const PRIORITY_STYLES = {
  haute: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'Haute'
  },
  moyenne: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-100 text-orange-700',
    label: 'Moyenne'
  },
  opportunite: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Opportunité'
  }
};
