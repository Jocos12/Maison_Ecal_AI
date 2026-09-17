import { MessageSquarePlus, Trash2, X } from 'lucide-react';
import { groupConversations } from '../../utils/agentConversationUtils.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { useUiLocale } from '../../hooks/useUiLocale.js';

export default function AgentHistoryPanel({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose
}) {
  const { t } = useI18n();
  const { dateLocale } = useUiLocale();
  const grouped = groupConversations(conversations, t, dateLocale);

  return (
    <aside className="flex h-full w-[260px] flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-slate-700">
        <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {t('agent.history')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-slate-800"
          aria-label={t('agent.closeHistory')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-gray-200 p-3 dark:border-slate-700">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {t('agent.newConversation')}
        </button>
      </div>

      <div className="agent-chat-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {Object.entries(grouped).map(([period, items]) => (
          <div key={period} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
              {period}
            </p>
            {items.map((c) => (
              <div
                key={c.id}
                className={`group relative mb-0.5 rounded-lg ${
                  activeId === c.id
                    ? 'bg-blue-100 dark:bg-blue-950/50'
                    : 'hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`w-full px-3 py-2.5 pr-8 text-left text-xs font-medium leading-snug ${
                    activeId === c.id
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-gray-700 dark:text-slate-200'
                  }`}
                >
                  <span className="line-clamp-2">{c.title || t('agent.untitled')}</span>
                </button>
                <button
                  type="button"
                  title={t('jobAssistant.deleteTitle')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 group-hover:block dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {!conversations.length ? (
          <p className="px-2 py-4 text-center text-xs text-gray-400">
            {t('agent.noSavedHistory')}
            <br />
            {t('agent.historyHint')}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
