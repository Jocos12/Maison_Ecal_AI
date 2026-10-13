import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Briefcase, Download, FileText, GraduationCap, History, Mail, Mic, MicOff, Paperclip, Pencil, Phone, Plus, RefreshCw, Send, Sparkles, Upload, Volume2, VolumeX, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import {
  parseOfferIndex,
  summarizeApplications,
  truncateTitle,
  wantsApply,
  wantsCvCorrection,
  wantsCvOrLetter,
  wantsJobSearch,
  wantsShowProfile,
  wantsVoiceAction
} from '../../utils/agentIntents.js';
import { prepareCvUploadPayload, CV_ACCEPT } from '../../utils/extractCvText.js';
import { downloadJobDocument } from '../../utils/downloadJobDocument.js';
import { defaultTargetJob, formatProfileSummary } from '../../utils/agentProfileUtils.js';
import {
  filterSourcesOpportunities,
  isDeadlineActive,
  opportunityToJob
} from '../../utils/sourcesFilterUtils.js';
import {
  answerOpportunityCount,
  answerSystemQuestion,
  buildSystemContext,
  formatSystemContextForAI
} from '../../utils/agentSystemKnowledge.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';
import {
  AGENT_ACTIVE_CONV_KEY,
  mapServerMessages
} from '../../utils/agentConversationUtils.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useUiLocale } from '../../hooks/useUiLocale.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useAgentTts } from '../../hooks/useAgentTts.js';
import { useDraggableWidget } from '../../hooks/useDraggableWidget.js';
import { useVoiceMode } from '../../context/VoiceModeContext.jsx';
import { detectSpeechLanguage } from '../../utils/detectSpeechLanguage.js';
import { getAgentStarter, getProviderLabel, getQuickActions } from '../../utils/agentUiHelpers.js';
import { planVoiceToolExecution } from '../../utils/voiceToolExecutor.js';
import AgentHistoryPanel from './AgentHistoryPanel.jsx';
import { AgentOrb, EqBars } from './AgentOrb.jsx';
import DegradedModeBanner from './DegradedModeBanner.jsx';
import { useAiDegradedMode } from '../../hooks/useAiDegradedMode.js';

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
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-50"
    >
      <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
      {loading ? t('agent.downloading') : t('agent.downloadPdf')}
    </button>
  );
}

