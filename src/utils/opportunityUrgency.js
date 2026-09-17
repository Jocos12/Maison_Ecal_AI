const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const ts = new Date(deadline).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.ceil((ts - Date.now()) / DAY_MS);
}

/** none | passed | critical (<7j) | soon (<15j) | ok */
export function deadlineUrgency(deadline) {
  const days = daysUntilDeadline(deadline);
  if (days == null) return { level: 'none', days: null };
  if (days < 0) return { level: 'passed', days };
  if (days <= 7) return { level: 'critical', days };
  if (days <= 15) return { level: 'soon', days };
  return { level: 'ok', days };
}

export function urgencyBadgeClass(level) {
  if (level === 'critical' || level === 'passed') return 'bg-red-600 text-white';
  if (level === 'soon') return 'bg-orange-500 text-white';
  if (level === 'ok') return 'bg-emerald-600 text-white';
  return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
}

export function deadlineTextClass(level) {
  if (level === 'critical' || level === 'passed') return 'font-semibold text-red-600 dark:text-red-400';
  if (level === 'soon') return 'font-semibold text-orange-600 dark:text-orange-400';
  return 'text-slate-500 dark:text-slate-400';
}

const VIEWED_KEY = 'mecal-opps-viewed';

export function getViewedOpportunityIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(VIEWED_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(String) : [];
  } catch {
    return [];
  }
}

export function markOpportunityViewed(id) {
  if (!id) return;
  const next = [...new Set([...getViewedOpportunityIds(), String(id)])];
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(next.slice(-800)));
  } catch {
    /* ignore */
  }
}

/** Normalize a stored score to 0–100. `aiRelevanceScore` is 0–1; `aiAnalysis.score` is 0–100 (sometimes 0–1). */
function storedScoreToPercent(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n > 1) return Math.round(Math.min(100, n));
  return Math.round(n * 100);
}

export function scorePercent(opp) {
  const fromRelevance = storedScoreToPercent(opp?.aiRelevanceScore);
  const fromAnalysis = storedScoreToPercent(opp?.aiAnalysis?.score);
  const candidates = [fromRelevance, fromAnalysis].filter((v) => v != null);
  if (!candidates.length) return 0;
  return Math.max(...candidates);
}

export function relevanceOutOf10(opp) {
  return Math.max(0, Math.min(10, Math.round(scorePercent(opp) / 10)));
}
