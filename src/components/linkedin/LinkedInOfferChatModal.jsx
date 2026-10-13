import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, ExternalLink, Loader2, Send, Sparkles, User, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { rankOffersLocally } from '../../utils/localOfferRank.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';
import { useUiLocale } from '../../hooks/useUiLocale.js';

const QUICK_QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];

function JobResultCard({ job, t }) {
  if (!job?.title) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{job.title}</p>
      <p className="mt-0.5 text-slate-500">
        {job.organization} · {job.city}
      </p>
      {job.sourceUrl ? (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-semibold text-[#0A66C2]"
        >
          {t('linkedin.chat.viewOffer')}
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : null}
    </div>
  );
}

export default function LinkedInOfferChatModal({ open, offer, offers = [], onClose }) {
  const { t } = useUiLocale();
  const quickQuestions = QUICK_QUESTION_KEYS.map((k) => t(`linkedin.chat.${k}`));
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [entered, setEntered] = useState(false);
  const bottomRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    setChatMessages([]);
    setChatInput('');
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open, offer?._id]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const sendMessage = useCallback(
    async (text, { appendUser = true } = {}) => {
      const message = text.trim();
      if (!message || isTyping) return;

      const nextHistory = appendUser
        ? [...chatMessages, { role: 'user', content: message }]
        : chatMessages;

      if (appendUser) {
        setChatMessages(nextHistory);
        setChatInput('');
      }
      setIsTyping(true);

      try {
        const { data } = await api.post('/api/job-assistant/rdc-offers/chat', {
          offer: offer || undefined,
          offers: offers.slice(0, 12),
          messages: nextHistory,
          message
        });
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply || t('linkedin.chat.noReply'),
            jobs: data.jobs || [],
            isSearch: data.isSearch
          }
        ]);
      } catch (e) {
        toast.error(e.response?.data?.message || t('linkedin.chat.error'));
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: t('linkedin.chat.unavailable')
          }
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [chatMessages, isTyping, offer, offers, t]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label={t('linkedin.close')}
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="linkedin-ai-chat-title"
        className={`relative flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition dark:border-slate-700 dark:bg-slate-950 ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-violet-800 bg-violet-700 px-5 py-4 text-white">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-violet-700">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-100">{t('linkedin.chat.title')}</p>
              <h2 id="linkedin-ai-chat-title" className="mt-1 break-words text-sm font-bold leading-snug">
                {offer?.title || t('linkedin.chat.defaultSubject')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600"
            aria-label={t('linkedin.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isTyping}
                onClick={() => sendMessage(q)}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-left text-[11px] font-semibold text-violet-800 transition hover:bg-violet-700 hover:text-white disabled:opacity-50 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {chatMessages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-700">
                <Bot className="mx-auto h-8 w-8 text-violet-500" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('linkedin.chat.empty')}</p>
              </div>
            ) : null}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' ? (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-700">
                    <Bot className="h-4 w-4 text-white" />
                  </span>
                ) : null}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0A66C2] text-white'
                      : 'border border-violet-100 bg-violet-50/60 text-slate-800 dark:border-violet-900/50 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <AgentMarkdown text={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.jobs?.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {t('linkedin.chat.jobsFound')}
                      </p>
                      {msg.jobs.slice(0, 5).map((job, j) => (
                        <JobResultCard key={`${job.sourceUrl}-${j}`} job={job} t={t} />
                      ))}
                    </div>
                  ) : null}
                </div>
                {msg.role === 'user' ? (
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </span>
                ) : null}
              </div>
            ))}

            {isTyping ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('linkedin.chat.thinking')}
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800"
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(chatInput);
            }}
          >
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t('linkedin.chat.placeholder')}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-700 focus:ring-4 focus:ring-violet-700/15 dark:border-slate-700 dark:bg-slate-900"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={isTyping || !chatInput.trim()}
                className="rounded-xl bg-violet-700 px-4 py-3 text-white transition hover:bg-violet-800 disabled:opacity-50"
                aria-label={t('linkedin.chat.send')}
                title={t('linkedin.chat.send')}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
