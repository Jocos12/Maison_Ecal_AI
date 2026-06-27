import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquarePlus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserCircle,
  X
} from 'lucide-react';
import { api } from '../api/client.js';
import { CV_ACCEPT, prepareCvUploadPayload } from '../utils/extractCvText.js';
import LinkedInLogistiqueRDC from '../components/linkedin/LinkedInLogistiqueRDC.jsx';
import {
  JOB_SOURCE_FILTERS,
  getSearchPhaseLabel,
  resolveSourcesParam
} from '../config/jobSourceFilters.js';
import { getSystemPromptByLanguage } from '../utils/detectMessageLanguage.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';

const ACTIVE_CONV_KEY = 'mecal_job_assistant_active_conv';

const PROFILE_FIELD_KEYS = [
  ['fullName', 'jobAssistant.profileFullName', true],
  ['email', 'jobAssistant.profileEmail', false],
  ['phone', 'jobAssistant.profilePhone', false],
  ['education', 'jobAssistant.profileEducation', true],
  ['experience', 'jobAssistant.profileExperience', true],
  ['skills', 'jobAssistant.profileSkills', true],
  ['languages', 'jobAssistant.profileLanguages', false]
];

function relativeDate(iso, t, dateLocale) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return t('jobAssistant.today');
  if (diffDays === 1) return t('jobAssistant.yesterday');
  if (diffDays < 7) return t('jobAssistant.daysAgo', { count: diffDays });
  return d.toLocaleDateString(dateLocale);
}

function groupConversations(list, t, dateLocale) {
  const groups = {};
  for (const c of list) {
    const label = relativeDate(c.updatedAt, t, dateLocale);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  }
  return groups;
}

