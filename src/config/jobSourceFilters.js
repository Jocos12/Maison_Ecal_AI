export const JOB_SOURCE_FILTERS = [
  { id: 'all', label: 'All', icon: '🔍' },
  { id: 'reliefweb', label: 'ReliefWeb', icon: '🌐' },
  { id: 'mediacongo', label: 'MediaCongo', icon: '📰' },
  { id: 'unjobnet', label: 'UNjobnet', icon: '🇺🇳' },
  { id: 'coordination_sud', label: 'Coordination Sud', icon: '🤝' },
  { id: 'impact_pool', label: 'Impact Pool', icon: '💼' }
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
