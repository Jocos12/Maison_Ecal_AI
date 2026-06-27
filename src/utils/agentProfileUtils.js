export function formatProfileSummary(profile) {
  const p = profile || {};
  const fields = [
    ['Nom', p.fullName],
    ['Email', p.email],
    ['Téléphone', p.phone],
    ['Formation', p.education],
    ['Expérience', p.experience],
    ['Compétences', p.skills],
    ['Langues', p.languages]
  ];

  return fields
    .map(([label, val]) => {
      const v = String(val || '').trim() || '—';
      const short = v.length > 150 ? `${v.slice(0, 150)}…` : v;
      return `• ${label} : ${short}`;
    })
    .join('\n');
}

export function isProfileComplete(profile) {
  const p = profile || {};
  return Boolean(
    p.fullName?.trim() && p.experience?.trim() && p.skills?.trim()
  );
}

export function defaultTargetJob() {
  return {
    title: 'Consultant logistique',
    organization: 'M-ECAL',
    city: 'RDC',
    contractType: 'Non précisé',
    deadline: 'Non précisé',
    sourceUrl: '',
    platform: 'Général',
    verified: false
  };
}
