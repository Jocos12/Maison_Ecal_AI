import { format } from 'date-fns';

/** Number of days an offer stays "new" after first detection. Adjust here. */
export const NEW_OPPORTUNITY_DAYS = 7;

export function firstDetectedAt(opp) {
  return opp?.firstSeenAt || opp?.createdAt || null;
}

export function isOpportunityNew(opp, days = NEW_OPPORTUNITY_DAYS) {
  const first = firstDetectedAt(opp);
  if (!first) return false;
  const ts = new Date(first).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < days * 24 * 60 * 60 * 1000;
}

export function formatPostedDate(opp, locale, t) {
  const raw = opp?.postedDate || opp?.firstSeenAt || opp?.scrapedAt || opp?.createdAt;
  if (raw) {
    try {
      return format(new Date(raw), 'dd MMM yyyy', { locale });
    } catch {
      return t('opportunities.postedUnspecified');
    }
  }
  return t('opportunities.postedUnspecified');
}

export function formatDeadlineDate(opp, locale, t) {
  if (opp?.deadline) {
    try {
      return format(new Date(opp.deadline), 'dd MMM yyyy', { locale });
    } catch {
      return t('opportunities.deadlineUnspecified');
    }
  }
  return t('opportunities.deadlineUnspecified');
}

export function formatDeadlineLong(opp, locale, t) {
  if (opp?.deadline) {
    try {
      return format(new Date(opp.deadline), 'PP', { locale });
    } catch {
      return t('opportunities.deadlineUnspecified');
    }
  }
  return t('opportunities.deadlineUnspecified');
}

export function formatPostedLong(opp, locale, t) {
  const raw = opp?.postedDate || opp?.firstSeenAt || opp?.scrapedAt || opp?.createdAt;
  if (raw) {
    try {
      return format(new Date(raw), 'PP', { locale });
    } catch {
      return t('opportunities.postedUnspecified');
    }
  }
  return t('opportunities.postedUnspecified');
}
