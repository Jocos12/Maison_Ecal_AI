import { Briefcase, Globe, Handshake, Landmark, Newspaper, Search } from 'lucide-react';

export const JOB_SOURCE_FILTERS = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'reliefweb', label: 'ReliefWeb', icon: Globe },
  { id: 'mediacongo', label: 'MediaCongo', icon: Newspaper },
  { id: 'unjobnet', label: 'UNjobnet', icon: Landmark },
  { id: 'coordination_sud', label: 'Coordination Sud', icon: Handshake },
  { id: 'impact_pool', label: 'Impact Pool', icon: Briefcase }
];

export function getSearchPhaseLabel(sourceId = 'all', t) {
  if (typeof t !== 'function') return '';
  if (sourceId === 'all') return t('jobAssistant.searchPhaseAll');
  const filter = JOB_SOURCE_FILTERS.find((s) => s.id === sourceId);
  return t('jobAssistant.searchPhaseOne', { source: filter?.label || sourceId });
}

export function resolveSourcesParam(activeSource = 'all') {
  if (!activeSource || activeSource === 'all') return undefined;
  return [activeSource];
}

export function jobMatchesSource(job, sourceId) {
  if (!sourceId || sourceId === 'all') return true;
  const blob = `${job?.source || ''} ${job?.platform || ''} ${job?.sourceUrl || ''}`.toLowerCase();
  const aliases = {
    reliefweb: ['reliefweb'],
    mediacongo: ['mediacongo'],
    unjobnet: ['unjobnet'],
    coordination_sud: ['coordination', 'coordinationsud'],
    impact_pool: ['impactpool', 'impact pool', 'impact-pool']
  };
  return (aliases[sourceId] || [sourceId]).some((a) => blob.includes(a.replace(/_/g, '')));
}
