const STATUS_LABELS = {
  draft: 'Brouillon',
  submitted: 'Postulé',
  pending: 'En attente',
  interview: 'En cours',
  won: 'Accepté',
  rejected: 'Refusé'
};

const STATUS_COLORS = {
  submitted: '#6366f1',
  pending: '#f59e0b',
  won: '#10b981',
  rejected: '#ef4444',
  interview: '#8b5cf6',
  draft: '#94a3b8'
};

const SKIP_REASON_LABELS = {
  hors_services: 'Hors services',
  rejected_ia: 'Rejeté IA',
  hors_logistique: 'Hors logistique',
  offre_emploi: 'Offre emploi',
  score_faible: 'Score faible',
  duplicate: 'Doublon',
  expired: 'Expiré'
};

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function formatWeekLabel(weekKey = '') {
  const parts = String(weekKey).split('-');
  if (parts.length === 2) return `${parts[1]}/${parts[0].slice(2)}`;
  return weekKey;
}

export function buildJobsFoundData(logs = []) {
  const recent = [...logs]
    .filter((l) => l.startedAt)
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt))
    .slice(-8);

  if (!recent.length) {
    return [{ date: '—', found: 0, saved: 0, skipped: 0 }];
  }

  return recent.map((log) => ({
    date: new Date(log.startedAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    }),
    found: log.totalRaw || 0,
    saved: log.saved || 0,
    skipped: log.skipped || 0
  }));
}

export function buildApplicationStatusData(applications = []) {
  const counts = {};
  for (const app of applications) {
    const key = app.status || 'draft';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
    color: STATUS_COLORS[status] || '#6366f1'
  }));
}

export function buildRejectionReasonsData(logs = []) {
  const totals = {};
  for (const log of logs) {
    const reasons = log.skipReasons;
    if (!reasons) continue;
    const entries =
      reasons instanceof Map ? [...reasons.entries()] : Object.entries(reasons);
    for (const [key, count] of entries) {
      totals[key] = (totals[key] || 0) + Number(count) || 0;
    }
  }
  return Object.entries(totals)
    .map(([reason, count]) => ({
      reason: SKIP_REASON_LABELS[reason] || reason.replace(/_/g, ' '),
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export function buildSourcePerformanceData(bySource = [], logs = []) {
  const qualityBySource = {};
  for (const log of logs) {
    const platforms = log.byPlatform;
    if (!platforms) continue;
    const entries =
      platforms instanceof Map ? [...platforms.entries()] : Object.entries(platforms);
    for (const [source, found] of entries) {
      if (!qualityBySource[source]) {
        qualityBySource[source] = { found: 0, saved: 0 };
      }
      qualityBySource[source].found += Number(found) || 0;
    }
  }

  return bySource.slice(0, 6).map((row) => {
    const perf = qualityBySource[row.source] || {};
    const found = row.count || perf.found || 0;
    const quality =
      perf.found > 0 ? Math.round(((perf.saved || row.count * 0.15) / perf.found) * 100) : 65;
    return {
      source: row.source,
      found,
      quality: Math.min(100, Math.max(20, quality))
    };
  });
}

export function buildClientMessagesData(messages = []) {
  const months = {};
  const now = new Date();
  for (let i = 2; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('fr-FR', { month: 'short' });
    months[key] = { month: key, reçus: 0, traités: 0, enAttente: 0 };
  }

  for (const msg of messages) {
    const date = new Date(msg.date || msg.internalDate);
    if (Number.isNaN(date.getTime())) continue;
    const key = date.toLocaleDateString('fr-FR', { month: 'short' });
    if (!months[key]) {
      months[key] = { month: key, reçus: 0, traités: 0, enAttente: 0 };
    }
    months[key].reçus += 1;
    if (msg.unread || msg.isRead === false) months[key].enAttente += 1;
    else months[key].traités += 1;
  }

  return Object.values(months);
}

export function buildWeeklyActivityData(logs = [], applications = [], messages = []) {
  const days = DAY_LABELS.map((day) => ({
    day,
    collectes: 0,
    candidatures: 0,
    messages: 0
  }));

  const bump = (dateValue, field) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return;
    const diff = (Date.now() - date.getTime()) / 86400000;
    if (diff > 7) return;
    days[date.getDay()][field] += 1;
  };

  for (const log of logs) bump(log.startedAt, 'collectes');
  for (const app of applications) bump(app.appliedDate || app.createdAt, 'candidatures');
  for (const msg of messages) bump(msg.date || msg.internalDate, 'messages');

  const ordered = [...days.slice(1), days[0]];
  return ordered;
}

export function buildPendingApplications(applications = []) {
  return applications
    .filter((a) => ['pending', 'submitted', 'interview'].includes(a.status))
    .slice(0, 10)
    .map((a) => ({
      id: a._id,
      post: a.opportunity?.title || 'Poste',
      org: a.opportunity?.organization || a.opportunity?.platform || '—',
      src: a.opportunity?.platform || 'M-ECAL',
      date: a.appliedDate
        ? new Date(a.appliedDate).toLocaleDateString('fr-FR')
        : new Date(a.createdAt).toLocaleDateString('fr-FR'),
      status: STATUS_LABELS[a.status] || a.status,
      color: a.status === 'interview' ? 'blue' : 'yellow'
    }));
}

export function buildKpis({ opportunities = [], applications = [], messages = [], logs = [] }) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const collectedThisMonth = opportunities.filter(
    (o) => new Date(o.createdAt) >= monthStart
  ).length;

  const savedCount = opportunities.filter((o) => !o.isArchived).length;
  const pendingApps = applications.filter((a) =>
    ['pending', 'submitted', 'interview'].includes(a.status)
  ).length;
  const unreadMsgs = messages.filter((m) => m.unread || m.isRead === false).length;

  const lastWeekSaved = logs.slice(0, 3).reduce((sum, l) => sum + (l.saved || 0), 0);

  return [
    {
      label: 'Offres collectées',
      value: String(collectedThisMonth || opportunities.length),
      sub: 'Ce mois',
      icon: '🔍'
    },
    {
      label: 'Offres sauvegardées',
      value: String(savedCount),
      sub: lastWeekSaved ? `+${lastWeekSaved} dernières collectes` : 'Actives',
      icon: '💾'
    },
    {
      label: 'Candidatures',
      value: String(applications.length),
      sub: `${pendingApps} en attente`,
      icon: '📬'
    },
    {
      label: 'Messages clients',
      value: String(messages.length),
      sub: `${unreadMsgs} non lus`,
      icon: '✉️'
    }
  ];
}
