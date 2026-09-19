import { api } from '../api/client.js';
import { upsertNotification } from '../utils/notificationStore.js';

export const SETTINGS_KEY = 'alertSettings';
const LOG_KEY = 'mecal_alert_log';
const LAST_CHECK_KEY = 'lastAlertCheck';
const SEEN_KEY = 'mecal_alert_seen_ids';

export const DEFAULT_KEYWORDS = [
  'Logistique',
  'Supply Chain',
  'Transport',
  'Entrepôt',
  'Approvisionnement',
  'Procurement',
  'Gestion stock',
  'Chaîne logistique',
  'Magasinier',
  'Warehouse'
];

export const LOGISTICS_KEYWORDS = [
  'logistique',
  'supply chain',
  'transport',
  'entrepôt',
  'approvisionnement',
  'procurement',
  'gestion stock',
  'magasinier',
  'chauffeur logistique',
  'warehouse',
  'fleet',
  'distribution',
  'fret',
  'douane',
  'logistics'
];

const RDC_CITIES = ['Kinshasa', 'Lubumbashi', 'Goma', 'Bukavu', 'Kalemie', 'Kisangani', 'Mbuji-Mayi', 'Matadi', 'Kolwezi'];

export function getAlertSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      enabled: parsed.enabled !== false,
      frequency: parsed.frequency || '1h',
      email: parsed.email || '',
      emailEnabled: parsed.emailEnabled !== false,
      whatsapp: parsed.whatsapp || '',
      whatsappEnabled: Boolean(parsed.whatsappEnabled),
      browserNotify: parsed.browserNotify !== false,
      keywords: parsed.keywords?.length ? parsed.keywords : DEFAULT_KEYWORDS,
      cities: parsed.cities?.length ? parsed.cities : ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi'],
      lastCheckAt: parsed.lastCheckAt || localStorage.getItem(LAST_CHECK_KEY) || null
    };
  } catch {
    return {
      enabled: true,
      frequency: '1h',
      keywords: DEFAULT_KEYWORDS,
      cities: ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi'],
      browserNotify: true,
      emailEnabled: true
    };
  }
}

export function saveAlertSettings(settings) {
  const merged = { ...getAlertSettings(), ...settings, updatedAt: new Date().toISOString() };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('mecal:alerts-updated', { detail: merged }));
  return merged;
}

export function getAlertLog() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendAlertLog(jobs = [], channel = 'email') {
  const entry = {
    time: new Date().toISOString(),
    count: jobs.length,
    city: jobs[0]?.city || 'RDC',
    type: channel,
    titles: jobs.slice(0, 3).map((j) => j.title)
  };
  const log = [entry, ...getAlertLog()].slice(0, 30);
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
}

function getSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenIds(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-800)));
}

function matchesLogistics(title = '', keywords = []) {
  const text = title.toLowerCase();
  const all = [...LOGISTICS_KEYWORDS, ...keywords.map((k) => k.toLowerCase())];
  return all.some((kw) => text.includes(kw));
}

function matchesCity(opp, cities = []) {
  if (!cities?.length) return true;
  const loc = `${opp.ville || ''} ${opp.city || ''} ${opp.title || ''}`.toLowerCase();
  return cities.some((c) => loc.includes(c.toLowerCase()));
}

async function fetchReliefWebJobs() {
  const url =
    'https://api.reliefweb.int/v2/jobs?appname=mecal-monitor&filter[field]=country&filter[value]=Democratic Republic of the Congo&preset=latest&limit=15';
  const resp = await fetch(url);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.data || []).map((job) => ({
    id: `rw-${job.id}`,
    title: job.fields?.title || '',
    source: job.fields?.source?.[0]?.name || 'ReliefWeb',
    city: job.fields?.city?.[0]?.name || 'RDC',
    createdAt: job.fields?.date?.created
  }));
}

async function fetchAssistantAlertJobs() {
  try {
    const { data } = await api.post('/api/job-assistant/search', {
      query: 'logistique supply chain',
      allRdc: true
    });
    return (data.jobs || []).map((job) => ({
      id: `ja-${(job.sourceUrl || job.title || '').slice(0, 120)}`,
      title: job.title,
      source: job.platform || job.source || 'Assistant Emploi',
      city: job.city || 'RDC',
      createdAt: new Date().toISOString(),
      href: job.sourceUrl || '/assistant-emploi'
    }));
  } catch {
    return [];
  }
}

