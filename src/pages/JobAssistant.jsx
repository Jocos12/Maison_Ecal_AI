import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  MapPin,
  MessageSquarePlus,
  MessagesSquare,
  PenLine,
  Save,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserCircle,
  X,
  GraduationCap,
  User,
  Mail,
  Wrench
} from 'lucide-react';
import { api } from '../api/client.js';
import { downloadJobDocument } from '../utils/downloadJobDocument.js';
import { CV_ACCEPT, prepareCvUploadPayload } from '../utils/extractCvText.js';
import LinkedInLogistiqueRDC from '../components/linkedin/LinkedInLogistiqueRDC.jsx';
import {
  JOB_SOURCE_FILTERS,
  getSearchPhaseLabel,
  jobMatchesSource,
  resolveSourcesParam
} from '../config/jobSourceFilters.js';
import { getSystemPromptByLanguage } from '../utils/detectMessageLanguage.js';
import { useI18n } from '../context/I18nContext.jsx';
import { AgentMarkdown } from '../utils/agentMarkdown.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { useAiDegradedMode } from '../hooks/useAiDegradedMode.js';
import PhoneField from '../components/ui/PhoneField.jsx';

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
const REQUIRED_KEYS = ['fullName', 'education', 'experience', 'skills'];
const PROFILE_SECTIONS = [
  { id: 'identity', title: 'jobAssistant.sectionIdentity', icon: User, fields: ['fullName', 'email', 'phone'] },
  { id: 'career', title: 'jobAssistant.sectionCareer', icon: GraduationCap, fields: ['education', 'experience'] },
  { id: 'skills', title: 'jobAssistant.sectionSkills', icon: Wrench, fields: ['skills', 'languages'] }
];
const FIELD_ICONS = { fullName: User, email: Mail };
const LONG_PROFILE_FIELDS = new Set(['education', 'experience', 'skills']);
const PROFILE_PLACEHOLDER_KEYS = {
  education: 'jobAssistant.phEducation',
  experience: 'jobAssistant.phExperience',
  skills: 'jobAssistant.phSkills',
  languages: 'jobAssistant.phLanguages'
};

// Widths used to decide how many columns fit in the workspace.
const RAIL_W = 256;
const PANEL_W = 340;
const CHAT_MIN = 460;
const OVERLAY_BELOW = 860;
const COMFY_CHAT = 760; // chat width kept generous: side columns only open by default when they leave this much room

const BLUE = 'bg-[#24478a] text-white hover:bg-[#1c3a72]';
const TEAL = 'bg-teal-700 text-white hover:bg-teal-800';
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

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

function useElementWidth() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!node) return undefined;
    setWidth(node.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);
  return [setNode, width];
}

function isKnown(value, notSpecified) {
  return Boolean(value) && value !== 'Non précisé' && value !== notSpecified;
}

