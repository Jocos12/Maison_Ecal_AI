const STATUS_COLORS = {
  submitted: '#24478a',
  pending: '#f59e0b',
  won: '#10b981',
  rejected: '#ef4444',
  interview: '#8b5cf6',
  draft: '#94a3b8'
};

const DAY_MS = 86400000;

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function validDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function entriesOf(map) {
  if (!map) return [];
  return map instanceof Map ? [...map.entries()] : Object.entries(map);
}

/** Offers found and saved, one point per day (several runs on the same day are added together). */
export function buildJobsFoundData(logs = [], locale = 'fr-FR') {
  const days = new Map();
  for (const log of logs) {
    const d = validDate(log.startedAt);
    if (!d) continue;
    const key = dayKey(d);
    const row = days.get(key) || { time: startOfDay(d).getTime(), found: 0, saved: 0, skipped: 0 };
    row.found += Number(log.totalRaw) || 0;
    row.saved += Number(log.saved) || 0;
    row.skipped += Number(log.skipped) || 0;
    days.set(key, row);
  }
  return [...days.values()]
    .sort((a, b) => a.time - b.time)
    .slice(-10)
    .map((row) => ({
      date: new Date(row.time).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
      found: row.found,
      saved: row.saved,
      skipped: row.skipped
    }));
}

export function buildApplicationStatusData(applications = []) {
  const counts = {};
  for (const app of applications) {
    const key = app.status || 'draft';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([key, value]) => ({
    key,
    value,
    color: STATUS_COLORS[key] || '#24478a'
  }));
}

/** Why offers were set aside, all runs together. `key` is the reason code used by the collection agent. */
export function buildRejectionReasonsData(logs = []) {
  const totals = {};
  for (const log of logs) {
    for (const [key, count] of entriesOf(log.skipReasons)) {
      totals[key] = (totals[key] || 0) + (Number(count) || 0);
    }
  }
  return Object.entries(totals)
    .map(([key, count]) => ({ key, count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

/** Offers per platform, as counted by the server. */
export function buildSourcePerformanceData(bySource = []) {
  return bySource
    .map((row) => ({ source: row.source || 'M-ECAL', found: Number(row.count) || 0 }))
    .filter((row) => row.found > 0)
    .sort((a, b) => b.found - a.found)
    .slice(0, 6);
}

function lastSevenDays() {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY_MS));
}

/** The last seven days, oldest first, with what happened on each of them. */
export function buildWeeklyActivityData(logs = [], applications = [], messages = [], locale = 'fr-FR') {
  const days = lastSevenDays().map((date) => ({
    id: dayKey(date),
    day: date.toLocaleDateString(locale, { weekday: 'short' }),
    collectes: 0,
    candidatures: 0,
    messages: 0
  }));
  const bump = (value, field) => {
    const d = validDate(value);
    if (!d) return;
    const row = days.find((r) => r.id === dayKey(d));
    if (row) row[field] += 1;
  };
  for (const log of logs) bump(log.startedAt, 'collectes');
  for (const app of applications) bump(app.appliedDate || app.createdAt, 'candidatures');
  for (const msg of messages) bump(msg.date || msg.internalDate, 'messages');
  return days;
}

export function buildPendingApplications(applications = [], locale = 'fr-FR') {
  return applications
    .filter((a) => ['pending', 'submitted', 'interview'].includes(a.status))
    .slice(0, 10)
    .map((a) => {
      const d = validDate(a.appliedDate) || validDate(a.createdAt);
      return {
        id: a._id,
        post: a.opportunity?.title || '',
        org: a.opportunity?.organization || a.opportunity?.platform || '',
        src: a.opportunity?.platform || 'M-ECAL',
        date: d ? d.toLocaleDateString(locale) : '',
        status: a.status
      };
    });
}

export function buildKpis({ opportunities = [], applications = [], messages = [], logs = [] }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const collectedThisMonth = opportunities.filter((o) => new Date(o.createdAt) >= monthStart).length;
  return {
    collected: collectedThisMonth || opportunities.length,
    saved: opportunities.filter((o) => !o.isArchived).length,
    lastSaved: logs.slice(0, 3).reduce((sum, l) => sum + (l.saved || 0), 0),
    applications: applications.length,
    pending: applications.filter((a) => ['pending', 'submitted', 'interview'].includes(a.status)).length,
    messages: messages.length,
    unread: messages.filter((m) => m.unread || m.isRead === false).length
  };
}

/** The path from a collected offer to an accepted application, with the real count at each stage. */
export function buildPipeline({ logs = [], applications = [] }) {
  const sum = (field) => logs.reduce((total, log) => total + (Number(log[field]) || 0), 0);
  const answered = applications.filter((a) => ['interview', 'won', 'rejected'].includes(a.status)).length;
  return [
    { key: 'found', value: sum('totalRaw'), color: '#24478a' },
    { key: 'saved', value: sum('saved'), color: '#0f766e' },
    { key: 'applied', value: applications.filter((a) => a.status !== 'draft').length, color: '#7c3aed' },
    { key: 'answered', value: answered, color: '#f59e0b' },
    { key: 'won', value: applications.filter((a) => a.status === 'won').length, color: '#10b981' }
  ];
}
