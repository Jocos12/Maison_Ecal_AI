export const AGENT_ACTIVE_CONV_KEY = 'mecal_floating_agent_conv';

export function relativeConversationDate(iso, t, dateLocale) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (typeof t === 'function') {
    if (diffDays === 0) return t('jobAssistant.today');
    if (diffDays === 1) return t('jobAssistant.yesterday');
    if (diffDays < 7) return t('jobAssistant.daysAgo', { count: diffDays });
    return d.toLocaleDateString(dateLocale || 'fr-FR', { day: 'numeric', month: 'short' });
  }
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function groupConversations(list = [], t, dateLocale) {
  const groups = {};
  for (const c of list) {
    const label = relativeConversationDate(c.updatedAt, t, dateLocale);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  }
  return groups;
}

export function conversationTitleFromMessage(text = '') {
  return (
    String(text)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 56) || 'Nouvelle conversation'
  );
}

export function mapServerMessages(messages = []) {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
    document: m.document || null,
    provider: m.provider || null,
    jobs: m.jobs || null,
    timestamp: m.timestamp
  }));
}