/** Deadline chip colour follows urgency: calm indigo, orange when close, red when very close or over. */
function deadlineStyle(deadline) {
  const time = Date.parse(deadline);
  if (Number.isNaN(time)) return { tone: 'bg-slate-100 text-slate-700 ring-slate-200', date: null };
  const days = Math.ceil((time - Date.now()) / 86400000);
  if (days <= 7) return { tone: 'bg-red-50 text-red-700 ring-red-200', date: new Date(time) };
  if (days <= 21) return { tone: 'bg-orange-50 text-orange-700 ring-orange-200', date: new Date(time) };
  return { tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200', date: new Date(time) };
}

function Chip({ tone, icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
      {Icon ? <Icon className="h-3 w-3 flex-none" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{children}</p>
  );
}

function SuggestionChips({ suggestions, onSelect, disabled }) {
  const { t } = useI18n();
  if (!suggestions?.length) return null;
  return (
    <div className="mt-4">
      <SectionLabel>{t('jobAssistant.suggestedSearches')}</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(s)}
            className={`rounded-lg border border-[#24478a]/30 bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#24478a] transition hover:bg-[#24478a] hover:text-white disabled:opacity-50 dark:border-blue-300/30 dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
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
    <div className="mt-4">
      <SectionLabel>{t('jobAssistant.consultSources')}</SectionLabel>
      <div className="mt-2 flex flex-col items-start gap-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#24478a] transition hover:border-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-blue-200"
          >
            <ExternalLink className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SourceRow({ activeSource, onChange, disabled }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {t('jobAssistant.sourcesLabel')}
      </span>
      {JOB_SOURCE_FILTERS.map((src) => {
        const Icon = src.icon;
        const active = activeSource === src.id;
        return (
          <button
            key={src.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(src.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${FOCUS} ${
              active
                ? 'border-[#24478a] bg-[#24478a] text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-[#24478a]/50 hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Icon className="hidden h-3.5 w-3.5 flex-none sm:block" strokeWidth={2} aria-hidden="true" />
            {src.id === 'all' ? t('jobAssistant.sourceAll') : src.label}
          </button>
        );
      })}
    </div>
  );
}

function CvUploadZone({ uploading, cvMeta, onFileSelect }) {
  const { t } = useI18n();
  const inputRef = useRef(null);

  return (
    <div className="rounded-xl border border-dashed border-violet-300 bg-violet-50/60 p-4 dark:border-violet-400/30 dark:bg-slate-800/60">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-violet-700 text-white">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t('jobAssistant.importCv')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('jobAssistant.importCvHint')}</p>
          {cvMeta?.fileName ? (
            <p className="mt-2 break-words text-xs font-semibold text-violet-700 dark:text-violet-300">
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
        className={`mt-3 w-full rounded-lg border border-violet-700 bg-white px-3 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-700 hover:text-white disabled:opacity-60 dark:bg-slate-900 dark:text-violet-300 ${FOCUS}`}
      >
        {uploading ? t('jobAssistant.parsingCv') : t('jobAssistant.chooseCv')}
      </button>
    </div>
  );
}

function OfferChips({ job, dateLocale }) {
  const { t } = useI18n();
  const notSpecified = t('jobAssistant.notSpecified');
  const deadline = isKnown(job.deadline, notSpecified) ? deadlineStyle(job.deadline) : null;
  const deadlineText = deadline
    ? t('jobAssistant.deadlineLimit', {
        date: deadline.date
          ? deadline.date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })
          : job.deadline
      })
    : t('jobAssistant.deadlineLimit', { date: notSpecified.toLowerCase() });
  const platform = job.platform || job.source;
  return (
    <div className="flex flex-wrap gap-1.5">
      {isKnown(job.city, notSpecified) ? (
        <Chip tone="bg-teal-50 text-teal-800 ring-teal-200" icon={MapPin}>
          {job.city}
        </Chip>
      ) : null}
      {isKnown(job.contractType, notSpecified) ? (
        <Chip tone="bg-slate-100 text-slate-700 ring-slate-200" icon={FileText}>
          {job.contractType}
        </Chip>
      ) : null}
      <Chip tone={deadline ? deadline.tone : 'bg-slate-100 text-slate-500 ring-slate-200'} icon={CalendarClock}>
        {deadlineText}
      </Chip>
      {isKnown(platform, notSpecified) ? (
        <Chip tone="bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1]">{platform}</Chip>
      ) : null}
    </div>
  );
}

function JobOfferCard({ job, selected, onSelect, onGenerate, generating, profileComplete, dateLocale }) {
  const { t } = useI18n();
  const isSelected = Boolean(selected?.sourceUrl && selected.sourceUrl === job.sourceUrl);
  const verified = job.verified && job.sourceUrl;

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isSelected
          ? 'border-[#24478a] bg-[#f2f6fc] ring-1 ring-[#24478a] dark:bg-slate-800'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900">
          <Briefcase className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{job.title}</h3>
          <p className="mt-0.5 break-words text-[13px] text-slate-500 dark:text-slate-400">{job.organization}</p>
        </div>
      </div>

      <div className="mt-3">
        <OfferChips job={job} dateLocale={dateLocale} />
      </div>

      {verified ? (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t('jobAssistant.verifiedSource')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(job)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${FOCUS} ${
            isSelected
              ? BLUE
              : 'border border-[#24478a] bg-white text-[#24478a] hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200'
          }`}
        >
          {isSelected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
          {isSelected ? t('jobAssistant.offerSelected') : t('jobAssistant.selectOffer')}
        </button>
        <button
          type="button"
          disabled={generating || !profileComplete}
          title={!profileComplete ? t('jobAssistant.completeProfileTitle') : ''}
          onClick={() => onGenerate('cv', job)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
        >
          <FileText className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          {t('jobAssistant.generateCvForOffer')}
        </button>
        <button
          type="button"
          disabled={generating || !profileComplete || job.isManualLink}
          title={
            job.isManualLink
              ? t('jobAssistant.docsDisabledSelectOffer')
              : !profileComplete
                ? t('jobAssistant.completeProfileTitle')
                : ''
          }
          onClick={() => onGenerate('letter', job)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
        >
          <PenLine className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
          {t('jobAssistant.generateLetterForOffer')}
        </button>
        {job.sourceUrl ? (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-bold text-[#24478a] hover:underline dark:text-blue-300"
          >
            {t('jobAssistant.viewSourceOffer')}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="mb-2 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
      {alerts.map((alert, i) => (
        <div key={i} className="flex items-start gap-2 text-[13px] leading-snug text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
          <span>{alert}</span>
        </div>
      ))}
    </div>
  );
}

function MessageRow({ msg, loading, onSend, selectedJob, onSelect, onGenerate, profileComplete, dateLocale }) {
  const { t } = useI18n();
  const isUser = msg.role === 'user';
  const time = msg.timestamp ? new Date(msg.timestamp) : null;
  const timeText =
    time && !Number.isNaN(time.getTime())
      ? time.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
      : '';
  const hasJobs = msg.jobs?.length > 0;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] md:max-w-[75%]">
          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#24478a] px-4 py-2.5 text-sm leading-relaxed text-white">
            {msg.content}
          </div>
          {timeText ? <p className="mt-1 text-right text-[10px] text-slate-400">{timeText}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-teal-600 text-white">
        <Bot className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className={`min-w-0 ${hasJobs ? 'w-full' : 'max-w-[94%]'}`}>
        <div className="rounded-2xl rounded-tl-md border border-teal-100 bg-teal-50/60 px-4 py-3 text-sm leading-relaxed text-slate-800 dark:border-teal-900/50 dark:bg-slate-800/60 dark:text-slate-100">
          <AgentMarkdown text={msg.content} />
          <SuggestionChips suggestions={msg.suggestions} disabled={loading} onSelect={onSend} />
          <ManualSearchLinks links={msg.manualLinks} />
          {hasJobs ? (
            <div className="mt-4 space-y-3">
              {msg.jobs.map((job, j) => (
                <JobOfferCard
                  key={`${job.sourceUrl}-${j}`}
                  job={job}
                  selected={selectedJob}
                  onSelect={onSelect}
                  onGenerate={onGenerate}
                  generating={loading}
                  profileComplete={profileComplete}
                  dateLocale={dateLocale}
                />
              ))}
            </div>
          ) : null}
          {msg.document?.documentId ? (
            <button
              type="button"
              onClick={() =>
                downloadJobDocument(msg.document.documentId, msg.document.fileName || 'document-mecal.pdf')
              }
              className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${BLUE} ${FOCUS}`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {t('agent.downloadPdf')}
            </button>
          ) : null}
        </div>
        {timeText ? <p className="mt-1 text-[10px] text-slate-400">{timeText}</p> : null}
      </div>
    </div>
  );
}

function ConversationRail({ conversations, activeId, onSelect, onNew, onDelete, onClose, overlay }) {
  const { t, dateLocale } = useUiLocale();
  const grouped = groupConversations(conversations, t, dateLocale);

  return (
    <aside
      className={`flex min-h-0 flex-col border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 ${
        overlay
          ? 'absolute inset-y-0 left-0 z-30 w-[min(20rem,88%)] border-r shadow-2xl'
          : 'w-64 flex-none border-r'
      }`}
    >
      <div className="shrink-0 space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SectionLabel>{t('jobAssistant.conversations')}</SectionLabel>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">
              {conversations.length}
            </span>
          </div>
          {overlay ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('jobAssistant.closePanel')}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onNew}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold shadow-sm ${BLUE} ${FOCUS}`}
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {t('pages.jobAssistant.newConversation')}
        </button>
      </div>

      <div className="historique-scroll min-h-0 flex-1 px-3 pb-4">
        {Object.entries(grouped).map(([period, items]) => (
          <div key={period} className="mb-4">
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{period}</p>
            <ul className="space-y-1">
              {items.map((c) => {
                const active = activeId === c.id;
                return (
                  <li key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelect(c.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full rounded-xl px-3 py-2.5 pr-9 text-left transition ${FOCUS} ${
                        active
                          ? 'bg-[#24478a] text-white shadow-sm'
                          : 'text-slate-800 hover:bg-white dark:text-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="block break-words text-[13px] font-bold leading-snug">{c.title}</span>
                      {c.preview ? (
                        <span
                          className={`mt-0.5 block line-clamp-2 break-words text-[11px] leading-snug ${
                            active ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {c.preview}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      title={t('jobAssistant.deleteTitle')}
                      aria-label={t('jobAssistant.deleteTitle')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      className={`absolute right-1.5 top-2 grid h-7 w-7 place-items-center rounded-lg transition focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
                        active
                          ? 'text-blue-100 hover:bg-white/15 hover:text-white'
                          : 'text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40'
                      }`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {conversations.length === 0 ? (
          <p className="px-2 text-xs leading-relaxed text-slate-500">{t('jobAssistant.noSavedConversations')}</p>
        ) : null}
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-white p-3 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-emerald-600" aria-hidden="true" />
          {t('pages.jobAssistant.sidebarHint')}
        </p>
      </div>
    </aside>
  );
}

/** Four steps from profile to sending, so the person always knows what comes next. */
function JourneySteps({ steps }) {
  const { t } = useI18n();
  const currentIndex = steps.findIndex((s) => !s.done);
  return (
    <div>
      <SectionLabel>{t('jobAssistant.stepsTitle')}</SectionLabel>
      <ol className="mt-3 grid grid-cols-4">
        {steps.map((step, i) => {
          const current = i === currentIndex;
          return (
            <li key={step.id} className="relative flex flex-col items-center text-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2 ${
                    steps[i - 1].done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ) : null}
              <span
                className={`relative grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ring-4 ring-white dark:ring-slate-900 ${
                  step.done
                    ? 'bg-emerald-500 text-white'
                    : current
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={`mt-1.5 text-[11px] font-bold leading-tight ${
                  step.done
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : current
                      ? 'text-teal-700 dark:text-teal-300'
                      : 'text-slate-400'
                }`}
              >
                {t(step.label)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function JobAssistant() {
  const { t, lang, dateLocale } = useUiLocale();
  const { degraded, noteProvider } = useAiDegradedMode();
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [phoneState, setPhoneState] = useState('empty');
  const [activeSource, setActiveSource] = useState('all');
  const [railOpen, setRailOpen] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'docs' | 'profile'
  const [setWorkspaceNode, width] = useElementWidth();
  const layoutReady = useRef(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const saveProfileTimer = useRef(null);

  const overlay = width > 0 && width < OVERLAY_BELOW;
  const fits = (rail, side) => width >= CHAT_MIN + (rail ? RAIL_W : 0) + (side ? PANEL_W : 0);

  // First measurement decides which columns are open by default.
  useEffect(() => {
    if (layoutReady.current || width === 0) return;
    layoutReady.current = true;
    if (width < OVERLAY_BELOW) return;
    setRailOpen(width >= RAIL_W + COMFY_CHAT);
    setPanel(width >= RAIL_W + PANEL_W + COMFY_CHAT ? 'docs' : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  // When the window changes size, keep only what fits: drawers close when the space becomes tight.
  const wasOverlay = useRef(false);
  useEffect(() => {
    if (!layoutReady.current) return;
    if (overlay) {
      if (!wasOverlay.current) {
        setRailOpen(false);
        setPanel(null);
      } else if (railOpen && panel) {
        setRailOpen(false);
      }
    } else if (railOpen && panel && !fits(true, true)) {
      setRailOpen(false);
    } else if (panel && !fits(false, true)) {
      setPanel(null);
    }
    wasOverlay.current = overlay;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, width]);

  const toggleRail = () => {
    if (railOpen) {
      setRailOpen(false);
      return;
    }
    setRailOpen(true);
    if (panel && (overlay || !fits(true, true))) setPanel(null);
  };

  const togglePanel = (name) => {
    if (panel === name) {
      setPanel(null);
      return;
    }
    setPanel(name);
    if (railOpen && (overlay || !fits(true, true))) setRailOpen(false);
  };

  useEffect(() => {
    if (panel !== 'profile') setPhoneState('empty');
  }, [panel]);

  const closeDrawers = () => {
    setRailOpen(false);
    setPanel(null);
  };

  const filledRequired = useMemo(
    () => REQUIRED_KEYS.filter((k) => profile[k]?.trim()?.length > 1).length,
    [profile]
  );
  const profileComplete = filledRequired === REQUIRED_KEYS.length;

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
    if (phoneState === 'partial') {
      toast.error(t('jobAssistant.phoneIncompleteSave'));
      return;
    }
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
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // The message box grows with what is typed, up to a few lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [input, initDone]);

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
    const text = (typeof overrideText === 'string' ? overrideText : input).trim();
    if (!text || loading || !activeConversationId) return;
    setInput('');
    setLoading(true);
    setBannerAlerts([]);
    const locale = lang;
    const systemPrompt = getSystemPromptByLanguage(locale);
    setSearchPhase(getSearchPhaseLabel(activeSource, t));
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, timestamp: new Date().toISOString(), pending: true }
    ]);

    try {
      const { data } = await api.post(
        `/api/job-assistant/conversations/${activeConversationId}/messages`,
        { message: text, sources: resolveSourcesParam(activeSource), locale, systemPrompt }
      );

      applyConversation(data.conversation);
      noteProvider(data.provider);
      if (data.document?.documentId) {
        setPendingDoc(data.document);
      }

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

  const generateDocument = async (type, job = selectedJob, mode) => {
    if (type === 'letter' && !job) {
      toast.error(t('jobAssistant.selectOfferFirst'));
      return;
    }
    if (!profileComplete && !cvMeta?.fileName) {
      toast.error(t('jobAssistant.completeProfileShort'));
      return;
    }
    if (job) setSelectedJob(job);
    setLoading(true);
    try {
      const { data } = await api.post('/api/job-assistant/generate-document', {
        type,
        job: job || selectedJob || undefined,
        profile,
        conversationId: activeConversationId,
        locale: lang,
        mode
      });
      setPendingDoc(data);
      if (data.conversation) applyConversation(data.conversation);
      if (data.documentId) {
        await downloadJobDocument(data.documentId, data.fileName || `${type}-mecal.pdf`);
      }
      toast.success(
        type === 'cv'
          ? t('jobAssistant.cvGenerated')
          : type === 'recommendation'
            ? t('jobAssistant.recoGenerated')
            : t('jobAssistant.letterGenerated')
      );
    } catch (e) {
      toast.error(e.response?.data?.message || t('jobAssistant.generationError'));
    } finally {
      setLoading(false);
    }
  };

  const conversationJobs = useMemo(() => {
    const seen = new Set();
    const jobs = [];
    for (const m of messages) {
      for (const job of m.jobs || []) {
        const key = job.sourceUrl || `${job.title}|${job.organization}`;
        if (seen.has(key)) continue;
        seen.add(key);
        jobs.push(job);
      }
    }
    return jobs;
  }, [messages]);

  const filteredDocs = useMemo(
    () => conversationJobs.filter((job) => jobMatchesSource(job, activeSource)),
    [conversationJobs, activeSource]
  );

  const askAboutJob = (job) => {
    selectJob(job);
    handleSend(
      `Parle-moi précisément de cette offre : « ${job.title} » chez ${job.organization} (${job.city || 'RDC'}, source ${job.platform || job.source || 'vérifiée'}). ${job.sourceUrl || ''}`
    );
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

  const canMakeCv = profileComplete || Boolean(cvMeta?.fileName);
  const letterDisabledReason = !selectedJob
    ? t('jobAssistant.docsDisabledSelectOffer')
    : !canMakeCv
      ? t('jobAssistant.docsDisabledCompleteProfile')
      : '';

  const alreadySent = Boolean(
    selectedJob && submissions.some((s) => s.jobTitle && s.jobTitle === selectedJob.title)
  );
  const steps = [
    { id: 'profile', label: 'jobAssistant.stepProfile', done: canMakeCv },
    { id: 'offer', label: 'jobAssistant.stepOffer', done: Boolean(selectedJob) },
    { id: 'document', label: 'jobAssistant.stepDocument', done: Boolean(pendingDoc) },
    { id: 'send', label: 'jobAssistant.stepSend', done: alreadySent }
  ];

  const hasUserMessage = messages.some((m) => m.role === 'user');
  const starters = [
    { key: 'search', icon: Search, tone: 'bg-[#e3ebf9] text-[#24478a]', text: t('jobAssistant.starterSearch') },
    { key: 'cv', icon: FileText, tone: 'bg-teal-50 text-teal-700', text: t('jobAssistant.starterCv') },
    { key: 'letter', icon: PenLine, tone: 'bg-violet-50 text-violet-700', text: t('jobAssistant.starterLetter') }
  ];

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
      <div className="page-shell overflow-y-auto pb-8">
        <Link
          to="/assistant-emploi"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#24478a] hover:underline dark:text-blue-300"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t('jobAssistant.backToAssistant')}
        </Link>
        <LinkedInLogistiqueRDC />
      </div>
    );
  }

  const compact = width > 0 && width < 640;

  const toggleBase =
    'inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-bold transition sm:gap-1.5 sm:px-3 sm:text-[13px]';
  const toggleClass = (on, onClass) =>
    `${toggleBase} ${FOCUS} ${
      on ? `${onClass} shadow-sm` : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
    }`;
  const panelAccent =
    panel === 'profile'
      ? { band: 'border-violet-100 bg-violet-50 dark:border-slate-700 dark:bg-slate-900', tile: 'bg-violet-700 text-white' }
      : { band: 'border-teal-100 bg-teal-50 dark:border-slate-700 dark:bg-slate-900', tile: 'bg-teal-700 text-white' };

  const topBlock = (
    <header className="shrink-0 border-b border-slate-200 px-4 py-2.5 md:px-5 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <span className="relative grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#24478a] text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          </span>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">
              {t('pages.jobAssistant.title')}
            </h1>
            <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
              {t('pages.jobAssistant.subtitle')}
            </p>
          </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 sm:flex sm:w-auto dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={railOpen}
            onClick={toggleRail}
            className={toggleClass(railOpen, 'bg-[#24478a] text-white')}
          >
            <MessagesSquare className="h-3.5 w-3.5 flex-none sm:h-4 sm:w-4" aria-hidden="true" />
            {t('jobAssistant.conversations')}
          </button>
          <button
            type="button"
            aria-pressed={panel === 'docs'}
            onClick={() => togglePanel('docs')}
            className={toggleClass(panel === 'docs', 'bg-teal-700 text-white')}
          >
            <FileText className="h-3.5 w-3.5 flex-none sm:h-4 sm:w-4" aria-hidden="true" />
            {t('jobAssistant.documents')}
          </button>
          <button
            type="button"
            aria-pressed={panel === 'profile'}
            onClick={() => togglePanel('profile')}
            className={toggleClass(panel === 'profile', 'bg-violet-700 text-white')}
          >
            <span className="relative inline-flex">
              <UserCircle className="h-3.5 w-3.5 flex-none sm:h-4 sm:w-4" aria-hidden="true" />
              {!profileComplete && panel !== 'profile' ? (
                <span
                  className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-slate-100 dark:ring-slate-800"
                  title={t('jobAssistant.incompleteProfileTitle')}
                />
              ) : null}
            </span>
            {t('jobAssistant.myProfile')}
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <div
      ref={setWorkspaceNode}
      className="relative flex h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
    >
      {overlay && (railOpen || panel) ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-slate-900/40"
          aria-label={t('jobAssistant.closePanel')}
          onClick={closeDrawers}
        />
      ) : null}

      {railOpen ? (
        <ConversationRail
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={(id) => {
            loadConversation(id);
            if (overlay) setRailOpen(false);
          }}
          onNew={async () => {
            await createNewConversation();
            if (overlay) setRailOpen(false);
          }}
          onDelete={handleDeleteConversation}
          onClose={() => setRailOpen(false)}
          overlay={overlay}
        />
      ) : null}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!compact ? topBlock : null}

        <div ref={scrollRef} className="chat-scroll min-h-0 flex-1">
          {compact ? topBlock : null}
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 md:px-6">
            {degraded ? (
              <p
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-snug text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {t('agent.degradedMode')}
              </p>
            ) : null}
            {messages.map((msg, i) => (
              <MessageRow
                key={msg._id || i}
                msg={msg}
                loading={loading}
                onSend={handleSend}
                selectedJob={selectedJob}
                onSelect={selectJob}
                onGenerate={generateDocument}
                profileComplete={profileComplete}
                dateLocale={dateLocale}
              />
            ))}

            {!hasUserMessage && !loading ? (
              <div className="ml-11">
                <SectionLabel>{t('jobAssistant.starterTitle')}</SectionLabel>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {starters.map(({ key, icon: Icon, tone, text }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSend(text)}
                      className={`flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3 text-left text-[13px] font-semibold leading-snug text-slate-700 transition hover:border-[#24478a] hover:bg-[#f2f6fc] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ${FOCUS}`}
                    >
                      <span className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${tone}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-3" role="status">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-teal-600 text-white">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border border-teal-100 bg-teal-50/60 px-4 py-2.5 dark:border-teal-900/50 dark:bg-slate-800/60">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-600"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </span>
                  <span className="text-xs font-semibold leading-snug text-teal-800 dark:text-teal-200">
                    {searchPhase || t('jobAssistant.thinking')}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 md:px-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto max-w-4xl">
            <AlertBanner alerts={bannerAlerts} />
            <div className="mb-2">
              <SourceRow activeSource={activeSource} onChange={setActiveSource} disabled={loading} />
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 transition focus-within:border-[#24478a] focus-within:ring-4 focus-within:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800">
              <textarea
                ref={inputRef}
                rows={compact ? 2 : 1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={t('jobAssistant.inputPlaceholder')}
                aria-label={t('jobAssistant.inputPlaceholder')}
                className="max-h-36 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-snug text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button
                type="button"
                disabled={loading || !input.trim()}
                onClick={() => handleSend()}
                aria-label={t('jobAssistant.send')}
                title={t('jobAssistant.send')}
                className={`grid h-10 w-10 flex-none place-items-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-45 ${BLUE} ${FOCUS}`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[11px] leading-snug text-slate-400">{t('jobAssistant.sendHint')}</p>
          </div>
        </div>
      </section>

      {panel ? (
        <aside
          className={`flex min-h-0 flex-col border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 ${
            overlay
              ? 'absolute inset-y-0 right-0 z-30 w-[min(22rem,94%)] border-l shadow-2xl'
              : 'w-[21.25rem] flex-none border-l'
          }`}
        >
          <div className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${panelAccent.band}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${panelAccent.tile}`}>
                {panel === 'docs' ? <FileText className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {panel === 'docs' ? t('jobAssistant.documents') : t('jobAssistant.myProfile')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPanel(null)}
              aria-label={t('jobAssistant.closePanel')}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {panel === 'profile' ? (
            <>
              <div className="profil-scroll min-h-0 flex-1 space-y-4 p-4">
                <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {t('jobAssistant.requiredFields', { done: filledRequired, total: REQUIRED_KEYS.length })}
                    </p>
                    {profileComplete ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('jobAssistant.complete')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> {t('jobAssistant.incomplete')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100 dark:bg-slate-700" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-all ${profileComplete ? 'bg-emerald-500' : 'bg-violet-600'}`}
                      style={{ width: `${(filledRequired / REQUIRED_KEYS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <CvUploadZone uploading={cvUploading} cvMeta={cvMeta} onFileSelect={handleCvUpload} />

                {PROFILE_SECTIONS.map(({ id: sectionId, title, icon: SectionIcon, fields }) => {
                  const filledCount = fields.filter((k) => profile[k]?.trim()?.length > 0).length;
                  return (
                    <section
                      key={sectionId}
                      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60"
                    >
                      <div className="mb-3.5 flex items-center justify-between gap-2">
                        <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-900 dark:text-white">
                          <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-slate-700 dark:text-violet-300">
                            <SectionIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                          {t(title)}
                        </h3>
                        <span className="text-[11px] font-bold tabular-nums text-slate-400">
                          {filledCount}/{fields.length}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {fields.map((key) => {
                          const [, labelKey, required] = PROFILE_FIELD_KEYS.find(([k]) => k === key);
                          const filled = profile[key]?.trim()?.length > 0;
                          const isLong = LONG_PROFILE_FIELDS.has(key);
                          const LeadIcon = FIELD_ICONS[key];
                          const fieldClass =
                            'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-600/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
                          return (
                            <div key={key}>
                              <label
                                htmlFor={`profile-${key}`}
                                className="mb-1.5 flex items-center justify-between gap-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200"
                              >
                                <span>
                                  {t(labelKey)}
                                  {required ? <span className="ml-1 text-red-500">*</span> : null}
                                </span>
                                {filled ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                    {t('jobAssistant.filledLabel')}
                                  </span>
                                ) : null}
                              </label>
                              {key === 'phone' ? (
                                <PhoneField
                                  id="profile-phone"
                                  value={profile.phone || ''}
                                  onChange={(v) => updateProfile((p) => ({ ...p, phone: v }))}
                                  onStatus={setPhoneState}
                                />
                              ) : isLong ? (
                                <textarea
                                  id={`profile-${key}`}
                                  rows={4}
                                  value={profile[key] || ''}
                                  placeholder={PROFILE_PLACEHOLDER_KEYS[key] ? t(PROFILE_PLACEHOLDER_KEYS[key]) : ''}
                                  onChange={(e) => updateProfile((p) => ({ ...p, [key]: e.target.value }))}
                                  className={`${fieldClass} resize-none`}
                                />
                              ) : (
                                <div className="relative">
                                  {LeadIcon ? (
                                    <LeadIcon
                                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                      aria-hidden="true"
                                    />
                                  ) : null}
                                  <input
                                    id={`profile-${key}`}
                                    type={key === 'email' ? 'email' : 'text'}
                                    value={profile[key] || ''}
                                    placeholder={PROFILE_PLACEHOLDER_KEYS[key] ? t(PROFILE_PLACEHOLDER_KEYS[key]) : ''}
                                    onChange={(e) => updateProfile((p) => ({ ...p, [key]: e.target.value }))}
                                    className={`${fieldClass} ${LeadIcon ? 'pl-9' : ''}`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={saveProfileNow}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-600/30 disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t('jobAssistant.saveProfile')}
                </button>
              </div>
            </>
          ) : (
            <div className="historique-scroll min-h-0 flex-1 space-y-5 p-4">
              <JourneySteps steps={steps} />

              <div>
                <div className="flex items-center justify-between gap-2">
                  <SectionLabel>{t('jobAssistant.offersInChat')}</SectionLabel>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {filteredDocs.length}
                  </span>
                </div>
                {cvMeta?.fileName ? (
                  <p className="mt-2 break-words rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 dark:bg-slate-800 dark:text-blue-200">
                    {t('jobAssistant.lastCv', { name: cvMeta.fileName })}
                  </p>
                ) : null}
                {filteredDocs.length ? (
                  <ul className="mt-2 space-y-2">
                    {filteredDocs.map((job, i) => {
                      const active = Boolean(selectedJob?.sourceUrl && selectedJob.sourceUrl === job.sourceUrl);
                      return (
                        <li
                          key={`${job.sourceUrl || job.title}-${i}`}
                          className={`rounded-xl border bg-white p-3 transition dark:bg-slate-800 ${
                            active ? 'border-teal-700 ring-1 ring-teal-700' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectJob(job)}
                            aria-pressed={active}
                            className={`block w-full text-left ${FOCUS}`}
                          >
                            <span className="flex items-start justify-between gap-2">
                              <span className="break-words text-[13px] font-bold leading-snug text-slate-900 dark:text-white">
                                {job.title}
                              </span>
                              {active ? (
                                <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-teal-700 text-white">
                                  <Check className="h-3 w-3" aria-hidden="true" />
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block break-words text-xs text-slate-500 dark:text-slate-400">
                              {job.organization}
                            </span>
                          </button>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {job.verified ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                                {t('jobAssistant.verifiedSource')}
                              </span>
                            ) : null}
                            {job.sourceUrl ? (
                              <a
                                href={job.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline dark:text-blue-300"
                              >
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                {t('jobAssistant.viewSourceOffer')}
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => askAboutJob(job)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:underline dark:text-blue-300"
                            >
                              <Bot className="h-3 w-3" aria-hidden="true" />
                              {t('jobAssistant.discussOffer')}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-xs leading-relaxed text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    {t('jobAssistant.noOfferSelected')}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={loading || !canMakeCv}
                  title={!canMakeCv ? t('jobAssistant.docsDisabledCompleteProfile') : ''}
                  onClick={() => generateDocument('cv')}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${TEAL} ${FOCUS}`}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  {t('jobAssistant.generateCvPdf')}
                </button>
                <button
                  type="button"
                  disabled={loading || !canMakeCv}
                  title={!canMakeCv ? t('jobAssistant.docsDisabledCompleteProfile') : ''}
                  onClick={() => generateDocument('cv', selectedJob, 'correct')}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border border-teal-700 bg-white px-3 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-blue-200 ${FOCUS}`}
                >
                  <PenLine className="h-4 w-4" aria-hidden="true" />
                  {t('jobAssistant.correctCvPdf')}
                </button>
                <button
                  type="button"
                  disabled={loading || !selectedJob || selectedJob.isManualLink || !canMakeCv}
                  title={letterDisabledReason}
                  onClick={() => generateDocument('letter')}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-teal-700 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${FOCUS}`}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {t('jobAssistant.generateLetterPdf')}
                </button>
                {letterDisabledReason ? (
                  <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    <Info className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                    {letterDisabledReason}
                  </p>
                ) : null}
              </div>

              {pendingDoc ? (
                <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <p className="flex items-start gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                    <span className="break-words">{pendingDoc.fileName || 'document-mecal.pdf'}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJobDocument(pendingDoc.documentId, pendingDoc.fileName || 'document-mecal.pdf')
                    }
                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${TEAL} ${FOCUS}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t('agent.downloadPdf')}
                  </button>
                  <button
                    type="button"
                    onClick={openSubmitModal}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {t('jobAssistant.sendApplication')}
                  </button>
                </div>
              ) : null}

              {submissions.length > 0 ? (
                <div>
                  <SectionLabel>{t('jobAssistant.sentHistory')}</SectionLabel>
                  <ul className="mt-2 space-y-2">
                    {submissions.map((s) => (
                      <li
                        key={s._id}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        <p className="break-words font-bold text-slate-800 dark:text-slate-100">{s.jobTitle}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-500 dark:text-slate-400">
                          <span>{new Date(s.submittedAt).toLocaleDateString(dateLocale)}</span>
                          <ArrowRight className="h-3 w-3 flex-none" aria-hidden="true" />
                          <span className="break-all">{s.recipientEmail}</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      ) : null}

      {showSubmit ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('jobAssistant.confirmSend')}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('jobAssistant.submitHint')}</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['to', t('jobAssistant.recipient'), 'rh@organisation.org'],
                ['subject', t('jobAssistant.subject'), '']
              ].map(([field, label, placeholder]) => (
                <div key={field}>
                  <label htmlFor={`submit-${field}`} className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {label}
                  </label>
                  <input
                    id={`submit-${field}`}
                    value={submitForm[field]}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#24478a] focus:outline-none focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              ))}
              <div>
                <label htmlFor="submit-body" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {t('jobAssistant.messageHtml')}
                </label>
                <textarea
                  id="submit-body"
                  value={submitForm.body}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-[#24478a] focus:outline-none focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setShowSubmit(false)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('jobAssistant.cancel')}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmSubmit}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? t('jobAssistant.sending') : t('jobAssistant.confirmAndSend')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
