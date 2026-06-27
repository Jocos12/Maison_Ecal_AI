import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { History } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { prepareCvUploadPayload } from '../../utils/extractCvText.js';
import { downloadJobDocument } from '../../utils/downloadJobDocument.js';
import {
  parseOfferIndex,
  summarizeApplications,
  truncateTitle,
  wantsApplicationAnalysis,
  wantsApply,
  wantsCvCorrection,
  wantsCvOrLetter,
  wantsJobSearch,
  wantsShowProfile
} from '../../utils/agentIntents.js';
import { defaultTargetJob, formatProfileSummary } from '../../utils/agentProfileUtils.js';
import {
  filterSourcesOpportunities,
  isDeadlineActive,
  opportunityToJob
} from '../../utils/sourcesFilterUtils.js';
import {
  answerFromAgentContext,
  answerOpportunityCount,
  answerSystemQuestion,
  buildSystemContext,
  formatSystemContextForAI,
  wantsBestOfferOnPage,
  wantsOpportunityCount,
  wantsSystemQuestion
} from '../../utils/agentSystemKnowledge.js';
import { RichTextContent } from '../../utils/agentRichText.jsx';
import {
  AGENT_ACTIVE_CONV_KEY,
  mapServerMessages
} from '../../utils/agentConversationUtils.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { useUiLocale } from '../../hooks/useUiLocale.js';
import { getAgentStarter, getProviderLabel, getQuickActions } from '../../utils/agentUiHelpers.js';
import AgentHistoryPanel from './AgentHistoryPanel.jsx';

function DownloadPdfButton({ document: doc, t }) {
  const [loading, setLoading] = useState(false);
  if (!doc?.documentId) return null;

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        try {
          await downloadJobDocument(doc.documentId, doc.fileName || 'document-mecal.pdf');
          toast.success(t('agent.pdfDownloaded'));
        } catch {
          toast.error(t('agent.pdfDownloadError'));
        } finally {
          setLoading(false);
        }
      }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
    >
      📥 {loading ? t('agent.downloading') : t('agent.downloadPdf')}
    </button>
  );
}

function MessageContent({ content, document: docMeta, provider, isUser, t }) {
  const providerLabel = getProviderLabel(t, provider);

  return (
    <div>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
        <RichTextContent text={content} invertLinks={isUser} />
      </pre>
      <DownloadPdfButton document={docMeta} t={t} />
      {providerLabel ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t('agent.via')} {providerLabel}
        </p>
      ) : null}
    </div>
  );
}