function MessageContent({ content, document: docMeta, provider, isUser, streaming, t }) {
  const providerLabel = getProviderLabel(t, provider);

  return (
    <div>
      {isUser ? (
        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
          {content}
        </pre>
      ) : (
        <AgentMarkdown text={content || (streaming ? '…' : '')} />
      )}
      {streaming && content ? <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-[#24478a] align-middle" aria-hidden="true" /> : null}
      <DownloadPdfButton document={docMeta} t={t} />
      {providerLabel && !streaming ? (
        <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t('agent.via')} {providerLabel}
        </p>
      ) : null}
    </div>
  );
}

const TOOL_TONES = [
  'bg-teal-100 text-teal-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-emerald-100 text-emerald-700',
  'bg-[#e3ebf9] text-[#24478a]'
];

const CHAT_DOTS =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='2' cy='2' r='1.2' fill='%2324478a' fill-opacity='.09'/%3E%3C/svg%3E\")";

const userInitials = (user) => {
  const words = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return String(user?.email || '?')[0].toUpperCase();
};

export default function AIAgentModal({ onClose, seedPrompt = null, onSeedConsumed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user } = useApp();
  const { degraded, noteProvider } = useAiDegradedMode();
  const { dateLocale } = useUiLocale();
  const { setPendingApply } = useVoiceMode();
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
  const [speechLang, setSpeechLang] = useState(() => (lang === 'en' ? 'en' : 'fr'));
  const [micError, setMicError] = useState(null);
  const bottomRef = useRef(null);
  const chatScrollRef = useRef(null);
  const messagesRef = useRef([]);
  const activeConversationIdRef = useRef(null);
  const persistTimerRef = useRef(null);
  const streamTimerRef = useRef(null);
  const cvFileRef = useRef(null);
  const tts = useAgentTts();
  const drag = useDraggableWidget({
    width: showHistory ? 896 : 672,
    height: Math.min(window.innerHeight * 0.75, 720)
  });

  const handleMicResult = useCallback((text, isFinal) => {
    setInput(text);
    setMicError(null);
    if (isFinal) {
      setSpeechLang(detectSpeechLanguage(text, lang));
    }
  }, [lang]);

  const handleMicError = useCallback((code) => {
    setMicError(code);
  }, []);

  const speech = useSpeechRecognition({
    lang: speechLang,
    onResult: handleMicResult,
    onError: handleMicError
  });

  const cvData = profile?.fullName
    ? {
        fileName: cvMeta?.fileName || t('agent.cvImported'),
        email: profile.email || 'n/d',
        phone: profile.phone || 'n/d',
        formation: profile.education || 'n/d',
        experience: profile.experience || 'n/d'
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
    // Follow the conversation inside the chat area only (never the page behind it); a new conversation starts at the top
    const box = chatScrollRef.current;
    if (!box) return;
    const onlyStarter = messages.length === 1 && messages[0].content === starter;
    box.scrollTo({ top: onlyStarter ? 0 : box.scrollHeight, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (streamTimerRef.current) clearTimeout(streamTimerRef.current);
    };
  }, [initConversations]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const appendAssistant = (content, meta = {}) => {
    if (meta.provider) noteProvider(meta.provider);
    const full = String(content || '');
    const shouldStream = meta.stream !== false && full.length > 60 && !meta.document;

    if (!shouldStream) {
      setMessages((prev) => {
        const next = [...prev, { role: 'assistant', content: full, ...meta, timestamp: new Date().toISOString() }];
        schedulePersist(next);
        return next;
      });
      if (full) tts.speak(full).catch(() => {});
      return;
    }

    const stamp = new Date().toISOString();
    setIsTyping(false);
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true, ...meta, timestamp: stamp }]);

    const chunks = full.split(/(\s+)/);
    let acc = '';
    let i = 0;
    const tick = () => {
      acc += chunks[i] || '';
      i += 1;
      const done = i >= chunks.length;
      const shown = done ? full : acc;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: shown, streaming: !done };
        }
        if (done) schedulePersist(next);
        return next;
      });
      if (!done) {
        streamTimerRef.current = setTimeout(tick, 16);
      } else if (full) {
        tts.speak(full).catch(() => {});
      }
    };
    tick();
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
      appendAssistant(`✅ **${title}**, « ${truncateTitle(label)} »\n\n${preview}`, {
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
        `${i + 1}. **${o.title}**, ${o.organization || o.platform} · score ${Math.round(o.aiAnalysis?.score ?? (o.aiRelevanceScore ?? 0) * 100)}`
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
          (o, i) => `${i + 1}. **${truncateTitle(o.title)}**, ${o.organization || o.platform}`
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
        (o, i) => `${i + 1}. **${truncateTitle(o.title)}**, ${o.organization || o.platform}`
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

    // WRITE action: stage only — never POST without ApplicationConfirmGate confirmation
    setPendingApply({
      offreId: target._id,
      title: target.title,
      organization: target.organization || target.platform,
      ville: target.ville || target.city || 'RDC',
      notes: t('agent.applicationNotes'),
      awaitConfirmation: true,
      source: 'chat'
    });
    appendAssistant(
      `${t('agent.applyConfirmAsk')}\n\n` +
        `📌 **${truncateTitle(target.title)}**\n` +
        `🏢 ${target.organization || target.platform}\n` +
        `📍 ${target.ville || 'RDC'}\n\n` +
        t('agent.applyConfirmHint')
    );
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
        `${i + 2}. **${truncateTitle(o.title)}**, ${o.organization || o.platform} (score ${Math.round(o.aiAnalysis?.score ?? (o.aiRelevanceScore ?? 0) * 100)})`
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
    const locale = detectSpeechLanguage(userText, lang);
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
          .slice(-16)
          .map((m) => ({ role: m.role, content: m.content }))
      });
      appendAssistant(data.reply || data.message || t('agent.replyUnavailable'), {
        provider: data.provider,
        stream: true
      });
      noteProvider(data.provider);
    } catch (e) {
      appendAssistant(e.response?.data?.message || t('agent.agentUnavailable'));
    }
  };

  const handleToolCommand = async (userText) => {
    try {
      const { data } = await api.post('/api/voice/command', { text: userText, locale: lang });
      const effects = planVoiceToolExecution(data.actions || []);
      for (const effect of effects) {
        if (effect.type === 'navigate') navigate(effect.path);
      }
      if (data.createdApplication) {
        window.dispatchEvent(new CustomEvent('mecal:applications-updated'));
      }
      appendAssistant(data.reply || t('voice.commandDone'));
      if (tts.enabled) {
        try {
          await tts.speak(data.reply || t('voice.commandDone'), { lang });
        } catch {
          /* optional */
        }
      }
    } catch (e) {
      appendAssistant(e.response?.data?.message || t('voice.commandError'));
    }
  };

  const sendMessage = useCallback(
    async (text) => {
      const userText = (text || input).trim();
      if (!userText || isTyping) return;
      speech.stop();
      tts.stop();
      setSpeechLang(detectSpeechLanguage(userText, lang));
      setInput('');

      const history = [...messages, { role: 'user', content: userText, timestamp: new Date().toISOString() }];
      setMessages(history);
      schedulePersist(history);
      setIsTyping(true);

      try {
        if (wantsShowProfile(userText)) {
          handleShowProfile();
        } else if (wantsCvOrLetter(userText) && !wantsApply(userText)) {
          await handleCvOrLetter(userText);
        } else if (wantsVoiceAction(userText) || wantsApply(userText)) {
          await handleToolCommand(userText);
        } else if (/^(oui|ok|vas-y|go)$/i.test(userText.trim())) {
          await handleApply('postule pour la prochaine offre');
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
    [input, isTyping, messages, applications, opportunities, profile, lang, speech, tts]
  );

  useEffect(() => {
    if (!seedPrompt || !convReady) return undefined;
    const timer = window.setTimeout(() => {
      sendMessage(seedPrompt);
      onSeedConsumed?.();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [seedPrompt, sendMessage, onSeedConsumed, convReady]);

  const agentState = speech.listening ? 'listening' : tts.speaking ? 'speaking' : isTyping ? 'thinking' : 'idle';
  const statusText =
    agentState === 'listening'
      ? t('agent.micListening')
      : agentState === 'speaking'
        ? t('agent.statusSpeaking')
        : agentState === 'thinking'
          ? t('agent.thinking')
          : degraded
            ? t('agent.degradedMode')
            : t('agent.online');
  const fresh = messages.length === 1 && messages[0].role === 'assistant' && messages[0].content === starter;
  const timeOf = (iso) => {
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) : '';
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      <div
        ref={drag.panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('agent.title')}
        className={`pointer-events-auto absolute flex h-[min(75vh,100dvh)] w-[min(42rem,calc(100vw-1rem))] flex-col agent-window-in overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_32px_90px_-28px_rgba(20,40,90,0.6)] dark:border-slate-700 dark:bg-slate-900 max-sm:!left-0 max-sm:!top-0 max-sm:h-[100dvh] max-sm:max-h-none max-sm:rounded-none max-sm:w-full ${
          showHistory ? 'md:w-[min(56rem,calc(100vw-1rem))]' : ''
        }`}
        style={{ left: drag.pos.x, top: drag.pos.y }}
      >
        <input
          ref={cvFileRef}
          type="file"
          className="hidden"
          accept={CV_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCvUpload(file);
            e.target.value = '';
          }}
        />
        <div
          className="relative flex-shrink-0 cursor-grab overflow-hidden bg-[#24478a] px-4 pb-3.5 pt-2 text-white active:cursor-grabbing"
          onPointerDown={drag.onHandlePointerDown}
          onPointerMove={drag.onHandlePointerMove}
          onPointerUp={drag.onHandlePointerUp}
          onPointerCancel={drag.onHandlePointerUp}
        >
          <span className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[26px] border-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full border-[22px] border-white/5" aria-hidden="true" />
          <span className="relative mx-auto mb-2 block h-1 w-10 rounded-full bg-white/25" aria-hidden="true" />
          <div className="relative flex items-center gap-3.5">
            <AgentOrb size={54} tone="onBlue" state={agentState} />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold leading-tight tracking-tight">{t('agent.title')}</h2>
              <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-blue-100">
                {agentState === 'idle' ? (
                  <span className={`h-2 w-2 flex-none rounded-full ${degraded ? 'bg-amber-300' : 'animate-pulse bg-emerald-400'}`} aria-hidden="true" />
                ) : (
                  <EqBars className="flex-none text-white" height={12} />
                )}
                <span className="min-w-0 break-words">{statusText}</span>
              </p>
            </div>
            <div className="flex flex-none items-center gap-2">
              <button
                type="button"
                onClick={() => tts.setEnabled(!tts.enabled)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                  tts.enabled ? 'bg-white text-[#24478a] shadow-sm' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={tts.enabled ? t('agent.ttsOn') : t('agent.ttsOff')}
                aria-pressed={tts.enabled}
              >
                {tts.enabled ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
                <span className="hidden sm:inline">{tts.enabled ? t('agent.ttsOnShort') : t('agent.ttsOffShort')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mecal-x-pop grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600"
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {tts.enabled ? (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-[#d5e0f3] bg-[#e3ebf9] px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#24478a] dark:text-blue-200">
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('agent.voiceLabel')}
            </span>
            <select
              value={tts.voice}
              onChange={(e) => tts.setVoice(e.target.value)}
              className="h-8 rounded-lg border border-[#c9d8f1] bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              title={t('agent.ttsVoice')}
              aria-label={t('agent.ttsVoice')}
            >
              {tts.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {t(v.labelKey)}
                </option>
              ))}
            </select>
            <select
              value={tts.model}
              onChange={(e) => tts.setModel(e.target.value)}
              className="h-8 rounded-lg border border-[#c9d8f1] bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              title={t('agent.ttsModel')}
              aria-label={t('agent.ttsModel')}
            >
              {tts.models.map((v) => (
                <option key={v.id} value={v.id}>
                  {t(v.labelKey)}
                </option>
              ))}
            </select>
            {tts.speaking ? (
              <button type="button" onClick={() => tts.stop()} className="h-8 rounded-lg bg-red-600 px-3 text-xs font-bold text-white transition hover:bg-red-700">
                {t('agent.ttsStop')}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="scrollbar-none flex flex-shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => cvFileRef.current?.click()}
            disabled={cvUploading}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-[#24478a] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#1c3a72] disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" /> {t('agent.importCv')}
          </button>
          {quickActions.map((action, idx) => (
            <div key={action.label} className="flex flex-shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => sendMessage(action.prompt)}
                disabled={docGenerating || !convReady}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full ${TOOL_TONES[idx % TOOL_TONES.length]}`}>
                  <action.icon className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
                </span>
                {action.label}
              </button>
              {idx === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowHistory((h) => !h)}
                  className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full ring-1 transition ${
                    showHistory ? 'bg-[#24478a] text-white ring-[#24478a]' : 'bg-white text-slate-500 ring-slate-200 hover:text-[#24478a] dark:bg-slate-800 dark:ring-slate-600'
                  }`}
                  title={t('agent.history')}
                  aria-label={t('agent.history')}
                >
                  <History className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <div className="relative flex min-h-0 flex-1">
          {showHistory ? (
            <>
              <button
                type="button"
                className="absolute inset-0 z-10 bg-slate-900/20 md:hidden"
                aria-label={t('agent.closeHistory')}
                onClick={() => setShowHistory(false)}
              />
              <div className="absolute inset-y-0 left-0 z-20 h-full w-[min(88%,260px)] shadow-xl md:relative md:z-auto md:w-[260px] md:shadow-none">
                <AgentHistoryPanel
                  conversations={conversations}
                  activeId={activeConversationId}
                  onSelect={(id) => {
                    selectConversation(id);
                    if (window.matchMedia('(max-width: 767px)').matches) setShowHistory(false);
                  }}
                  onNew={createNewConversation}
                  onDelete={deleteConversation}
                  onClose={() => setShowHistory(false)}
                />
              </div>
            </>
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DegradedModeBanner show={degraded} label={t('agent.degradedMode')} />
        {cvMeta?.fileName && !showCVPanel ? (
          <div className="mx-3 mt-2 flex flex-shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span className="truncate font-medium">
              {t('agent.cvImportedBanner', { name: cvMeta.fileName })}
            </span>
            <button
              type="button"
              onClick={() => setShowCVPanel(true)}
              className="ml-auto flex-shrink-0 font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              {t('agent.myCv')}
            </button>
          </div>
        ) : null}
        {showCVPanel ? (
          <div className="mx-3 mb-2 mt-2 flex-shrink-0 overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg dark:border-blue-900 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-600" strokeWidth={2} aria-hidden />
                <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">{t('agent.myCv')}</span>
                {cvData ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{t('agent.cvLoaded')}</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowCVPanel(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {cvUploading ? (
              <p className="px-4 py-6 text-center text-xs text-blue-700">{t('agent.cvParsing')}</p>
            ) : cvData ? (
              <div className="px-4 py-3">
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 dark:bg-blue-950/40">
                  <FileText className="h-4 w-4 shrink-0 text-blue-500" strokeWidth={2} aria-hidden />
                  <span className="truncate text-sm font-medium text-blue-700 dark:text-blue-300">
                    {cvData.fileName}
                  </span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2">
                  {[
                    { icon: Mail, label: t('jobAssistant.profileEmail'), value: cvData.email },
                    { icon: Phone, label: t('jobAssistant.profilePhone'), value: cvData.phone },
                    { icon: GraduationCap, label: t('jobAssistant.profileEducation'), value: cvData.formation },
                    { icon: Briefcase, label: t('jobAssistant.profileExperience'), value: cvData.experience }
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-slate-800">
                      <p className="mb-0.5 flex items-center gap-1 text-xs text-gray-400">
                        <item.icon className="h-3 w-3" strokeWidth={2} aria-hidden />
                        {item.label}
                      </p>
                      <p className="truncate text-xs font-medium text-gray-700 dark:text-slate-200">
                        {item.value || 'n/d'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200">
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {t('agent.changeCv')}
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
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-700 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {t('agent.generateCvBtn')}
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
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {t('agent.fixCvBtn')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4">
                <label className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 py-5 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 transition-colors group-hover:bg-blue-200">
                    <Upload className="h-5 w-5 text-blue-600" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{t('agent.importCv')}</span>
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

        <div ref={chatScrollRef} className="agent-chat-scroll flex-1 space-y-5 overflow-y-auto bg-[#f3f6fc] p-4 dark:bg-slate-950" style={{ backgroundImage: CHAT_DOTS }}>
          {fresh ? (
            <div className="agent-pop pb-2 pt-3">
              <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <AgentOrb size={96} tone="onLight" state={agentState} floating />
                <h3 className="mt-5 text-xl font-extrabold leading-tight text-slate-900 dark:text-white">{t('agent.heroTitle')}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{t('agent.heroText')}</p>
              </div>
              <p className="mt-6 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('agent.suggestionsTitle')}</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {quickActions.map((action, idx) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => sendMessage(action.prompt)}
                    disabled={docGenerating || !convReady}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#24478a]/40 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${TOOL_TONES[idx % TOOL_TONES.length]}`}>
                      <action.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-slate-900 dark:text-white">{action.label}</span>
                      <span className="mt-0.5 block break-words text-xs leading-snug text-slate-500 dark:text-slate-400">{action.prompt}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 flex-none text-slate-300 transition group-hover:text-[#24478a]" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg, i) => {
            if (i === 0 && msg.role === 'assistant' && msg.content === starter) return null;
            const mine = msg.role === 'user';
            const time = timeOf(msg.timestamp);
            return (
              <div key={i} className={`agent-pop flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                {mine ? (
                  <span className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[#e3ebf9] text-xs font-extrabold text-[#24478a] ring-2 ring-white dark:ring-slate-800">
                    {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" draggable={false} /> : userInitials(user)}
                  </span>
                ) : (
                  <AgentOrb size={38} tone="onLight" state={msg.streaming ? 'speaking' : 'idle'} className="flex-shrink-0" />
                )}
                <div className={`flex min-w-0 max-w-[min(82%,38rem)] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="mb-1 flex items-center gap-2 px-1 text-[11px] font-bold text-slate-400">
                    {mine ? user?.name?.split(' ')[0] || t('agent.you') : t('agent.assistantName')}
                    {time ? <span className="font-medium">{time}</span> : null}
                  </span>
                  <div
                    className={`min-w-0 max-w-full rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                      mine
                        ? 'rounded-br-md bg-[#24478a] text-white shadow-sm'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    <MessageContent
                      content={msg.content}
                      document={msg.document}
                      provider={msg.provider}
                      isUser={mine}
                      streaming={Boolean(msg.streaming)}
                      t={t}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping ? (
            <div className="agent-pop flex items-end gap-2.5">
              <AgentOrb size={38} tone="onLight" state="thinking" className="flex-shrink-0" />
              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-4 items-center gap-1" aria-hidden>
                    {[0, 150, 300].map((delay) => (
                      <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-[#24478a]" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-[#24478a] dark:text-blue-300">{t('agent.thinking')}</span>
                </div>
              </div>
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div className="flex-shrink-0 border-t border-slate-200 bg-white px-3.5 pb-3 pt-3 dark:border-slate-700 dark:bg-slate-900">
          <div
            className={`flex items-end gap-2 rounded-2xl border p-1.5 transition ${
              speech.listening
                ? 'border-rose-400 bg-rose-50 ring-4 ring-rose-400/15 dark:bg-rose-950/20'
                : 'border-slate-200 bg-slate-50 focus-within:border-[#24478a] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowCVPanel((v) => !v)}
              className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl transition ${
                showCVPanel ? 'bg-[#24478a] text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-[#24478a] dark:bg-slate-700 dark:ring-slate-600'
              }`}
              title={t('agent.cvPanelToggle')}
              aria-label={t('agent.cvPanelToggle')}
            >
              {showCVPanel ? <X className="h-4 w-4" strokeWidth={2.2} /> : <Plus className="h-4 w-4" strokeWidth={2.2} />}
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
              placeholder={speech.listening ? t('agent.micListening') : t('agent.inputPlaceholder')}
              rows={1}
              style={{ minHeight: '40px' }}
              className="max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm leading-relaxed text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white"
            />

            {speech.listening ? <EqBars className="mb-3.5 flex-none text-rose-500" height={16} /> : null}

            <button
              type="button"
              onClick={() => {
                if (!speech.supported) {
                  toast.error(t('agent.micUnsupported'));
                  return;
                }
                setMicError(null);
                speech.toggle();
              }}
              disabled={isTyping}
              className={`relative grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl transition disabled:opacity-40 ${
                speech.listening ? 'bg-rose-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-[#24478a] dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-600'
              }`}
              title={speech.listening ? t('agent.micStop') : t('agent.micStart')}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? t('agent.micStop') : t('agent.micStart')}
            >
              {speech.listening ? <span className="agent-ring agent-ring-fast absolute inset-0 rounded-xl bg-rose-400" aria-hidden="true" /> : null}
              {speech.listening ? <MicOff className="relative h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isTyping}
              className="group grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#24478a] text-white shadow-sm transition hover:bg-[#1c3a72] disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-600"
              title={t('agent.sendMessage')}
              aria-label={t('agent.sendMessage')}
            >
              <Send className="h-4 w-4 transition group-enabled:group-hover:-translate-y-0.5 group-enabled:group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] font-medium text-slate-400">
            {micError
              ? ({
                  unsupported: t('agent.micErrorUnsupported'),
                  'not-allowed': t('agent.micErrorNotAllowed'),
                  'no-speech': t('agent.micErrorNoSpeech'),
                  network: t('agent.micErrorNetwork'),
                  start_failed: t('agent.micErrorStartFailed'),
                  'audio-capture': t('agent.micErrorNotAllowed')
                }[micError] || t('agent.micErrorUnknown'))
              : tts.error && tts.enabled
                ? t('agent.ttsError')
                : t('agent.inputHint')}
          </p>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
