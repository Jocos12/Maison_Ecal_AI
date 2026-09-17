import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import AIAgentModal from './AIAgentModal.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

export function openMecalAgent(prompt) {
  window.dispatchEvent(
    new CustomEvent('mecal:open-agent', {
      detail: prompt ? { prompt } : {}
    })
  );
}

export default function AIAgentFloat() {
  const { t } = useI18n();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      const prompt = event.detail?.prompt;
      if (prompt) setSeedPrompt(prompt);
      setIsChatOpen(true);
    };
    window.addEventListener('mecal:open-agent', handler);
    return () => window.removeEventListener('mecal:open-agent', handler);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#1e3a5f] to-blue-600 shadow-2xl transition-all duration-200 hover:scale-110"
        aria-label={t('agent.openLabel')}
      >
        <Bot className="relative z-10 h-7 w-7 text-white" strokeWidth={2} aria-hidden />
        <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
        <span className="pointer-events-none absolute right-16 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          {t('agent.tooltip')}
        </span>
      </button>

      {isChatOpen ? (
        <AIAgentModal
          seedPrompt={seedPrompt}
          onSeedConsumed={() => setSeedPrompt(null)}
          onClose={() => {
            setIsChatOpen(false);
            setSeedPrompt(null);
          }}
        />
      ) : null}
    </>
  );
}
