import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { getNotifications, getNotifySnapshot, markRead, patchNotifySnapshot, upsertNotification } from './notificationStore.js';
import {
  ACTIVE_CONTRACT,
  OPEN_APPLICATION,
  STATUS_ALERT,
  crossedThresholds,
  daysSince,
  daysUntil,
  followUpBucket
} from './businessNotificationRules.js';

const STATUS_FR = {
  interview: 'Entretien',
  won: 'Gagnée'
};

function alreadyStored(id) {
  return getNotifications().some((item) => item.id === id);
}

function push(entry, { important = false } = {}) {
  const fresh = !alreadyStored(entry.id);
  upsertNotification(entry);
  if (fresh && important) {
    toast(entry.title, { duration: entry.type === 'application-status' ? 8000 : 7000, icon: '🔔' });
  }
  return fresh;
}

export function announceContractDeadlines(contract, now = new Date()) {
  if (!contract?._id || contract.archivedAt || !ACTIVE_CONTRACT.has(contract.status) || !contract.endDate) return;
  const days = daysUntil(contract.endDate, now);
  for (const threshold of crossedThresholds(days)) {
    const when = days <= 0 ? "aujourd'hui" : days === 1 ? 'demain' : `dans ${days} jours`;
    push(
      {
        id: `contract-due-${contract._id}-${threshold}`,
        title: threshold === 1 ? (days <= 0 ? "Échéance de contrat aujourd'hui" : 'Échéance de contrat demain') : `Échéance de contrat (${threshold} j)`,
        body: `${contract.title || 'Contrat'}${contract.client ? ` — ${contract.client}` : ''}. Fin ${when}.`,
        href: `/contrats?id=${contract._id}`,
        type: 'contract-due'
      },
      { important: threshold === 1 }
    );
  }
}

export function announceApplicationStatus(app, status) {
  if (!app?._id || !STATUS_ALERT.has(status)) return;
  const title = app.opportunity?.title || app.externalOffer?.title || app.title || 'Candidature';
  push(
    {
      id: `app-status-${app._id}-${status}`,
      title: status === 'won' ? 'Candidature gagnée' : 'Candidature passée en entretien',
      body: `${title} — ${STATUS_FR[status]}.`,
      href: `/applications?id=${app._id}`,
      type: 'application-status'
    },
    { important: true }
  );
}

export function announceAgentConfirmation(payload) {
  if (!payload?.offreId) return;
  push(
    {
      id: `agent-confirm-${payload.offreId}`,
      title: 'Confirmation requise',
      body: `L’agent a préparé « ${payload.title || 'une candidature'} ». Rien n’est envoyé tant que vous n’avez pas confirmé.`,
      href: '/applications',
      type: 'agent-confirm',
      confirm: {
        offreId: payload.offreId,
        title: payload.title || '',
        organization: payload.organization || '',
        ville: payload.ville || '',
        notes: payload.notes || '',
        source: payload.source || 'text',
        awaitConfirmation: true
      }
    },
    { important: true }
  );
}

export function dismissAgentConfirmation(offreId) {
  if (!offreId) return;
  markRead(`agent-confirm-${offreId}`);
}

function announceFollowUps(app, now) {
  if (!app?._id || app.archivedAt) return;
  const id = app._id;
  const title = app.opportunity?.title || app.externalOffer?.title || 'Candidature';
  if (app.followUpDate && daysUntil(app.followUpDate, now) <= 0) {
    const day = String(app.followUpDate).slice(0, 10);
    push({
      id: `followup-date-${id}-${day}`,
      title: 'Relance à faire',
      body: `${title} — la date de relance est atteinte.`,
      href: `/applications?id=${id}`,
      type: 'follow-up'
    });
  }
  if (!OPEN_APPLICATION.has(app.status)) return;
  const waited = daysSince(app.appliedDate || app.sentOn || app.createdAt, now);
  const bucket = followUpBucket(waited);
  if (!bucket) return;
  push({
    id: `followup-wait-${id}-${bucket}`,
    title: `Relance ${waited} j`,
    body: `${title} est sans réponse depuis ${waited} jours.`,
    href: `/applications?id=${id}`,
    type: 'follow-up'
  });
}

export function announceApplicationFollowUp(app) {
  if (!app?._id) return;
  announceFollowUps(app);
}

export async function syncBusinessNotifications() {
  try {
    const [contractsRes, appsRes] = await Promise.all([
      api.get('/api/contracts', { params: { owner: 'all' } }),
      api.get('/api/applications')
    ]);
    const contracts = Array.isArray(contractsRes.data) ? contractsRes.data : [];
    const applications = Array.isArray(appsRes.data) ? appsRes.data : [];
    const known = getNotifySnapshot().appStatus || null;
    for (const contract of contracts) announceContractDeadlines(contract);
    for (const app of applications) {
      const previous = known?.[app._id];
      if (previous && previous !== app.status) announceApplicationStatus(app, app.status);
      announceFollowUps(app);
    }
    patchNotifySnapshot({
      appStatus: Object.fromEntries(applications.map((app) => [app._id, app.status]))
    });
  } catch {
    /* le sondage ne doit pas gêner l’écran */
  }
}
