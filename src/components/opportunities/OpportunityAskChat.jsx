import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';

const sessionChats = new Map();

export default function OpportunityAskChat({ opportunityId, title, open, onClose }) {
  const [messages, setMessages] = useState(() => sessionChats.get(opportunityId) || []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages(sessionChats.get(opportunityId) || []);
    setInput('');
  }, [opportunityId, open]);

  useEffect(() => {
    sessionChats.set(opportunityId, messages);
  }, [opportunityId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const send = useCallback(
    async (text) => {
      const message = String(text || '').trim();
      if (!message || busy || !opportunityId) return;
      const history = [...messages, { role: 'user', content: message }];
      setMessages(history);
      setInput('');
      setBusy(true);
      try {
        const { data } = await api.post(`/api/opportunities/${opportunityId}/ask`, {
          message,
          messages: history.slice(-12)
        });
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Réponse indisponible.' }]);
        if (data.warning) {
          console.warn('IA ask (fallback):', data.warning);
        }
      } catch (e) {
        const status = e.response?.status;
        const detail = e.response?.data?.message || e.message || 'erreur inconnue';
        const text =
          status === 404
            ? `Route introuvable (HTTP 404). Vérifiez que l’API tourne avec la dernière version (POST /api/opportunities/:id/ask). Détail : ${detail}`
            : `Impossible de répondre (HTTP ${status || 'réseau'}) : ${detail}`;
        toast.error(text);
        setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
      } finally {
        setBusy(false);
      }
    },
    [busy, messages, opportunityId]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Fermer" onClick={onClose} />
      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-[#1e3a5f] to-blue-700 px-4 py-3 text-white">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-100">
              <MessageCircle className="h-3.5 w-3.5" />
              Question sur cette offre
            </p>
            <h2 className="mt-1 line-clamp-2 text-sm font-bold">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Posez une question sur cette offre. L’IA s’appuie uniquement sur le texte scrapé et l’analyse
              « Comment postuler » si vous l’avez déjà lancée — elle n’invente pas de contact.
            </p>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'ml-8 bg-blue-600 text-white'
                  : 'mr-8 whitespace-pre-wrap bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
              }`}
            >
              {m.role === 'assistant' ? <AgentMarkdown text={m.content} /> : m.content}
            </div>
          ))}
          {busy ? (
            <p className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Réflexion…
            </p>
          ) : null}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex. : quels documents sont demandés ?"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
