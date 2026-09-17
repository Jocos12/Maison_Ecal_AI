import { api } from '../api/client.js';
import { upsertNotification } from './notificationStore.js';
import { getAlertSettings } from '../services/alertService.js';
import toast from 'react-hot-toast';

const SEEN_KEY = 'mecal_match_alert_seen';
const HYDRATED_KEY = 'mecal_match_alert_hydrated';

function readSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeSeen(set) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-250)));
}

function showBrowserMatch(title, body) {
  try {
    const settings = getAlertSettings();
    if (settings.browserNotify === false) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {
    /* permission / insecure context */
  }
}

export async function pollMatchAlerts() {
  const [{ data }, scanRes] = await Promise.all([
    api.get('/api/notifications', { params: { limit: 25 } }),
    api.get('/api/notifications', { params: { kind: 'scan', limit: 15 } }).catch(() => ({ data: { items: [] } }))
  ]);
  const items = data?.items || [];
  const scanItems = scanRes.data?.items || [];
  const seen = readSeen();
  const hydrated = sessionStorage.getItem(HYDRATED_KEY) === '1';

  for (const n of items) {
    const id = String(n._id);
    const href = `/opportunities?id=${n.opportunity}`;
    upsertNotification({
      id: `match-${id}`,
      title: 'Nouvelle offre pertinente M-ECAL',
      body: [n.title, n.organization].filter(Boolean).join(' — '),
      href,
      type: 'mecal-match',
      read: Boolean(n.readAt)
    });

    if (hydrated && !n.readAt && !seen.has(id)) {
      toast.success(`${n.title}`, {
        duration: 6000,
        icon: '🔔'
      });
      showBrowserMatch('Nouvelle offre M-ECAL', n.title);
    }
    seen.add(id);
  }

  for (const n of scanItems) {
    const id = `scan-${n._id}`;
    upsertNotification({
      id,
      title: n.title || 'Collecte en erreur',
      body: String(n.message || '').slice(0, 280),
      href: '/dashboard',
      type: 'veille-error',
      read: Boolean(n.readAt)
    });
    if (hydrated && !n.readAt && !seen.has(id)) {
      toast.error(n.title || 'Collecte en erreur', { duration: 7000 });
    }
    seen.add(id);
  }

  writeSeen(seen);
  sessionStorage.setItem(HYDRATED_KEY, '1');
  return items;
}

export async function requestMatchBrowserPermission() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}
