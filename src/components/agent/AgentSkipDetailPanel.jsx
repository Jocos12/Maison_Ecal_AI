import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bot,
  ExternalLink,
  FilterX,
  HelpCircle,
  Lightbulb,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  Send,
  User,
  X
} from 'lucide-react';
import { api } from '../../api/client.js';
import { SourceGlyph } from '../../utils/sourceIcons.jsx';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';

const PAGE_SIZE = 12;
const EXPAND_STORAGE_KEY = 'mecal.skipDetailModal.expanded';

function readExpandedPref() {
  try {
    return localStorage.getItem(EXPAND_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const SUBTITLES = {
  not_mecal_service:
    'Ces offres ont été détectées mais ne correspondent à aucun des 6 métiers de Maison ECAL.',
  job_posting: 'Ces offres sont des postes salariés individuels, exclus de la veille firme.',
  not_a_tender: 'Ces contenus sont des bulletins ou rapports, pas des marchés à candidater.',
  non_logistics: 'Ces offres relèvent d’un autre secteur que la logistique M-ECAL.',
  hors_rdc: 'Ces offres ne concernent pas la République démocratique du Congo.'
};

const CODE_FILTERS = {
  job: 'Postes salariés',
  audit: 'Audits',
  goods: 'Fournitures',
  vbg: 'VBG / protection',
  health: 'Santé',
  agri: 'Agriculture',
  it: 'IT / logiciel',
  travel: 'Voyages',
  sitrep: 'Bulletins',
  geo: 'Hors RDC',
  generic: 'Hors métier (générique)'
};

function scoreLabel(score) {
  if (score == null || score === '') return 'Hors périmètre — non noté';
  return `Score ${score}%`;
}

function scoreBadgeClass(score) {
  if (score == null || score === '') return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
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
  const [sourceFilter, setSourceFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [insights, setInsights] = useState('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const insightsOnce = useRef(false);
  const chatBottomRef = useRef(null);
  const listRef = useRef(null);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const [expanded, setExpanded] = useState(readExpandedPref);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPAND_STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

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

  const loadInsights = useCallback(async () => {
    if (!logId || !reasonKey || insightsOnce.current) return;
    insightsOnce.current = true;
    setLoadingInsights(true);
    try {
      const { data } = await api.post(`/api/agent/logs/${logId}/skip-insights`, { reasonKey });
      setInsights(data.reply || '');
    } catch (e) {
      insightsOnce.current = false;
      toast.error(e.response?.data?.message || 'Analyse IA indisponible');
      setInsights('');
    } finally {
      setLoadingInsights(false);
    }
  }, [logId, reasonKey]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('liste');
    setChatMessages([]);
    setChatInput('');
    setSourceFilter('');
    setCodeFilter('');
    setVisible(PAGE_SIZE);
    setInsights('');
    insightsOnce.current = false;
    loadOffers();
  }, [open, logId, reasonKey, loadOffers]);

  useEffect(() => {
    if (open && activeTab === 'chat') loadInsights();
  }, [open, activeTab, loadInsights]);

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
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAITyping, activeTab]);

  const sources = useMemo(() => [...new Set(offers.map((o) => o.source).filter(Boolean))].sort(), [offers]);
  const codes = useMemo(() => [...new Set(offers.map((o) => o.rejectCode).filter(Boolean))], [offers]);

  const filtered = useMemo(
    () =>
      offers.filter((o) => {
        if (sourceFilter && o.source !== sourceFilter) return false;
        if (codeFilter && o.rejectCode !== codeFilter) return false;
        return true;
      }),
    [offers, sourceFilter, codeFilter]
  );

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [sourceFilter, codeFilter]);

  const onListScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      setVisible((n) => Math.min(filtered.length, n + PAGE_SIZE));
    }
  };

  const sendAIMessage = async (message, { appendUser = true, displayText } = {}) => {
    const text = message.trim();
    if (!text || isAITyping) return;

    const shown = displayText || text;
    const nextHistory = appendUser ? [...chatMessages, { role: 'user', content: shown }] : chatMessages;
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
    const context = `Offre: ${offer.title}
Source: ${offer.source}
Raison précise du rejet: ${offer.rejectReason}
Score: ${offer.score != null ? `${offer.score}%` : 'non noté'}
Description: ${offer.description || 'Non disponible'}
URL: ${offer.url || 'N/A'}

Pourquoi cette offre a-t-elle été rejetée ? Explique de façon spécifique, sans répéter seulement le libellé générique de la catégorie.`;
    sendAIMessage(context, { displayText: `Pourquoi « ${offer.title.slice(0, 80)} » a-t-elle été rejetée ?` });
  };

  const checkIfCanApply = (offer) => {
    setActiveTab('chat');
    const context = `Offre: ${offer.title}
Source: ${offer.source}
Raison précise: ${offer.rejectReason}
Score: ${offer.score != null ? `${offer.score}%` : 'non noté'}
Description: ${offer.description || 'Non disponible'}

M-ECAL peut-elle postuler ? Réponds clairement OUI, NON ou PEUT-ÊTRE, avec justification. Si c'est hors métier, dis-le franchement.
Termine par: Recommandation finale: OUI / NON / PEUT-ÊTRE`;
    sendAIMessage(context, { displayText: `Puis-je postuler à « ${offer.title.slice(0, 80)} » ?` });
  };

  if (!open) return null;

  const shown = filtered.slice(0, visible);
  const subtitle = SUBTITLES[reasonKey] || 'Ces offres ont été détectées puis filtrées hors du périmètre affiché.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="Fermer" onClick={onClose} />

      <div
        ref={modalRef}
        className={`relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 dark:bg-slate-900 ${
          expanded ? 'h-[96vh] w-[min(96vw,1400px)] max-w-none' : 'h-[min(88vh,820px)] w-full max-w-3xl'
        } ${entered ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
      >
        <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/25">
                <FilterX className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Offres hors métier M-ECAL</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                    {count} offre(s)
                  </span>
                  {logDate ? (
                    <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {logDate}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={toggleExpanded}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                title={expanded ? 'Réduire la modale' : 'Agrandir la modale'}
                aria-label={expanded ? 'Réduire' : 'Agrandir'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" strokeWidth={2} /> : <Maximize2 className="h-4 w-4" strokeWidth={2} />}
              </button>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-slate-100 bg-white px-5 py-2 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('liste')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'liste' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300'
            }`}
          >
            <List className="h-4 w-4" />
            Liste des offres
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            Conseils IA
          </button>
        </div>

        {activeTab === 'liste' && (
          <div
            ref={listRef}
            onScroll={onListScroll}
            className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4 dark:bg-slate-950/40"
          >
            <div className="mb-3 grid gap-2 sm:grid-cols-2">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Toutes les sources</option>
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Toutes les raisons</option>
                {codes.map((c) => (
                  <option key={c} value={c}>
                    {CODE_FILTERS[c] || c}
                  </option>
                ))}
              </select>
            </div>

            {loadingOffers ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement des offres…
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Aucun détail pour ce filtre. Relancez une collecte si la liste est vide.
              </p>
            ) : (
              shown.map((offer, i) => (
                  <article
                    key={`${offer.url}-${i}`}
                    className="mb-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                          {offer.title}
                        </h3>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <SourceGlyph source={offer.source} platform={offer.platform} />
                          {offer.source} • {offer.date || 'Date inconnue'}
                        </p>
                      </div>
                      <span className={`ml-2 shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${scoreBadgeClass(offer.score)}`}>
                        {scoreLabel(offer.score)}
                      </span>
                    </div>

                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                      Raison du rejet : {offer.rejectReason}
                    </div>

                    {offer.description ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{offer.description}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => askAIAboutOffer(offer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        Demander à l&apos;IA
                      </button>
                      <button
                        type="button"
                        onClick={() => checkIfCanApply(offer)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        Puis-je postuler ?
                      </button>
                      {offer.url ? (
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-950"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Voir l&apos;offre
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))
            )}
            {visible < filtered.length ? (
              <p className="py-2 text-center text-xs text-slate-400">
                {shown.length} / {filtered.length} — faites défiler pour charger la suite
              </p>
            ) : null}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950/40">
            <div className={`shrink-0 border-b border-slate-100 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900 ${expanded ? 'max-h-[38%]' : ''}`}>
              <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                <Lightbulb className="h-3.5 w-3.5" />
                Analyse de ce cycle
              </p>
              {loadingInsights ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération des tendances…
                </div>
              ) : (
                <div
                  className={`overflow-y-auto rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-slate-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-200 ${
                    expanded ? 'max-h-[min(28vh,18rem)]' : 'max-h-40'
                  }`}
                >
                  <AgentMarkdown text={insights || 'Aucune analyse pour le moment.'} />
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                      msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-tr-none bg-blue-600 text-white'
                        : 'rounded-tl-none bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <AgentMarkdown text={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isAITyping && (
                <div className="flex gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100">
                    <Bot className="h-4 w-4 text-blue-700" />
                  </span>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendAIMessage(chatInput)}
                  placeholder="Ex: Pourquoi tant de rejets ReliefWeb ?"
                  className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => sendAIMessage(chatInput)}
                  disabled={!chatInput.trim() || isAITyping}
                  className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
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