export default function AIAgentModal({ onClose, seedPrompt = null, onSeedConsumed }) {
  const location = useLocation();
  const { t, lang } = useI18n();
  const { dateLocale } = useUiLocale();
  const starter = getAgentStarter(t);
  const quickActions = getQuickActions(t);
  const [messages, setMessages] = useState([{ role: 'assistant', content: starter }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCVPanel, setShowCVPanel] = useState(false);
  const [opportunities, setOpportunities] = useState([]);
  const [opportunityTotal, setOpportunityTotal] = useState(null);
  const [statsDbTotal, setStatsDbTotal] = useState(null);
  const [applications, setApplications] = useState([]);
  const [systemSnapshot, setSystemSnapshot] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cvMeta, setCvMeta] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [docGenerating, setDocGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [convReady, setConvReady] = useState(false);
  const bottomRef = useRef(null);
  const messagesRef = useRef([]);
  const activeConversationIdRef = useRef(null);
  const persistTimerRef = useRef(null);

  const cvData = profile?.fullName
    ? {
        fileName: cvMeta?.fileName || t('agent.cvImported'),
        email: profile.email || '—',
        phone: profile.phone || '—',
        formation: profile.education || '—',
        experience: profile.experience || '—'
      }
    : null;

  const parseOpportunitiesPayload = (payload) => {
    if (!payload) return { items: [], total: 0 };
    if (Array.isArray(payload.data)) {
      return { items: payload.data, total: payload.total ?? payload.data.length };
    }
    if (Array.isArray(payload)) return { items: payload, total: payload.length };
    return { items: [], total: 0 };
  };

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ ...prev[0], content: getAgentStarter(t) }];
      }
      return prev;
    });
  }, [lang, t]);

  const loadContext = useCallback(async () => {
    try {
      const [oppRes, appRes, profileRes, statsRes, snapRes] = await Promise.allSettled([
        api.get('/api/opportunities', { params: { limit: 500 } }),
        api.get('/api/applications'),
        api.get('/api/job-assistant/profile'),
        api.get('/api/stats'),
        api.get('/api/agent/context')
      ]);
      if (oppRes.status === 'fulfilled') {
        const { items, total } = parseOpportunitiesPayload(oppRes.value.data);
        setOpportunities(items);
        setOpportunityTotal(total);
      }
      if (statsRes.status === 'fulfilled') {
        setStatsDbTotal(statsRes.value.data?.totalActive ?? null);
      }
      if (appRes.status === 'fulfilled') setApplications(appRes.value.data || []);
      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data;
        setProfile(d?.profile || null);
        setCvMeta(d?.cv || null);
      }
      if (snapRes.status === 'fulfilled') {
        setSystemSnapshot(snapRes.value.data || null);
      }
    } catch {
      /* contexte optionnel */
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, showCVPanel]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const schedulePersist = useCallback((nextMessages) => {
    messagesRef.current = nextMessages;
    const convId = activeConversationIdRef.current;
    if (!convId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      try {
        await api.put(`/api/job-assistant/conversations/${convId}/sync`, {
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
            document: m.document || null,
            provider: m.provider || null,
            timestamp: m.timestamp || new Date().toISOString()
          }))
        });
        const { data } = await api.get('/api/job-assistant/conversations');
        setConversations(data.conversations || []);
      } catch {
        /* persistance non bloquante */
      }
    }, 500);
  }, []);

  const loadConversationsList = useCallback(async () => {
    const { data } = await api.get('/api/job-assistant/conversations');
    const list = data.conversations || [];
    setConversations(list);
    return list;
  }, []);

  const selectConversation = useCallback(async (id, closePanel = true) => {
    try {
      const { data } = await api.get(`/api/job-assistant/conversations/${id}`);
      const conv = data.conversation;
      let mapped = mapServerMessages(conv.messages);
      if (!mapped.length) {
        mapped = [{ role: 'assistant', content: starter, timestamp: new Date() }];
      }
      setActiveConversationId(conv.id);
      activeConversationIdRef.current = conv.id;
      localStorage.setItem(AGENT_ACTIVE_CONV_KEY, conv.id);
      setMessages(mapped);
      messagesRef.current = mapped;
      if (closePanel) setShowHistory(false);
    } catch {
      toast.error(t('agent.loadConvError'));
    }
  }, [starter, t]);

  const createNewConversation = useCallback(async () => {
    try {
      const { data } = await api.post('/api/job-assistant/conversations');
      const id = data.conversation.id;
      const starterMsg = [{ role: 'assistant', content: starter, timestamp: new Date().toISOString() }];
      await api.put(`/api/job-assistant/conversations/${id}/sync`, {
        messages: starterMsg,
        title: t('agent.newConversation')
      });
      await loadConversationsList();
      setActiveConversationId(id);
      activeConversationIdRef.current = id;
      localStorage.setItem(AGENT_ACTIVE_CONV_KEY, id);
      setMessages(starterMsg);
      messagesRef.current = starterMsg;
      setShowHistory(false);
    } catch {
      toast.error(t('agent.createConvError'));
    }
  }, [loadConversationsList, starter, t]);

  const deleteConversation = useCallback(
    async (id) => {
      if (!window.confirm(t('agent.confirmDelete'))) return;
      try {
        await api.delete(`/api/job-assistant/conversations/${id}`);
        const list = await loadConversationsList();
        if (activeConversationIdRef.current === id) {
          if (list.length) await selectConversation(list[0].id, false);
          else await createNewConversation();
        }
      } catch {
        toast.error(t('agent.deleteError'));
      }
    },
    [createNewConversation, loadConversationsList, selectConversation, t]
  );

  const initConversations = useCallback(async () => {
    try {
      const list = await loadConversationsList();
      const savedId = localStorage.getItem(AGENT_ACTIVE_CONV_KEY);
      const targetId =
        savedId && list.some((c) => String(c.id) === String(savedId)) ? savedId : list[0]?.id;
      if (targetId) {
        await selectConversation(targetId, false);
      } else {
        await createNewConversation();
      }
    } catch {
      const fallback = [{ role: 'assistant', content: starter }];
      setMessages(fallback);
      messagesRef.current = fallback;
    } finally {
      setConvReady(true);
    }
  }, [createNewConversation, loadConversationsList, selectConversation, starter]);

  useEffect(() => {
    initConversations();
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [initConversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const appendAssistant = (content, meta = {}) => {
    setMessages((prev) => {
      const next = [...prev, { role: 'assistant', content, ...meta, timestamp: new Date().toISOString() }];
      schedulePersist(next);
      return next;
    });
  };

  const systemCtx = () =>
    buildSystemContext({
      opportunities,
      applications,
      profile,
      pathname: location.pathname + location.search,
      opportunityTotal,
      statsDbTotal,
      snapshot: systemSnapshot
    });

  const getTargetJob = (userText = '') => {
    const offerIndex = parseOfferIndex(userText);
    const ranked = filterSourcesOpportunities(opportunities, { mecalFitOnly: true });
    if (offerIndex != null && ranked[offerIndex]) {
      return { job: opportunityToJob(ranked[offerIndex]), label: ranked[offerIndex].title };
    }
    const target = ranked[0] || opportunities[0];
    if (target) return { job: opportunityToJob(target), label: target.title };
    return { job: defaultTargetJob(), label: t('agent.generalProfileLabel') };
  };

  const handleCvUpload = async (file) => {
    if (!file) return;
    setCvUploading(true);
    try {
      const payload = await prepareCvUploadPayload(file);
      const { data } = await api.post('/api/job-assistant/profile/parse-cv', { ...payload, locale: lang });
      const nextProfile = data.profile || data;
      setProfile(nextProfile);
      setCvMeta(data.cv || { fileName: file.name, uploadedAt: new Date().toISOString() });
      setShowCVPanel(true);
      appendAssistant(
        `${t('agent.cvImportedMsg', { name: file.name })}\n\n` +
          `${t('agent.fieldsExtracted', { count: data.filledCount || '…' })}\n\n` +
          t('agent.sayGenerateCv')
      );
      toast.success(data.message || t('agent.profileFromCv'));
    } catch (e) {
      appendAssistant(e.response?.data?.message || e.message || t('agent.importCvError'));
      toast.error(e.response?.data?.message || t('agent.importCvError'));
    } finally {
      setCvUploading(false);
    }
  };

  const handleGenerateDocument = async (userText, { mode = 'generate' } = {}) => {
    const isLetter = /lettre|motivation/.test(userText.toLowerCase()) && !/cv/.test(userText.toLowerCase());
    const isCorrection = mode === 'correct' || wantsCvCorrection(userText);
    const docType = isLetter ? 'letter' : 'cv';

    if (!profile?.fullName) {
      appendAssistant(t('agent.importCvFirst'));
      setShowCVPanel(true);
      return;
    }

    const { job, label } = getTargetJob(userText);
    setDocGenerating(true);
    try {
      const { data } = await api.post('/api/job-assistant/generate-document', {
        type: docType,
        job,
        profile,
        mode: isCorrection ? 'correct' : undefined,
        locale: lang
      });
      const title = isLetter
        ? t('agent.letterTitle')
        : isCorrection
          ? t('agent.cvFixedTitle')
          : t('agent.cvGeneratedTitle');
      const body = data.textContent || data.preview || data.content || data.document || '';
      const preview =
        body.length > 1200 ? `${body.slice(0, 1200)}…\n\n${t('agent.docPreviewTruncated')}` : body;
      appendAssistant(`✅ **${title}** — « ${truncateTitle(label)} »\n\n${preview}`, {
        document: {
          documentId: data.documentId,
          fileName: data.fileName || `${docType}-mecal.pdf`,
          title
        }
      });
      toast.success(t('agent.docReadyToast', { title }));
    } catch (e) {
      appendAssistant(e.response?.data?.message || t('agent.docGenerateError'));
    } finally {
      setDocGenerating(false);
    }
  };

  const handleShowProfile = () => {
    if (!profile?.fullName) {
      appendAssistant(t('agent.noProfileMsg'));
      setShowCVPanel(true);
      return;
    }
    appendAssistant(`${t('agent.yourProfileTitle')}\n\n${formatProfileSummary(profile)}`);
  };

  const handleCvOrLetter = async (userText) => {
    await handleGenerateDocument(userText, { mode: wantsCvCorrection(userText) ? 'correct' : 'generate' });
  };

  const handleJobSearch = async () => {
    const active = opportunities.filter(isDeadlineActive);
    const fit = filterSourcesOpportunities(active.length ? active : opportunities, {
      mecalFitOnly: true
    });
    const ranked = (fit.length ? fit : filterSourcesOpportunities(opportunities, {})).slice(0, 8);
    if (!ranked.length) {
      appendAssistant(t('agent.noJobsFound'));
      return;
    }
    const lines = ranked.map(
      (o, i) =>
        `${i + 1}. **${o.title}** — ${o.organization || o.platform} · score ${Math.round(o.aiAnalysis?.score ?? (o.aiRelevanceScore ?? 0) * 100)}`
    );
    appendAssistant(
      `${t('agent.jobsFoundMsg', { count: ranked.length })}\n\n${lines.join('\n')}\n\n${t('agent.jobsListFooter')}`
    );
  };

  const handleApply = async (userText = '') => {
    const ranked = filterSourcesOpportunities(opportunities, {
      deadlineActive: true,
      mecalFitOnly: true
    }).slice(0, 15);

    if (!ranked.length) {
      appendAssistant(t('agent.noEligibleApplyDetailed'));
      return;
    }

    let existing = applications;
    try {
      const { data } = await api.get('/api/applications');
      existing = data || [];
      setApplications(existing);
    } catch {
      /* utilise le cache local */
    }

    const appliedIds = new Set(
      existing.map((a) => String(a.opportunity?._id || a.opportunity))
    );

    const offerIndex = parseOfferIndex(userText);
    let target = null;

    if (offerIndex != null) {
      target = ranked[offerIndex];
      if (!target) {
        const lines = ranked.slice(0, 8).map(
          (o, i) => `${i + 1}. **${truncateTitle(o.title)}** — ${o.organization || o.platform}`
        );
        appendAssistant(
          `${t('agent.offerNotFound', { num: offerIndex + 1 })}\n\n${t('agent.availableOffers')}\n${lines.join('\n')}`
        );
        return;
      }
    } else {
      target = ranked.find((o) => !appliedIds.has(String(o._id)));
    }

    if (!target) {
      const lines = ranked.slice(0, 5).map(
        (o, i) => `${i + 1}. **${truncateTitle(o.title)}** — ${o.organization || o.platform}`
      );
      appendAssistant(
        `${t('agent.alreadyAppliedAll', { count: ranked.length })}\n\n` +
          `${lines.join('\n')}\n\n` +
          t('agent.jobsListFooter')
      );
      return;
    }

    if (appliedIds.has(String(target._id))) {
      const next = ranked.find((o) => !appliedIds.has(String(o._id)));
      appendAssistant(
        `${t('agent.alreadyAppliedOne', { title: truncateTitle(target.title) })}\n\n` +
          (next
            ? t('agent.canApplyNext', {
                title: truncateTitle(next.title),
                org: next.organization || next.platform,
                num: ranked.indexOf(next) + 1
              })
            : t('agent.allOffersCovered'))
      );
      return;
    }

    try {
      await api.post('/api/applications', {
        opportunity: target._id,
        status: 'submitted',
        appliedDate: new Date().toISOString(),
        notes: t('agent.applicationNotes')
      });
      const apps = await api.get('/api/applications');
      setApplications(apps.data || []);
      appendAssistant(
        `${t('agent.applicationRecorded')}\n\n` +
          `📌 **${truncateTitle(target.title)}**\n` +
          `🏢 ${target.organization || target.platform}\n` +
          `📍 ${target.ville || 'RDC'}\n\n` +
          t('agent.jobsListFooter')
      );
      toast.success(t('agent.applicationCreated'));
    } catch (e) {
      appendAssistant(e.response?.data?.message || t('agent.applicationFailed'));
    }
  };

  const handleApplicationAnalysis = () => {
    appendAssistant(summarizeApplications(applications));
  };

  const handleOpportunityCount = async () => {
    try {
      const [oppRes, statsRes, appRes] = await Promise.allSettled([
        api.get('/api/opportunities', { params: { limit: 500 } }),
        api.get('/api/stats'),
        api.get('/api/applications')
      ]);

      let opps = opportunities;
      let total = opportunityTotal;
      let dbTotal = statsDbTotal;
      let apps = applications;

      if (oppRes.status === 'fulfilled') {
        const parsed = parseOpportunitiesPayload(oppRes.value.data);
        opps = parsed.items;
        total = parsed.total;
        setOpportunities(opps);
        setOpportunityTotal(total);
      }
      if (statsRes.status === 'fulfilled') {
        dbTotal = statsRes.value.data?.totalActive ?? dbTotal;
        setStatsDbTotal(dbTotal);
      }
      if (appRes.status === 'fulfilled') {
        apps = appRes.value.data || [];
        setApplications(apps);
      }

      appendAssistant(
        answerOpportunityCount({
          ...buildSystemContext({
            opportunities: opps,
            applications: apps,
            profile,
            pathname: location.pathname + location.search,
            opportunityTotal: total,
            statsDbTotal: dbTotal
          })
        }),
        { provider: 'local' }
      );
    } catch {
      appendAssistant(answerOpportunityCount(systemCtx()), { provider: 'local' });
    }
  };

  const handleBestOffer = () => {
    const ranked = filterSourcesOpportunities(opportunities, {
      deadlineActive: true,
      mecalFitOnly: true
    });
    const list = ranked.length ? ranked : filterSourcesOpportunities(opportunities, {});
    if (!list.length) {
      appendAssistant(t('agent.noOffersOnPage'));
      return;
    }
    const top = list[0];
    const score = Math.round(top.aiAnalysis?.score ?? (top.aiRelevanceScore ?? 0) * 100);
    const runners = list.slice(1, 4).map(
      (o, i) =>
        `${i + 2}. **${truncateTitle(o.title)}** — ${o.organization || o.platform} (score ${Math.round(o.aiAnalysis?.score ?? (o.aiRelevanceScore ?? 0) * 100)})`
    );
    appendAssistant(
      `${t('agent.bestOfferTitle', { score })}\n\n` +
        `**${top.title}**\n` +
        `🏢 ${top.organization || top.platform} · 📍 ${top.ville || 'RDC'}\n` +
        `📅 ${t('agent.deadlineLabel')} : ${top.deadline ? new Date(top.deadline).toLocaleDateString(dateLocale) : t('agent.notSpecifiedDeadline')}\n\n` +
        (runners.length ? `${t('agent.otherStrongOffers')}\n${runners.join('\n')}\n\n` : '') +
        t('agent.bestOfferFooter')
    );
  };

  const handleSystemHelp = (userText) => {
    appendAssistant(answerSystemQuestion(userText, systemCtx()));
  };

  const handleGeneralChat = async (userText, history) => {
    const ranked = filterSourcesOpportunities(opportunities, {}).slice(0, 12);
    const jobs = ranked.map(opportunityToJob);
    const ctx = systemCtx();
    const locale = lang;
    try {
      const { data } = await api.post('/api/job-assistant/rdc-offers/chat', {
        message: userText,
        offer: ranked[0] || null,
        offers: ranked,
        jobs,
        locale,
        systemContext: {
          ...ctx,
          aiContextBlock: formatSystemContextForAI(ctx),
          locale
        },
        history: history
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-8)
          .map((m) => ({ role: m.role, content: m.content }))
      });
      appendAssistant(data.reply || data.message || t('agent.replyUnavailable'), {
        provider: data.provider
      });
    } catch (e) {
      const local =
        answerFromAgentContext(userText, systemCtx()) ||
        (wantsSystemQuestion(userText) ? answerSystemQuestion(userText, systemCtx()) : null) ||
        (wantsOpportunityCount(userText) ? answerOpportunityCount(systemCtx()) : null);
      appendAssistant(
        local ||
          e.response?.data?.message ||
          t('agent.agentUnavailable'),
        local ? { provider: 'local' } : undefined
      );
    }
  };

  const sendMessage = useCallback(
    async (text) => {
      const userText = (text || input).trim();
      if (!userText || isTyping) return;
      setInput('');

      const history = [...messages, { role: 'user', content: userText, timestamp: new Date().toISOString() }];
      setMessages(history);
      schedulePersist(history);
      setIsTyping(true);

      try {
      const contextual = answerFromAgentContext(userText, systemCtx());
      if (contextual) {
        appendAssistant(contextual, { provider: 'local' });
      } else if (wantsShowProfile(userText)) {
        handleShowProfile();
      } else if (wantsCvOrLetter(userText)) {
        await handleCvOrLetter(userText);
      } else if (wantsOpportunityCount(userText)) {
        await handleOpportunityCount();
      } else if (wantsBestOfferOnPage(userText)) {
        handleBestOffer();
      } else if (wantsSystemQuestion(userText)) {
        handleSystemHelp(userText);
      } else if (wantsApply(userText)) {
          await handleApply(userText);
        } else if (/^(oui|ok|vas-y|go)$/i.test(userText.trim())) {
          await handleApply('postule pour la prochaine offre');
        } else if (wantsApplicationAnalysis(userText)) {
          handleApplicationAnalysis();
        } else if (wantsJobSearch(userText)) {
          await handleJobSearch();
        } else {
          await handleGeneralChat(userText, history);
        }
      } finally {
        setIsTyping(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, isTyping, messages, applications, opportunities, profile]
  );

  useEffect(() => {
    if (!seedPrompt || !convReady) return undefined;
    const timer = window.setTimeout(() => {
      sendMessage(seedPrompt);
      onSeedConsumed?.();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [seedPrompt, sendMessage, onSeedConsumed, convReady]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('agent.title')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`flex h-[75vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 ${
          showHistory ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-base">
                🤖
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">{t('agent.title')}</h2>
                <p className="text-xs text-purple-200">● {t('agent.online')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xl text-white/70 transition-colors hover:text-white"
              aria-label={t('common.close')}
            >
              ✕
            </button>
          </div>

          <div className="scrollbar-none mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {quickActions.map((action, idx) =>
              idx === 0 ? (
                <div key={action.label} className="flex flex-shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => sendMessage(action.prompt)}
                    disabled={docGenerating || !convReady}
                    className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:bg-white/25"
                  >
                    {action.icon} {action.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHistory((h) => !h)}
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      showHistory ? 'bg-white/35 text-white' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                    title={t('agent.history')}
                    aria-label={t('agent.history')}
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => sendMessage(action.prompt)}
                  disabled={docGenerating || !convReady}
                  className="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:bg-white/25"
                >
                  {action.icon} {action.label}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {showHistory ? (
            <AgentHistoryPanel
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={selectConversation}
              onNew={createNewConversation}
              onDelete={deleteConversation}
              onClose={() => setShowHistory(false)}
            />
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {showCVPanel ? (
          <div className="mx-3 mb-2 flex-shrink-0 overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-lg dark:border-purple-900 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50 px-4 py-3 dark:border-purple-900 dark:bg-purple-950/40">
              <div className="flex items-center gap-2">
                <span className="text-purple-600">📎</span>
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">{t('agent.myCv')}</span>
                {cvData ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{t('agent.cvLoaded')}</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowCVPanel(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {cvUploading ? (
              <p className="px-4 py-6 text-center text-xs text-purple-700">{t('agent.cvParsing')}</p>
            ) : cvData ? (
              <div className="px-4 py-3">
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950/40">
                  <span className="text-sm text-blue-500">📄</span>
                  <span className="truncate text-sm font-medium text-blue-700 dark:text-blue-300">
                    {cvData.fileName}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[
                    { icon: '📧', label: t('jobAssistant.profileEmail'), value: cvData.email },
                    { icon: '📞', label: t('jobAssistant.profilePhone'), value: cvData.phone },
                    { icon: '🎓', label: t('jobAssistant.profileEducation'), value: cvData.formation },
                    { icon: '💼', label: t('jobAssistant.profileExperience'), value: cvData.experience }
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-slate-800">
                      <p className="mb-0.5 text-xs text-gray-400">
                        {item.icon} {item.label}
                      </p>
                      <p className="truncate text-xs font-medium text-gray-700 dark:text-slate-200">
                        {item.value || '—'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200">
                    🔄 {t('agent.changeCv')}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCvUpload(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sendMessage(t('agent.quickCvPrompt'));
                      setShowCVPanel(false);
                    }}
                    disabled={docGenerating}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                  >
                    ✨ {t('agent.generateCvBtn')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sendMessage(t('agent.quickFixCvPrompt'));
                      setShowCVPanel(false);
                    }}
                    disabled={docGenerating}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    ✏️ {t('agent.fixCvBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4">
                <label className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/50 py-5 transition-colors hover:bg-purple-50 dark:border-purple-800 dark:bg-purple-950/20">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 transition-colors group-hover:bg-purple-200">
                    <span className="text-xl">⬆️</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{t('agent.importCv')}</span>
                  <span className="mt-1 text-xs text-gray-400">{t('agent.cvFormats')}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCvUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        ) : null}

        <div className="agent-chat-scroll flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4 dark:bg-slate-950">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                }`}
              >
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'rounded-tr-none bg-blue-600 text-white'
                    : 'rounded-tl-none border border-gray-100 bg-white text-gray-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                <MessageContent
                  content={msg.content}
                  document={msg.document}
                  provider={msg.provider}
                  isUser={msg.role === 'user'}
                  t={t}
                />
              </div>
            </div>
          ))}

          {isTyping ? (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-xs text-white">
                🤖
              </div>
              <div className="rounded-2xl rounded-tl-none border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-4 items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="flex-shrink-0 border-t bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowCVPanel((v) => !v)}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all duration-200 ${
                showCVPanel
                  ? 'border-purple-600 bg-purple-600 text-white'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-purple-400 hover:text-purple-600 dark:border-slate-600 dark:bg-slate-800'
              }`}
              title={t('agent.cvPanelToggle')}
            >
              {showCVPanel ? '✕' : '+'}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={t('agent.inputPlaceholder')}
              rows={1}
              style={{ minHeight: '38px' }}
              className="max-h-24 flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-base text-white transition-all hover:opacity-90 disabled:opacity-40"
            >
              ➤
            </button>
          </div>
          <p className="mt-1 text-center text-xs text-gray-400">{t('agent.inputHint')}</p>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
