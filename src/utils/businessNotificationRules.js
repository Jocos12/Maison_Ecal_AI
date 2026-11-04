const DAY = 86400000;

/** Calendar day of a stored date (the YYYY-MM-DD prefix, not the local shift of UTC midnight). */
export function storedDay(value) {
  if (value == null || value === '') return null;
  const text = value instanceof Date ? value.toISOString() : String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function localDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Whole days from today until the end date. Negative means the date has passed. */
export function daysUntil(end, now = new Date()) {
  const target = storedDay(end);
  const today = localDay(now);
  if (target == null || today == null) return null;
  return Math.round((target - today) / DAY);
}

/** Thresholds already reached: 7, then 3, then 1. A past date is not a new alert. */
export function crossedThresholds(days) {
  if (days == null || days < 0) return [];
  const hit = [];
  if (days <= 7) hit.push(7);
  if (days <= 3) hit.push(3);
  if (days <= 1) hit.push(1);
  return hit;
}

export function daysSince(value, now = new Date()) {
  const start = storedDay(value);
  const today = localDay(now);
  if (start == null || today == null) return 0;
  return Math.max(0, Math.round((today - start) / DAY));
}

/** One step per delay band, so a 130-day wait is not a new alert every day. */
export function followUpBucket(days) {
  if (days >= 90) return 90;
  if (days >= 60) return 60;
  if (days >= 30) return 30;
  if (days >= 14) return 14;
  return 0;
}

export const OPEN_APPLICATION = new Set(['submitted', 'pending', 'interview']);
export const ACTIVE_CONTRACT = new Set(['en_cours', 'en_attente', 'gagne']);
export const STATUS_ALERT = new Set(['interview', 'won']);
