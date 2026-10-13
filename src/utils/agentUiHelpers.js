import { FileText, Inbox, Lightbulb, Mail, Pencil, Search } from 'lucide-react';

export function getAgentStarter(t) {
  return t('agent.starter');
}

export function getQuickActions(t) {
  return [
    { icon: Search, label: t('agent.quickSearch'), prompt: t('agent.quickSearchPrompt') },
    { icon: FileText, label: t('agent.quickCv'), prompt: t('agent.quickCvPrompt') },
    { icon: Pencil, label: t('agent.quickFixCv'), prompt: t('agent.quickFixCvPrompt') },
    { icon: Mail, label: t('agent.quickLetter'), prompt: t('agent.quickLetterPrompt') },
    { icon: Inbox, label: t('agent.quickApply'), prompt: t('agent.quickApplyPrompt') },
    { icon: Lightbulb, label: t('agent.quickAdvice'), prompt: t('agent.quickAdvicePrompt') }
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
