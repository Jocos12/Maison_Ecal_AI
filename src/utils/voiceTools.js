/**
 * Closed set of voice agent tools — nothing outside this list can be executed.
 *
 * SAFETY (preparerCandidature):
 * 1) User asks to apply
 * 2) Tool prepares a draft summary (offer + docs hint)
 * 3) UI asks explicit confirmation ("Je confirme l'envoi ?")
 * 4) Only after clear yes / confirm click → POST /api/applications
 * Voice alone must NEVER submit an application.
 */

export const VOICE_TOOLS = Object.freeze({
  naviguerVers: 'naviguerVers',
  afficherOffres: 'afficherOffres',
  filtrerOffres: 'filtrerOffres',
  afficherCandidatures: 'afficherCandidatures',
  compterOffres: 'compterOffres',
  lireCandidatures: 'lireCandidatures',
  preparerCandidature: 'preparerCandidature'
});

/** READ-ONLY — safe to run immediately */
export const VOICE_TOOLS_READ = Object.freeze([
  VOICE_TOOLS.naviguerVers,
  VOICE_TOOLS.afficherOffres,
  VOICE_TOOLS.filtrerOffres,
  VOICE_TOOLS.afficherCandidatures,
  VOICE_TOOLS.compterOffres,
  VOICE_TOOLS.lireCandidatures
]);

/** WRITE — stage UI confirmation only; never auto-POST */
export const VOICE_TOOLS_WRITE = Object.freeze([VOICE_TOOLS.preparerCandidature]);

export const ALLOWED_VOICE_TOOLS = Object.freeze(Object.values(VOICE_TOOLS));

export const PAGE_ROUTES = Object.freeze({
  dashboard: '/dashboard',
  opportunities: '/opportunities',
  opportunites: '/opportunities',
  offres: '/opportunities',
  applications: '/applications',
  candidatures: '/applications',
  sources: '/sources',
  settings: '/settings',
  parametres: '/settings',
  agent: '/agent',
  messaging: '/messaging',
  messagerie: '/messaging',
  analytics: '/analytics',
  alerts: '/alerts',
  alertes: '/alerts',
  archive: '/archive',
  marketing: '/marketing',
  'assistant-emploi': '/assistant-emploi',
  assistant: '/assistant-emploi'
});

export function resolvePagePath(page = '') {
  const key = String(page || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  return PAGE_ROUTES[key] || null;
}
