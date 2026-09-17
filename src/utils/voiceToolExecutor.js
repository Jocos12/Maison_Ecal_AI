import { ALLOWED_VOICE_TOOLS, resolvePagePath, VOICE_TOOLS } from './voiceTools.js';

/**
 * Build a path + query for afficherOffres without mutating page state directly.
 */
export function buildOpportunitiesPath(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search || filters.motCle) {
    params.set('search', String(filters.search || filters.motCle).trim());
  }
  if (filters.category || filters.categorie) {
    params.set('category', String(filters.category || filters.categorie).trim());
  }
  if (filters.ville || filters.city) {
    params.set('ville', String(filters.ville || filters.city).trim());
  }
  if (filters.country || filters.pays) {
    params.set('country', String(filters.country || filters.pays).trim());
  }
  if (filters.status) params.set('status', String(filters.status).trim());
  if (filters.mecalFit || filters.correspondMaisonEcal) {
    params.set('fit', 'mecal');
    if (!params.get('search')) params.set('search', 'logistique');
  }
  if (filters.offreId || filters.offerId) {
    params.set('id', String(filters.offreId || filters.offerId));
  }
  const qs = params.toString();
  return qs ? `/opportunities?${qs}` : '/opportunities';
}

/**
 * Validate and normalize AI/heuristic tool calls to the closed allow-list.
 */
export function sanitizeVoiceActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  return actions
    .map((a) => {
      const tool = String(a?.tool || a?.name || '').trim();
      if (!ALLOWED_VOICE_TOOLS.includes(tool)) return null;
      const args = a?.args && typeof a.args === 'object' ? a.args : {};
      return { tool, args };
    })
    .filter(Boolean)
    .slice(0, 3);
}

/**
 * Execute allowed tools. Returns side-effect descriptors for the UI layer.
 * Never submits applications — preparerCandidature only stages a confirmation.
 */
export function planVoiceToolExecution(actions = []) {
  const effects = [];
  for (const action of sanitizeVoiceActions(actions)) {
    switch (action.tool) {
      case VOICE_TOOLS.naviguerVers: {
        const path = resolvePagePath(action.args.page || action.args.path);
        if (path) effects.push({ type: 'navigate', path });
        break;
      }
      case VOICE_TOOLS.afficherOffres:
      case VOICE_TOOLS.filtrerOffres: {
        effects.push({ type: 'navigate', path: buildOpportunitiesPath(action.args) });
        break;
      }
      case VOICE_TOOLS.afficherCandidatures:
      case VOICE_TOOLS.lireCandidatures: {
        const statut = action.args.statut || action.args.status;
        effects.push({
          type: 'navigate',
          path: statut ? `/applications?status=${encodeURIComponent(statut)}` : '/applications'
        });
        break;
      }
      case VOICE_TOOLS.compterOffres: {
        effects.push({ type: 'count_offers', args: action.args });
        break;
      }
      case VOICE_TOOLS.preparerCandidature: {
        const offreId = action.args.offreId || action.args.offerId || action.args.id;
        effects.push({
          type: 'prepare_application',
          offreId: offreId ? String(offreId) : null,
          offerIndex: action.args.offerIndex ?? action.args.index ?? null,
          title: action.args.title || null
        });
        break;
      }
      default:
        break;
    }
  }
  return effects;
}
