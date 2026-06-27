/** LinkedIn Jobs — paramètres optimisés pour la RDC (sans guillemets ni booléens OR). */

export const LINKEDIN_TIME = {
  week: { code: 'r604800', label: '7 jours', hint: 'Recommandé — plus de résultats' },
  month: { code: 'r2592000', label: '30 jours', hint: 'Recherche large' },
  day: { code: 'r86400', label: '24 h', hint: 'Très récent — peu d\'offres en RDC' }
};

export const LINKEDIN_GEO = {
  rdc: {
    geoId: '9075186',
    location: 'République démocratique du Congo',
    label: 'Toute la RDC'
  },
  kinshasa: {
    geoId: '104473735',
    location: 'Kinshasa, République démocratique du Congo',
    label: 'Kinshasa'
  },
  lubumbashi: {
    geoId: '105604121',
    location: 'Lubumbashi, République démocratique du Congo',
    label: 'Lubumbashi'
  },
  goma: {
    geoId: '101271829',
    location: 'Goma, République démocratique du Congo',
    label: 'Goma'
  }
};

/**
 * Construit une URL LinkedIn Jobs efficace.
 * - Mots-clés simples (LinkedIn ignore mal les guillemets et le OR)
 * - geoId + location pour cibler la RDC
 * - distance large (100 km) pour couvrir les grandes villes
 */
export function buildLinkedInJobUrl({
  keywords,
  geoKey = 'rdc',
  timeKey = 'week',
  distance = 100
} = {}) {
  const geo = LINKEDIN_GEO[geoKey] || LINKEDIN_GEO.rdc;
  const time = LINKEDIN_TIME[timeKey] || LINKEDIN_TIME.week;
  const params = new URLSearchParams();
  if (keywords?.trim()) params.set('keywords', keywords.trim());
  params.set('location', geo.location);
  params.set('geoId', geo.geoId);
  params.set('distance', String(distance));
  params.set('f_TPR', time.code);
  params.set('sortBy', 'DD');
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

export const LINKEDIN_CATEGORIES = [
  {
    id: 'logisticien',
    emoji: '🚛',
    title: 'Logisticien / Responsable logistique',
    keywords: 'logisticien',
    altSearches: ['responsable logistique', 'logistics manager']
  },
  {
    id: 'supply-chain',
    emoji: '📦',
    title: 'Supply Chain Manager',
    keywords: 'supply chain',
    altSearches: ['chaîne approvisionnement', 'supply chain manager']
  },
  {
    id: 'transport',
    emoji: '🚗',
    title: 'Coordinateur Transport',
    keywords: 'coordinateur transport',
    altSearches: ['transport logistics', 'fleet manager']
  },
  {
    id: 'warehouse',
    emoji: '🏭',
    title: 'Gestionnaire Entrepôt / Warehouse',
    keywords: 'gestionnaire entrepôt',
    altSearches: ['warehouse manager', 'magasinier']
  },
  {
    id: 'humanitaire',
    emoji: '🌍',
    title: 'Logisticien Humanitaire',
    keywords: 'logistics officer',
    altSearches: ['logisticien humanitaire', 'WFP logistics']
  },
  {
    id: 'consultant',
    emoji: '📊',
    title: 'Consultant Logistique',
    keywords: 'consultant logistique',
    altSearches: ['logistics consultant', 'conseil logistique']
  },
  {
    id: 'procurement',
    emoji: '🔧',
    title: 'Responsable Achats / Procurement',
    keywords: 'procurement',
    altSearches: ['responsable achats', 'acheteur']
  },
  {
    id: 'assistant',
    emoji: '📋',
    title: 'Assistant Logistique',
    keywords: 'assistant logistique',
    altSearches: ['logistics assistant', 'administratif logistique']
  }
];

export function buildAllLogisticsUrl(geoKey = 'rdc', timeKey = 'week') {
  return buildLinkedInJobUrl({ keywords: 'logistique', geoKey, timeKey });
}
