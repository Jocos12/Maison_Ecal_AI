export function renderTextLite(text = '') {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return { type: 'bold', text: part.slice(2, -2), key: i };
    }
    return { type: 'text', text: part, key: i };
  });
}

export function wantsCvOrLetter(message = '') {
  const m = message.toLowerCase();
  return /génér|generer|cv|lettre|motivation|curriculum|corriger.*cv|améliorer.*cv|mettre à jour.*cv/.test(m);
}

export function wantsCvCorrection(message = '') {
  const m = message.toLowerCase();
  return /corriger|améliorer|optimiser|mettre à jour|réviser/.test(m) && /cv|curriculum/.test(m);
}

export function wantsShowProfile(message = '') {
  const m = message.toLowerCase();
  return /mon profil|mes informations|mes infos|affiche mon cv|voir mon profil/.test(m);
}

export function wantsJobSearch(message = '') {
  const m = message.toLowerCase();
  return (
    /\b(trouv|recherch|cherche)\b/.test(m) ||
    /\boffres?\b/.test(m) && /\b(rdc|logistique|emploi)\b/.test(m)
  );
}

export function wantsApply(message = '') {
  const m = message.toLowerCase();
  return /postuler|postule pour|postulez|envoyer ma candidature|appliquer pour moi|postule automatiquement/.test(m);
}

export function wantsApplicationAnalysis(message = '') {
  const m = message.toLowerCase();
  if (wantsApply(m)) return false;
  return /analyse mes candidatures|mes candidatures|suivi des candidatures|état des candidatures|en attente de réponse|dossiers en cours/.test(m);
}

export function parseOfferIndex(message = '') {
  const match = String(message).match(/offre\s*#?\s*(\d+)/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n - 1 : null;
}

export function truncateTitle(title = '', max = 90) {
  const t = String(title).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max).trim()}…` : t;
}

export function opportunityToJob(opp) {
  return {
    title: opp.title,
    organization: opp.organization || opp.platform || 'Organisation',
    city: opp.ville || 'RDC',
    contractType: 'Non précisé',
    deadline: opp.deadline
      ? new Date(opp.deadline).toLocaleDateString('fr-FR')
      : 'Non précisé',
    sourceUrl: opp.sourceUrl || '',
    platform: opp.platform || 'M-ECAL',
    verified: Boolean(opp.sourceUrl)
  };
}

export function summarizeApplications(apps = []) {
  if (!apps.length) return 'Aucune candidature enregistrée pour le moment.';
  const byStatus = {};
  for (const a of apps) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }
  const lines = Object.entries(byStatus).map(([s, n]) => `• ${s}: ${n}`);
  const pending = apps.filter((a) => ['pending', 'submitted', 'interview'].includes(a.status));
  return (
    `**${apps.length} candidature(s)** au total.\n\n` +
    lines.join('\n') +
    `\n\n**${pending.length} en cours de suivi** (soumises, en attente ou entretien).`
  );
}