export async function checkNewJobsAndAlert(settings = getAlertSettings()) {
  if (settings.enabled === false) {
    return { newCount: 0, jobs: [] };
  }

  const lastCheckRaw = settings.lastCheckAt || localStorage.getItem(LAST_CHECK_KEY);
  const isFirstRun = !lastCheckRaw;
  const lastCheckDate = lastCheckRaw ? new Date(lastCheckRaw) : new Date();
  const seen = getSeenIds();
  const customKeywords = settings.keywords || DEFAULT_KEYWORDS;
  const newJobs = [];

  try {
    const { data } = await api.get('/api/opportunities', { params: { limit: 60, page: 1 } });
    const opps = data?.data || [];

    if (isFirstRun) {
      for (const opp of opps) {
        if (opp._id) seen.add(String(opp._id));
      }
    } else {
      for (const opp of opps) {
        const id = String(opp._id || '');
        if (!id || seen.has(id)) continue;
        if (!matchesLogistics(opp.title || '', customKeywords)) continue;
        if (!matchesCity(opp, settings.cities)) continue;

        const created = new Date(opp.createdAt || opp.scrapedAt || 0);
        if (created <= lastCheckDate) {
          seen.add(id);
          continue;
        }

        newJobs.push({
          id,
          title: opp.title,
          source: opp.platform || 'M-ECAL',
          city: opp.ville || 'RDC',
          href: '/opportunities'
        });
        seen.add(id);
      }
    }
  } catch {
    /* API optionnelle */
  }

  try {
    const rwJobs = await fetchReliefWebJobs();
    if (!isFirstRun) {
      for (const job of rwJobs) {
        if (!job.id || seen.has(job.id)) continue;
        if (!matchesLogistics(job.title, customKeywords)) continue;
        const created = new Date(job.createdAt || 0);
        if (created <= lastCheckDate) {
          seen.add(job.id);
          continue;
        }
        newJobs.push({ ...job, href: '/opportunities' });
        seen.add(job.id);
      }
    } else {
      for (const job of rwJobs) {
        if (job.id) seen.add(job.id);
      }
    }
  } catch {
    /* ReliefWeb optionnel */
  }

  try {
    const assistantJobs = await fetchAssistantAlertJobs();
    if (!isFirstRun) {
      for (const job of assistantJobs) {
        if (!job.id || seen.has(job.id)) continue;
        if (!matchesLogistics(job.title, customKeywords)) continue;
        newJobs.push({ ...job, href: job.href || '/assistant-emploi' });
        seen.add(job.id);
      }
    } else {
      for (const job of assistantJobs) {
        if (job.id) seen.add(job.id);
      }
    }
  } catch {
    /* Assistant Emploi optionnel */
  }

  const now = new Date().toISOString();
  localStorage.setItem(LAST_CHECK_KEY, now);
  saveSeenIds(seen);
  saveAlertSettings({ ...settings, lastCheckAt: now });

  if (newJobs.length > 0) {
    if (settings.browserNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(`🔔 M-ECAL, ${newJobs.length} nouveau(x) job(s) logistique`, {
        body: newJobs
          .slice(0, 3)
          .map((j) => `• ${j.title}`)
          .join('\n'),
        icon: '/favicon.ico'
      });
    }

    for (const job of newJobs) {
      upsertNotification({
        id: `alert-job-${job.id}`,
        title: `🔔 Nouveau job logistique, ${job.source}`,
        body: job.title,
        href: job.href || '/opportunities',
        type: 'emploi-rdc'
      });
    }

    appendAlertLog(newJobs, settings.emailEnabled ? 'email' : 'app');
    window.dispatchEvent(new CustomEvent('mecal:notifications-updated'));
  }

  return { newCount: newJobs.length, jobs: newJobs };
}

export async function requestBrowserNotifications() {
  if (typeof Notification === 'undefined') {
    return { ok: false, message: 'Ce navigateur ne supporte pas les notifications.' };
  }
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    saveAlertSettings({ browserNotify: true });
    return { ok: true, message: 'Notifications navigateur activées.' };
  }
  return { ok: false, message: 'Permission refusée.' };
}

export function getIntervalMs(frequency) {
  return (
    {
      '15min': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000
    }[frequency] || 60 * 60 * 1000
  );
}

export function startAlertScheduler(settings = getAlertSettings()) {
  if (settings.enabled === false) return null;

  checkNewJobsAndAlert(settings).catch(() => {});

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      checkNewJobsAndAlert(getAlertSettings()).catch(() => {});
    }
  }, getIntervalMs(settings.frequency));

  return intervalId;
}

export function formatAlertLogTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) {
    return `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export { RDC_CITIES };