function renderMarkdownLite(text = '') {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function SuggestionChips({ suggestions, onSelect, disabled }) {
  const { t } = useI18n();
  if (!suggestions?.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {t('jobAssistant.suggestedSearches')}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ManualSearchLinks({ links }) {
  const { t } = useI18n();
  if (!links?.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        {t('jobAssistant.consultSources')}
      </p>
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-blue-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SourceFilterPills({ activeSource, onChange, disabled }) {
  const { t } = useI18n();
  const labelFor = (id, label) => (id === 'all' ? t('jobAssistant.sourceAll') : label);
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
      {JOB_SOURCE_FILTERS.map((src) => (
        <button
          key={src.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(src.id)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
            activeSource === src.id
              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
          } disabled:opacity-50`}
        >
          <span>{src.icon}</span>
          {labelFor(src.id, src.label)}
        </button>
      ))}
    </div>
  );
}

const LONG_PROFILE_FIELDS = new Set(['education', 'experience', 'skills']);

const PROFILE_PLACEHOLDER_KEYS = {
  education: 'jobAssistant.phEducation',
  experience: 'jobAssistant.phExperience',
  skills: 'jobAssistant.phSkills',
  languages: 'jobAssistant.phLanguages'
};

function CvUploadZone({ uploading, cvMeta, onFileSelect }) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  return (
    <div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-950/20">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t('jobAssistant.importCv')}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('jobAssistant.importCvHint')}</p>
          {cvMeta?.fileName ? (
            <p className="mt-2 truncate text-xs font-semibold text-violet-700 dark:text-violet-300">
              {t('jobAssistant.lastCv', { name: cvMeta.fileName })}
            </p>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={CV_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-3 w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-60"
      >
        {uploading ? t('jobAssistant.parsingCv') : t('jobAssistant.chooseCv')}
      </button>
    </div>
  );
}

function FieldBadge({ value }) {
  const { t } = useI18n();
  const empty = !value || value === 'Non précisé' || value === t('jobAssistant.notSpecified');
  if (empty) {
    return (
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {t('jobAssistant.notSpecified')}
      </span>
    );
  }
  return <span className="text-xs text-slate-600 dark:text-slate-300">{value}</span>;
}

function JobOfferCard({ job, selected, onSelect, onGenerate, generating, profileComplete }) {
  const { t } = useI18n();
  const isSelected = selected?.sourceUrl && selected.sourceUrl === job.sourceUrl;
  const notSpecified = t('jobAssistant.notSpecified');

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/30'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{job.title}</h3>
            <p className="text-sm text-slate-500">{job.organization}</p>
          </div>
        </div>
        {job.verified && job.sourceUrl ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            {t('jobAssistant.verifiedSource')}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <FieldBadge value={job.city} />
        <FieldBadge value={job.contractType} />
        <FieldBadge value={job.deadline !== 'Non précisé' && job.deadline !== notSpecified ? t('jobAssistant.deadlineLimit', { date: job.deadline }) : notSpecified} />
        {job.platform && job.platform !== 'Non précisé' && job.platform !== notSpecified && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
            {job.platform}
          </span>
        )}
      </div>

      {job.sourceUrl && (
        <a
          href={job.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          {t('jobAssistant.viewSourceOffer')} <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSelect(job)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
        >
          {isSelected ? t('jobAssistant.offerSelected') : t('jobAssistant.selectOffer')}
        </button>
        <button
          type="button"
          disabled={generating || !profileComplete}
          title={!profileComplete ? t('jobAssistant.completeProfileTitle') : ''}
          onClick={() => onGenerate('cv', job)}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-slate-700"
        >
          {t('jobAssistant.generateCvForOffer')}
        </button>
        <button
          type="button"
          disabled={generating || !profileComplete}
          title={!profileComplete ? t('jobAssistant.completeProfileTitle') : ''}
          onClick={() => onGenerate('letter', job)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold disabled:opacity-50 dark:border-slate-600"
        >
          {t('jobAssistant.generateLetterForOffer')}
        </button>
      </div>
    </article>
  );
}

function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{alert}</span>
        </div>
      ))}
    </div>
  );
}

function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete
}) {
  const { t, dateLocale } = useUiLocale();
  const grouped = groupConversations(conversations, t, dateLocale);

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90 lg:w-56 xl:w-64">
      <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t('pages.jobAssistant.newConversation')}
        </button>
        <h2 className="mt-3 font-semibold text-slate-950 dark:text-white">{t('pages.jobAssistant.title')}</h2>
        <p className="mt-1 text-xs text-slate-500">{t('pages.jobAssistant.sidebarHint')}</p>
      </div>
      <div className="historique-scroll min-h-0 flex-1 p-3">
        {Object.entries(grouped).map(([period, items]) => (
          <div key={period} className="mb-3">
            <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              {period}
            </p>
            {items.map((c) => (
              <div
                key={c.id}
                className={`group relative mb-1 rounded-lg ${
                  activeId === c.id
                    ? 'bg-blue-100 dark:bg-blue-950/50'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={`w-full px-3 py-2 pr-8 text-left text-sm font-semibold ${
                    activeId === c.id
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <span className="line-clamp-2">{c.title}</span>
                </button>
                <button
                  type="button"
                  title={t('jobAssistant.deleteTitle')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 group-hover:block dark:hover:bg-rose-950"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
        {conversations.length === 0 && (
          <p className="px-2 text-xs text-slate-500">{t('jobAssistant.noSavedConversations')}</p>
        )}
      </div>
    </aside>
  );
}

export default function JobAssistant() {
  const { t, lang, dateLocale } = useUiLocale();
  const [searchParams] = useSearchParams();
  const showLinkedIn = searchParams.get('section') === 'linkedin';
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchPhase, setSearchPhase] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    experience: '',
    education: '',
    skills: '',
    languages: ''
  });
  const [pendingDoc, setPendingDoc] = useState(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitForm, setSubmitForm] = useState({ to: '', subject: '', body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [bannerAlerts, setBannerAlerts] = useState([]);
  const [initDone, setInitDone] = useState(false);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvMeta, setCvMeta] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showDocuments, setShowDocuments] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeSource, setActiveSource] = useState('all');
  const bottomRef = useRef(null);
  const saveProfileTimer = useRef(null);

  const profileComplete = useMemo(
    () =>
      ['fullName', 'education', 'experience', 'skills'].every((k) => profile[k]?.trim()?.length > 1),
    [profile]
  );

  const applyConversation = useCallback((conv) => {
    if (!conv) return;
    setActiveConversationId(conv.id);
    localStorage.setItem(ACTIVE_CONV_KEY, conv.id);
    setMessages(conv.messages || []);
    setSelectedJob(conv.selectedOffer || null);
    setPendingDoc(conv.pendingDocument || null);
  }, []);

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/api/job-assistant/conversations');
    setConversations(data.conversations || []);
    return data.conversations || [];
  }, []);

  const loadConversation = useCallback(
    async (id) => {
      const { data } = await api.get(`/api/job-assistant/conversations/${id}`);
      applyConversation(data.conversation);
      return data.conversation;
    },
    [applyConversation]
  );

  const createNewConversation = useCallback(async () => {
    const { data } = await api.post('/api/job-assistant/conversations');
    const conv = data.conversation;
    await loadConversations();
    applyConversation(conv);
    setBannerAlerts([]);
    return conv;
  }, [applyConversation, loadConversations]);

  const persistProfile = useCallback((nextProfile) => {
    if (saveProfileTimer.current) clearTimeout(saveProfileTimer.current);
    saveProfileTimer.current = setTimeout(async () => {
      try {
        await api.put('/api/job-assistant/profile', { profile: nextProfile });
      } catch {
        /* non bloquant */
      }
    }, 800);
  }, []);

  const updateProfile = useCallback(
    (updater) => {
      setProfile((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        persistProfile(next);
        return next;
      });
    },
    [persistProfile]
  );

  const saveProfileNow = async () => {
    if (saveProfileTimer.current) clearTimeout(saveProfileTimer.current);
    setSavingProfile(true);
    try {
      await api.put('/api/job-assistant/profile', { profile });
      toast.success(t('jobAssistant.profileSaved'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('jobAssistant.profileSaveError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCvUpload = async (file) => {
    setCvUploading(true);
    try {
      const payload = await prepareCvUploadPayload(file);
      const { data } = await api.post('/api/job-assistant/profile/parse-cv', { ...payload, locale: lang });
      setProfile(data.profile || data);
      setCvMeta(data.cv || { fileName: file.name, uploadedAt: new Date().toISOString() });
      toast.success(data.message || t('agent.profileFromCv'));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || t('agent.importCvError'));
    } finally {
      setCvUploading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [{ data: profileData }, list] = await Promise.all([
          api.get('/api/job-assistant/profile'),
          loadConversations()
        ]);
        if (profileData?.profile) setProfile(profileData.profile);
        if (profileData?.cv) setCvMeta(profileData.cv);
        const savedId = localStorage.getItem(ACTIVE_CONV_KEY);
        if (savedId && list.some((c) => c.id === savedId)) {
          await loadConversation(savedId);
        } else if (list.length > 0) {
          await loadConversation(list[0].id);
        } else {
          await createNewConversation();
        }
        const { data: subs } = await api.get('/api/job-assistant/submissions');
        setSubmissions(subs.submissions || []);
      } catch (e) {
        toast.error(t('jobAssistant.loadConvError'));
      } finally {
        setInitDone(true);
      }
    };
    init();
    return () => {
      if (saveProfileTimer.current) clearTimeout(saveProfileTimer.current);
    };
  }, [createNewConversation, loadConversation, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectJob = async (job) => {
    setSelectedJob(job);
    if (activeConversationId) {
      try {
        await api.patch(`/api/job-assistant/conversations/${activeConversationId}`, {
          selectedOffer: job
        });
      } catch {
        /* non bloquant */
      }
    }
  };

  const handleSend = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading || !activeConversationId) return;
    setInput('');
    setLoading(true);
    setBannerAlerts([]);
    const locale = lang;
    const systemPrompt = getSystemPromptByLanguage(locale);
    setSearchPhase(getSearchPhaseLabel(activeSource, t));

    try {
      const { data } = await api.post(
        `/api/job-assistant/conversations/${activeConversationId}/messages`,
        { message: text, sources: resolveSourcesParam(activeSource), locale, systemPrompt }
      );

      applyConversation(data.conversation);

      const alerts = [...(data.sourceAlerts || [])];
      if (!profileComplete) {
        alerts.push(t('jobAssistant.completeProfileHint'));
      }
      setBannerAlerts(alerts);
      await loadConversations();
    } catch (e) {
      toast.error(e.response?.data?.message || t('jobAssistant.assistantError'));
    } finally {
      setLoading(false);
      setSearchPhase('');
    }
  };

  const handleDeleteConversation = async (id) => {
    if (!window.confirm(t('jobAssistant.convDeleteConfirm'))) return;
    try {
      await api.delete(`/api/job-assistant/conversations/${id}`);
      const list = await loadConversations();
      if (activeConversationId === id) {
        if (list.length > 0) {
          await loadConversation(list[0].id);
        } else {
          await createNewConversation();
        }
      }
      toast.success(t('jobAssistant.convDeleted'));
    } catch {
      toast.error(t('jobAssistant.convDeleteError'));
    }
  };

  const generateDocument = async (type, job = selectedJob) => {
    if (!job) {
      toast.error(t('jobAssistant.selectOfferFirst'));
      return;
    }
    if (!profileComplete) {
      toast.error(t('jobAssistant.completeProfileShort'));
      return;
    }
    setSelectedJob(job);
    setLoading(true);
    try {
      const { data } = await api.post('/api/job-assistant/generate-document', {
        type,
        job,
        profile,
        conversationId: activeConversationId,
        locale: lang
      });
      setPendingDoc(data);
      if (data.conversation) applyConversation(data.conversation);
      toast.success(type === 'cv' ? t('jobAssistant.cvGenerated') : t('jobAssistant.letterGenerated'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('jobAssistant.generationError'));
    } finally {
      setLoading(false);
    }
  };

  const openSubmitModal = () => {
    if (!pendingDoc) {
      toast.error(t('jobAssistant.generateDocFirst'));
      return;
    }
    setSubmitForm({
      to: '',
      subject: t('jobAssistant.applicationSubject', { title: selectedJob?.title || '' }),
      body: ''
    });
    setShowSubmit(true);
  };

  const confirmSubmit = async () => {
    if (!pendingDoc?.documentId || !submitForm.to?.trim()) {
      toast.error(t('jobAssistant.provideRecipient'));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/api/job-assistant/submit-application', {
        confirmed: true,
        documentId: pendingDoc.documentId,
        job: selectedJob,
        to: submitForm.to,
        subject: submitForm.subject,
        body: submitForm.body,
        locale: lang
      });
      toast.success(data.message);
      setBannerAlerts([t('jobAssistant.applicationSentSuccess', { to: data.recap.to })]);
      setShowSubmit(false);
      setPendingDoc(null);
      const { data: subs } = await api.get('/api/job-assistant/submissions');
      setSubmissions(subs.submissions || []);
    } catch (e) {
      const msg = e.response?.data?.message || t('jobAssistant.generationError');
      toast.error(msg);
      setBannerAlerts([t('jobAssistant.sendFailed', { msg })]);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadUrl = (path) => {
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}${path}`;
  };

  const docsDisabledReason = !selectedJob
    ? t('jobAssistant.docsDisabledSelectOffer')
    : !profileComplete
      ? t('jobAssistant.docsDisabledCompleteProfile')
      : '';

  if (!initDone && !showLinkedIn) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('jobAssistant.loadingConversations')}
      </div>
    );
  }

  if (showLinkedIn) {
    return (
      <div className="mx-auto w-full max-w-6xl overflow-y-auto pb-8">
        <Link
          to="/assistant-emploi"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t('jobAssistant.backToAssistant')}
        </Link>
        <LinkedInLogistiqueRDC />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden xl:flex-row xl:items-stretch">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={loadConversation}
        onNew={createNewConversation}
        onDelete={handleDeleteConversation}
      />

      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowDocuments((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              showDocuments
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
            aria-expanded={showDocuments}
            aria-label={showDocuments ? t('jobAssistant.closeDocuments') : t('jobAssistant.openDocuments')}
          >
            {showDocuments ? <X className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {t('jobAssistant.documents')}
          </button>
          <button
            type="button"
            onClick={() => setShowProfile((v) => !v)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              showProfile
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
            aria-expanded={showProfile}
            aria-label={showProfile ? t('jobAssistant.closeProfile') : t('jobAssistant.openProfile')}
          >
            {showProfile ? <X className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
            {t('jobAssistant.myProfile')}
            {!profileComplete && !showProfile ? (
              <span className="h-2 w-2 rounded-full bg-amber-500" title={t('jobAssistant.incompleteProfileTitle')} />
            ) : null}
          </button>
        </div>

        {bannerAlerts.length > 0 ? (
          <div className="shrink-0">
            <AlertBanner alerts={bannerAlerts} />
          </div>
        ) : null}

        <SourceFilterPills
          activeSource={activeSource}
          onChange={setActiveSource}
          disabled={loading}
        />

        <div className="chat-scroll flex min-h-0 flex-1 flex-col gap-4 scroll-smooth p-5">
          {messages.map((msg, i) => (
            <div
              key={msg._id || i}
              className={`flex shrink-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="whitespace-pre-wrap">{renderMarkdownLite(msg.content)}</div>
                <SuggestionChips
                  suggestions={msg.suggestions}
                  disabled={loading}
                  onSelect={(s) => handleSend(s)}
                />
                <ManualSearchLinks links={msg.manualLinks} />
                {msg.jobs?.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {msg.jobs.map((job, j) => (
                      <JobOfferCard
                        key={`${job.sourceUrl}-${j}`}
                        job={job}
                        selected={selectedJob}
                        onSelect={selectJob}
                        onGenerate={generateDocument}
                        generating={loading}
                        profileComplete={profileComplete}
                      />
                    ))}
                  </div>
                )}
                {msg.document?.downloadUrl && (
                  <a
                    href={downloadUrl(msg.document.downloadUrl)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    <Download className="h-3 w-3" />
                    {t('agent.downloadPdf')}
                  </a>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex shrink-0 items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {searchPhase || t('jobAssistant.thinking')}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={t('jobAssistant.inputPlaceholder')}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSend()}
              className="rounded-xl bg-blue-600 px-4 py-3 text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {(showProfile || showDocuments) && (
      <aside className="flex h-full min-h-0 w-full shrink-0 flex-col gap-3 overflow-hidden lg:w-72">
        {showProfile ? (
          <div className="flex max-h-[calc(100vh-180px)] min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow dark:border-slate-800 dark:bg-slate-950">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold">
                <UserCircle className="h-5 w-5 text-violet-500" />
                <h3 className="text-slate-900 dark:text-white">{t('jobAssistant.myProfile')}</h3>
              </div>
              {profileComplete ? (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> {t('jobAssistant.complete')}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600">
                  <AlertTriangle className="h-4 w-4" /> {t('jobAssistant.incomplete')}
                </span>
              )}
            </div>

            <div className="profil-scroll min-h-0 flex-1 space-y-4 p-4">
              <CvUploadZone uploading={cvUploading} cvMeta={cvMeta} onFileSelect={handleCvUpload} />

              {PROFILE_FIELD_KEYS.map(([key, labelKey, required]) => {
                const filled = profile[key]?.trim()?.length > 0;
                const isLong = LONG_PROFILE_FIELDS.has(key);
                return (
                  <div key={key}>
                    <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {filled ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Circle className="h-3 w-3 text-slate-400" />
                      )}
                      {t(labelKey)}
                      {required && <span className="text-rose-500">*</span>}
                    </label>
                    {isLong ? (
                      <textarea
                        rows={4}
                        value={profile[key]}
                        placeholder={PROFILE_PLACEHOLDER_KEYS[key] ? t(PROFILE_PLACEHOLDER_KEYS[key]) : ''}
                        onChange={(e) => updateProfile((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    ) : (
                      <input
                        type={key === 'email' ? 'email' : 'text'}
                        value={profile[key]}
                        placeholder={PROFILE_PLACEHOLDER_KEYS[key] ? t(PROFILE_PLACEHOLDER_KEYS[key]) : ''}
                        onChange={(e) => updateProfile((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      />
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                disabled={savingProfile}
                onClick={saveProfileNow}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('jobAssistant.saveProfile')}
              </button>
            </div>
          </div>
        ) : null}

        {showDocuments ? (
        <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 font-bold">
              <FileText className="h-5 w-5 text-amber-500" />
              {t('jobAssistant.documents')}
            </div>
            {selectedJob ? (
              <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <p className="font-bold text-slate-900 dark:text-white">{selectedJob.title}</p>
                <p className="text-slate-500">{selectedJob.organization}</p>
                {selectedJob.verified && (
                  <span className="mt-2 inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {t('jobAssistant.verifiedSource')}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{t('jobAssistant.noOfferSelected')}</p>
            )}
            <div className="flex flex-col gap-4">
            <button
              type="button"
              disabled={loading || !selectedJob || !profileComplete}
              title={docsDisabledReason}
              onClick={() => generateDocument('cv')}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700"
            >
              {t('jobAssistant.generateCvPdf')}
            </button>
            <button
              type="button"
              disabled={loading || !selectedJob || !profileComplete}
              title={docsDisabledReason}
              onClick={() => generateDocument('letter')}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600"
            >
              {t('jobAssistant.generateLetterPdf')}
            </button>
            {docsDisabledReason && <p className="text-xs text-slate-400">{docsDisabledReason}</p>}
            {pendingDoc && (
              <>
                <a
                  href={downloadUrl(pendingDoc.downloadUrl)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
                >
                  <Download className="h-4 w-4" />
                  {t('agent.downloadPdf')}
                </a>
                <button
                  type="button"
                  onClick={openSubmitModal}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {t('jobAssistant.sendApplication')}
                </button>
              </>
            )}
            </div>
          </div>
        </section>
        ) : null}

        {showDocuments && submissions.length > 0 && (
          <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{t('jobAssistant.sentHistory')}</p>
            <ul className="mt-2 flex max-h-32 flex-col gap-2 overflow-y-auto text-xs">
              {submissions.map((s) => (
                <li key={s._id} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
                  <p className="font-semibold">{s.jobTitle}</p>
                  <p className="text-slate-500">
                    {new Date(s.submittedAt).toLocaleDateString(dateLocale)} → {s.recipientEmail}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
      )}

      {showSubmit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h2 className="text-lg font-bold">{t('jobAssistant.confirmSend')}</h2>
            <p className="mt-2 text-sm text-slate-500">{t('jobAssistant.submitHint')}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold">{t('jobAssistant.recipient')}</label>
                <input
                  value={submitForm.to}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, to: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
                  placeholder="rh@organisation.org"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t('jobAssistant.subject')}</label>
                <input
                  value={submitForm.subject}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, subject: e.target.value }))}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">{t('jobAssistant.messageHtml')}</label>
                <textarea
                  value={submitForm.body}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSubmit(false)}
                className="flex-1 rounded-xl border px-4 py-2 text-sm font-bold"
              >
                {t('jobAssistant.cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmSubmit}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {submitting ? t('jobAssistant.sending') : t('jobAssistant.confirmAndSend')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
