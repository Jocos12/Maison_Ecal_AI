export function getAgentStarter(t) {
  return t('agent.starter');
}

export function getQuickActions(t) {
  return [
    { icon: '🔍', label: t('agent.quickSearch'), prompt: t('agent.quickSearchPrompt') },
    { icon: '📄', label: t('agent.quickCv'), prompt: t('agent.quickCvPrompt') },
    { icon: '✏️', label: t('agent.quickFixCv'), prompt: t('agent.quickFixCvPrompt') },
    { icon: '✉️', label: t('agent.quickLetter'), prompt: t('agent.quickLetterPrompt') },
    { icon: '📬', label: t('agent.quickApply'), prompt: t('agent.quickApplyPrompt') },
    { icon: '💡', label: t('agent.quickAdvice'), prompt: t('agent.quickAdvicePrompt') }
  ];
}

export function getProviderLabel(t, provider) {
  if (provider === 'local') return t('agent.providerLocal');
  if (provider === 'claude') return 'Claude';
  if (provider === 'groq') return 'Groq';
  if (provider === 'gemini') return 'Gemini';
  if (provider === 'ai') return t('agent.providerCloud');
  return null;
}

export function getDateLocale(lang) {
  if (lang === 'en') return 'en-US';
  if (lang === 'sw') return 'sw-KE';
  return 'fr-FR';
}
