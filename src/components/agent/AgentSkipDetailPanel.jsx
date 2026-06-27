import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, ExternalLink, Loader2, Send, User, X } from 'lucide-react';
import { api } from '../../api/client.js';

const QUICK_QUESTIONS = [
  'Résume ces offres rejetées',
  'Y a-t-il des offres récupérables ?',
  'Puis-je postuler malgré le rejet ?',
  'Quelles compétences manquent ?',
  'Conseils pour ces offres'
];

function scoreBadgeClass(score) {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score >= 70) return 'bg-emerald-100 text-emerald-700';
  if (score >= 40) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

export default function AgentSkipDetailPanel({
  open,
  logId,
  reasonKey,
  categoryLabel,
  count,
  logDate,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('liste');
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [entered, setEntered] = useState(false);
  const chatBottomRef = useRef(null);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  const loadOffers = useCallback(async () => {
    if (!logId || !reasonKey) return;
    setLoadingOffers(true);
    try {
      const { data } = await api.get(`/api/agent/logs/${logId}/skipped/${reasonKey}`);
      setOffers(data.offers || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Impossible de charger les détails');
      setOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, [logId, reasonKey]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('liste');
    setChatMessages([]);
    setChatInput('');
    loadOffers();
  }, [open, logId, reasonKey, loadOffers]);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;

      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const nodes = [...focusable];
      if (!nodes.length) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAITyping, activeTab]);

  const sendAIMessage = async (message, { appendUser = true } = {}) => {
    const text = message.trim();
    if (!text || isAITyping) return;

    const nextHistory = appendUser
      ? [...chatMessages, { role: 'user', content: text }]
      : chatMessages;

    if (appendUser) {
      setChatMessages(nextHistory);
      setChatInput('');
    }

    setIsAITyping(true);
    try {
      const { data } = await api.post(`/api/agent/logs/${logId}/skip-advice`, {
        reasonKey,
        message: text,
        history: nextHistory.slice(0, -1)
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Réponse IA indisponible');
    } finally {
      setIsAITyping(false);
    }
  };

  const askAIAboutOffer = (offer) => {
    setActiveTab('chat');
    const question = `Analyse cette offre rejetée:
Titre: ${offer.title}
Source: ${offer.source}
Raison du rejet: ${offer.rejectReason}
Score: ${offer.score != null ? `${offer.score}%` : 'N/A'}
Description: ${offer.description || 'Non disponible'}

Explique pourquoi elle a été filtrée et si M-ECAL devrait la reconsidérer.`;
    sendAIMessage(question);
  };

  const checkIfCanApply = (offer) => {
    setActiveTab('chat');
    const question = `Analyse cette offre rejetée par le filtre M-ECAL :

Titre: ${offer.title}
Source: ${offer.source}
Raison du rejet: ${offer.rejectReason}
Score IA: ${offer.score != null ? `${offer.score}%` : 'N/A'}
Description: ${offer.description || 'Non disponible'}

Questions:
1. Est-ce que M-ECAL peut quand même postuler à cette offre ?
2. Quels sont les risques et opportunités ?
3. Quelles compétences ou documents préparer si on postule ?
4. Recommandation finale: OUI / NON / PEUT-ÊTRE`;
    sendAIMessage(question);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="skip-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Fermer la fenêtre"
        onClick={onClose}
      />

      <div
        ref={modalRef}
        className={`relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ease-out ${
          entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <div className="shrink-0 bg-slate-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 border-l-4 border-indigo-500 pl-4">
              <h2 id="skip-detail-title" className="text-xl font-bold text-slate-800">
                {categoryLabel}
              </h2>
              <p className="mt-2 flex flex-wrap items-center">
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                  {count} offre(s)
                </span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="text-sm text-slate-400">{logDate}</span>
              </p>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-b border-slate-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={() => setActiveTab('liste')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'liste'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Liste des offres
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Conseils IA
          </button>
        </div>

        {activeTab === 'liste' && (
          <div className="detail-scroll max-h-[60vh] overflow-y-auto bg-slate-50 px-5 py-4">
            {loadingOffers ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement des offres…
              </div>
            ) : offers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Aucun détail enregistré pour cette catégorie. Relancez une collecte pour capturer les offres
                filtrées.
              </p>
            ) : (
              offers.map((offer, i) => (
                <article
                  key={`${offer.url}-${i}`}
                  className="mb-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold leading-snug text-slate-800">{offer.title}</h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {offer.source} • {offer.date || 'Date inconnue'}
                      </p>
                    </div>
                    <span className={`ml-2 shrink-0 rounded px-2 py-0.5 text-xs ${scoreBadgeClass(offer.score)}`}>
                      {offer.score != null ? `Score: ${offer.score}%` : 'N/A'}
                    </span>
                  </div>

                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600">
                    Raison du rejet: {offer.rejectReason}
                  </div>

                  {offer.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{offer.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => askAIAboutOffer(offer)}
                      className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs text-indigo-600 transition hover:bg-indigo-50"
                    >
                      Demander à l&apos;IA
                    </button>
                    <button
                      type="button"
                      onClick={() => checkIfCanApply(offer)}
                      className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs text-indigo-600 transition hover:bg-indigo-50"
                    >
                      Puis-je postuler ?
                    </button>
                    {offer.url ? (
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white transition hover:bg-slate-900"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir l&apos;offre
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex min-h-0 max-h-[60vh] flex-col bg-slate-50">
            <div className="shrink-0 space-y-2 border-b border-slate-100 bg-white px-5 py-3">
              <p className="text-xs font-medium text-indigo-700">
                Questions rapides sur ces {count} offres :
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendAIMessage(q)}
                    disabled={isAITyping}
                    className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="chat-detail-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-indigo-700">
                  <Bot className="h-4 w-4" />
                </span>
                <div className="max-w-[80%] rounded-2xl rounded-tl-none bg-white p-3 text-sm text-slate-700 shadow-sm">
                  Bonjour ! J&apos;ai analysé les <strong>{count} offres</strong> rejetées dans la catégorie{' '}
                  <strong>&quot;{categoryLabel}&quot;</strong>. Je peux vous aider à comprendre pourquoi elles ont
                  été filtrées et si certaines méritent d&apos;être reconsidérées. Que voulez-vous savoir ?
                </div>
              </div>

              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div
                    className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-tr-none bg-indigo-600 text-white'
                        : 'rounded-tl-none bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isAITyping && (
                <div className="flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100">
                    <Bot className="h-4 w-4 text-indigo-700" />
                  </span>
                  <div className="rounded-2xl rounded-tl-none bg-white p-3 shadow-sm">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAIMessage(chatInput)}
                  placeholder="Ex: Puis-je postuler à l'offre n°3 ?"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  type="button"
                  onClick={() => sendAIMessage(chatInput)}
                  disabled={!chatInput.trim() || isAITyping}
                  className="grid h-10 w-10 place-items-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
