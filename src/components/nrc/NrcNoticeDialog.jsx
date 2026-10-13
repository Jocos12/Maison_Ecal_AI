import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  Mail,
  PenLine,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { CountryFlag, DEADLINE_STYLE, FOCUS, SCORE_STYLE, ScoreDial, countryLabel, daysLeft, deadlineTone, fmtDay } from './nrcUi.jsx';

const INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

function Segmented({ value, onChange, options, label }) {
  return (
    <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${FOCUS} ${
            value === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function BriefCard({ icon: Icon, tone, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="flex items-center gap-2.5 text-sm font-extrabold text-slate-900 dark:text-white">
        <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${tone}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ProviderNote({ provider, t }) {
  if (!provider) return null;
  const local = provider === 'local' || provider === 'keywords';
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold ${local ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'}`}>
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      {local ? t('nrcPage.providerLocal') : t('nrcPage.providerAi', { name: provider.charAt(0).toUpperCase() + provider.slice(1) })}
    </p>
  );
}

function BriefSkeleton({ label }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <p className="flex items-center gap-2.5 text-sm font-bold text-[#24478a] dark:text-blue-200">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <span className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="mt-4 space-y-2">
            <span className="block h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
            <span className="block h-3 w-11/12 rounded bg-slate-100 dark:bg-slate-800" />
            <span className="block h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailRow({ label, children }) {
  if (!children) return null;
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4 dark:border-slate-800">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{children}</dd>
    </div>
  );
}

/** Window of a notice, centred on the screen: how well it fits, the AI brief, the draft answer and the raw details. */
export default function NrcNoticeDialog({ noticeId, onClose, onChanged, t, lang, dateLocale }) {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('brief');
  const [briefBusy, setBriefBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftLang, setDraftLang] = useState('en');
  const [draftTone, setDraftTone] = useState('formel');
  const [form, setForm] = useState({ to: '', subject: '', body: '' });
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [briefError, setBriefError] = useState(false);
  const [briefOffline, setBriefOffline] = useState(false);
  const [draftProblem, setDraftProblem] = useState(''); // '' | 'offline' | 'error'
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const panelRef = useRef(null);
  const draftTried = useRef(false);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  const adopt = useCallback((data, { keepForm = false } = {}) => {
    setNotice(data);
    if (keepForm) return;
    setForm({ to: data.draft?.to || '', subject: data.draft?.subject || '', body: data.draft?.body || '' });
    if (data.draft?.language) setDraftLang(data.draft.language);
    if (data.draft?.tone) setDraftTone(data.draft.tone);
    setDirty(false);
  }, []);

  const requestBrief = useCallback(
    async (force = false) => {
      setBriefBusy(true);
      setBriefError(false);
      try {
        const { data } = await api.post(`/api/nrc/${noticeId}/brief`, { lang, force });
        adopt(data, { keepForm: true });
        changedRef.current?.(data);
      } catch (e) {
        setBriefError(true);
        // No answer at all from the server is not the same problem as an error answered by it
        setBriefOffline(!e.response);
      } finally {
        setBriefBusy(false);
      }
    },
    [noticeId, lang, adopt]
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setTab('brief');
    api
      .get(`/api/nrc/${noticeId}`)
      .then(({ data }) => {
        if (!alive) return;
        adopt(data);
        setLoading(false);
        // Nothing to click: the brief is prepared as soon as the notice opens (kept for next time)
        if (data.detailFetchedAt && (!data.brief?.summary || (data.brief.language && data.brief.language !== lang))) requestBrief(false);
      })
      .catch((e) => {
        if (!alive) return;
        toast.error(e.response ? t('nrcPage.toastLoadError') : t('nrcPage.toastOffline'), { id: 'nrc-error' });
        onClose();
      });
    return () => {
      alive = false;
    };
  }, [noticeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const isJob = notice?.kind === 'job';

  const generateBrief = requestBrief;

  // The draft is prepared the first time its tab is opened
  useEffect(() => {
    if (tab === 'draft' && notice?.detailFetchedAt && !notice?.draft?.body && !draftTried.current) {
      draftTried.current = true;
      generateDraft();
    }
  }, [tab, notice]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateDraft = async () => {
    setDraftBusy(true);
    setDraftProblem('');
    try {
      const { data } = await api.post(`/api/nrc/${noticeId}/draft`, { lang: draftLang, tone: draftTone });
      adopt(data);
      onChanged?.(data);
    } catch (e) {
      setDraftProblem(e.response ? 'error' : 'offline');
      toast.error(e.response ? e.response.data?.message || t('nrcPage.toastDraftError') : t('nrcPage.toastOffline'), { id: 'nrc-error' });
    } finally {
      setDraftBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!dirty) return;
    try {
      await api.put(`/api/nrc/${noticeId}/draft`, form);
      setDirty(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast.error(e.response ? t('nrcPage.toastDraftError') : t('nrcPage.toastOffline'), { id: 'nrc-error' });
    }
  };

  const edit = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setDirty(true);
    setSaved(false);
  };

  const copyDraft = async () => {
    const text = `${form.subject ? `${form.subject}\n\n` : ''}${form.body}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const openMailClient = () => {
    const query = `subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.body)}`;
    window.location.href = `mailto:${encodeURIComponent(form.to)}?${query}`;
  };

  const createGmailDraft = async () => {
    setGmailBusy(true);
    try {
      await api.post('/api/gmail/draft', { to: form.to, subject: form.subject, body: form.body });
      toast.success(t('nrcPage.draftGmailDone'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('nrcPage.draftGmailFail'));
    } finally {
      setGmailBusy(false);
    }
  };

  const brief = notice?.brief?.summary ? notice.brief : null;
  const draft = notice?.draft?.body ? notice.draft : null;
  const days = notice ? daysLeft(notice.deadline) : null;
  const tone = deadlineTone(days, notice?.isArchived);
  const score = SCORE_STYLE[notice?.scoreLabel] || SCORE_STYLE.low;
  const KindIcon = isJob ? Briefcase : Gavel;

  const tabs = [
    ['brief', t('nrcPage.tabBrief'), Sparkles],
    ['draft', t('nrcPage.tabDraft'), PenLine],
    ['details', t('nrcPage.tabDetails'), FileText]
  ];

  return createPortal(
    <div
      className="nrc-overlay fixed inset-0 z-[80] grid place-items-center bg-slate-900/55 p-0 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={notice?.title || t('nrcPage.title')}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="nrc-modal-in relative flex h-full w-full max-w-[64rem] flex-col overflow-hidden bg-white shadow-2xl outline-none dark:bg-slate-900 sm:h-[min(90vh,54rem)] sm:rounded-3xl"
      >
        {/* header: what the notice is */}
        <header className="relative flex-shrink-0 overflow-hidden bg-[#24478a] px-5 py-5 text-white sm:px-7">
          <span className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border-[30px] border-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full border-[24px] border-white/5" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <span className="hidden h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm sm:grid">
              <KindIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                  <KindIcon className="h-3 w-3 sm:hidden" aria-hidden="true" />
                  {isJob ? t('nrcPage.kindJob') : t('nrcPage.kindTender')}
                </span>
                {notice?.noticeType && notice.noticeType !== 'Tender' ? <span className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold">{notice.noticeType}</span> : null}
                {notice?.isNew && !notice?.isArchived ? <span className="rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold">{t('nrcPage.new')}</span> : null}
              </div>
              <h2 className="mt-2 break-words text-lg font-extrabold leading-snug sm:text-2xl">{notice?.title || ''}</h2>
              {notice ? (
                <p className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] font-semibold text-blue-100">
                  <span className="inline-flex items-center gap-2">
                    <CountryFlag code={notice.countryCode} />
                    {countryLabel(notice.countryCode, notice.country, lang) || t('nrcPage.countryUnknown')}
                    {notice.location && !String(notice.location).toLowerCase().includes(String(notice.country || '').toLowerCase()) ? <span className="font-medium text-blue-200">{notice.location}</span> : null}
                  </span>
                  {notice.reference ? <span className="break-all">{t('nrcPage.refPrefix', { ref: notice.reference })}</span> : null}
                  {notice.postedDate ? <span className="font-medium text-blue-200">{t('nrcPage.posted', { date: fmtDay(notice.postedDate, dateLocale) })}</span> : null}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('nrcPage.close')}
              className="mecal-x-pop grid h-10 w-10 flex-none place-items-center rounded-full bg-white/15 text-white transition hover:rotate-90 hover:bg-red-600"
            >
              <X className="h-5 w-5" strokeWidth={2.4} />
            </button>
          </div>
        </header>

        {loading || !notice ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            {t('nrcPage.loading')}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 max-lg:overflow-y-auto lg:grid-cols-[19.5rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
            {/* left: the verdict and the facts that matter */}
            <aside className="flex flex-col border-b border-slate-200 bg-[#f3f6fc] dark:border-slate-700 dark:bg-slate-950 lg:min-h-0 lg:border-b-0 lg:border-r">
              <div className="flex-1 p-5 lg:overflow-y-auto lg:overscroll-contain">
              <div className="flex flex-col items-center text-center">
                <ScoreDial value={notice.score} label={notice.scoreLabel} size={96} stroke={8} />
                <p className={`mt-3 text-base font-extrabold ${score.text}`}>{t(`nrcPage.label_${notice.scoreLabel || 'low'}`)}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {notice.scoreReason || (notice.scoreFactors || []).map((f) => t(`nrcPage.factor_${f}`)).filter(Boolean).join(' ')}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-slate-400">{notice.scoreProvider && notice.scoreProvider !== 'keywords' ? t('nrcPage.scoreByAi') : t('nrcPage.scoreByKeywords')}</p>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <CalendarClock className="h-3 w-3" aria-hidden="true" />
                  {t('nrcPage.deadline')}
                </p>
                <p className="mt-1.5 text-lg font-extrabold text-slate-900 dark:text-white">{notice.deadline ? fmtDay(notice.deadline, dateLocale) : t('nrcPage.deadlineNone')}</p>
                {notice.isArchived || days != null ? (
                  <span className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold ${DEADLINE_STYLE[tone]}`}>
                    {notice.isArchived ? t('nrcPage.closed') : days < 0 ? t('nrcPage.expired') : days === 0 ? t('nrcPage.today') : t('nrcPage.daysLeft', { count: days })}
                  </span>
                ) : null}
              </div>

              {notice.matchedKeywords?.length ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('nrcPage.matchedKeywords')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {notice.matchedKeywords.map((k) => (
                      <span key={k} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(notice.contactEmails || []).length ? (
                <div className="mt-5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('nrcPage.detContacts')}</p>
                  <ul className="space-y-1.5">
                    {notice.contactEmails.map((m) => (
                      <li key={m}>
                        <a href={`mailto:${m}`} className="inline-flex max-w-full items-start gap-2 break-all text-xs font-semibold text-[#24478a] underline-offset-2 hover:underline dark:text-blue-300">
                          <Mail className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
                          {m}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              </div>
              <div className="p-5 pt-0 lg:border-t lg:border-slate-200 lg:pt-4 dark:lg:border-slate-700">
              <a
                href={notice.applyUrl || notice.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#24478a] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] ${FOCUS}`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {isJob ? t('nrcPage.applyOnNrc') : t('nrcPage.openOnNrc')}
              </a>
              </div>
            </aside>

            {/* right: brief, draft, details */}
            <div className="flex min-h-0 min-w-0 flex-col">
              <div className="sticky top-0 z-10 flex flex-shrink-0 gap-1 border-b border-slate-200 bg-white px-4 pt-2 dark:border-slate-700 dark:bg-slate-900" role="tablist">
                {tabs.map(([id, label, TabIcon]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-3 text-sm font-bold transition ${FOCUS} ${
                      tab === id ? 'border-[#24478a] text-[#24478a] dark:text-blue-200' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <TabIcon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1 space-y-4 bg-[#f8fafd] p-5 dark:bg-slate-950 sm:p-6 lg:overflow-y-auto lg:overscroll-contain">
              {tab === 'brief' ? (
                brief ? (
                  <>
                    <BriefCard icon={FileText} tone="bg-[#e3ebf9] text-[#24478a]" title={t('nrcPage.briefSummary')}>
                      <p className="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{brief.summary}</p>
                    </BriefCard>

                    <BriefCard icon={Target} tone="bg-teal-50 text-teal-700" title={isJob ? t('nrcPage.briefAsksJob') : t('nrcPage.briefAsks')}>
                      {brief.whatNrcAsks?.length ? (
                        <ul className="space-y-2">
                          {brief.whatNrcAsks.map((a) => (
                            <li key={a} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700 dark:text-slate-200">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-teal-600" aria-hidden="true" />
                              <span className="min-w-0 break-words">{a}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">{t('nrcPage.briefNoAsks')}</p>
                      )}
                    </BriefCard>

                    <BriefCard icon={ClipboardCopy} tone="bg-violet-50 text-violet-700" title={t('nrcPage.briefDocs')}>
                      {brief.requiredDocumentsGeneric ? <p className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{t('nrcPage.briefDocsGeneric')}</p> : null}
                      <ul className="space-y-2">
                        {(brief.requiredDocuments || []).map((d) => (
                          <li key={d} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700 dark:text-slate-200">
                            <FileText className="mt-0.5 h-4 w-4 flex-none text-violet-600" aria-hidden="true" />
                            <span className="min-w-0 break-words">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </BriefCard>

                    {brief.keyDates?.length ? (
                      <BriefCard icon={CalendarClock} tone="bg-indigo-50 text-indigo-700" title={t('nrcPage.briefDates')}>
                        <ol className="space-y-2.5">
                          {brief.keyDates.map((k) => (
                            <li key={`${k.label}-${k.date}`} className="flex items-start gap-3">
                              <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-indigo-500" aria-hidden="true" />
                              <div className="min-w-0 text-sm">
                                <p className="font-bold text-slate-800 dark:text-slate-100">
                                  {k.label}
                                  {k.date ? <span className="font-semibold text-slate-500"> : {fmtDay(k.date, dateLocale)}</span> : null}
                                </p>
                                {k.note ? <p className="text-xs text-slate-500">{k.note}</p> : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </BriefCard>
                    ) : null}

                    {brief.attentionPoints?.length ? (
                      <BriefCard icon={AlertTriangle} tone="bg-amber-50 text-amber-700" title={t('nrcPage.briefAttention')}>
                        <ul className="space-y-2">
                          {brief.attentionPoints.map((a) => (
                            <li key={a} className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                              <span className="min-w-0 break-words">{a}</span>
                            </li>
                          ))}
                        </ul>
                      </BriefCard>
                    ) : null}

                    {brief.fit ? (
                      <BriefCard icon={Target} tone="bg-emerald-50 text-emerald-700" title={isJob ? t('nrcPage.briefFitJob') : t('nrcPage.briefFit')}>
                        <p className="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{brief.fit}</p>
                      </BriefCard>
                    ) : null}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <ProviderNote provider={brief.provider} t={t} />
                      <button
                        type="button"
                        onClick={() => generateBrief(true)}
                        disabled={briefBusy}
                        className={`inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white disabled:opacity-60 dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
                      >
                        {briefBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                        {t('nrcPage.briefRegenerate')}
                      </button>
                    </div>
                    {brief.provider === 'local' && isAdmin ? <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">{t('nrcPage.localNote')}</p> : null}
                  </>
                ) : briefBusy || (notice.detailFetchedAt && !briefError) ? (
                  <BriefSkeleton label={t('nrcPage.briefAnalyzing')} />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${briefError ? 'bg-amber-50 text-amber-700' : 'bg-[#e3ebf9] text-[#24478a]'} dark:bg-slate-800`}>
                      {briefError ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />}
                    </span>
                    <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{briefError ? (briefOffline ? t('nrcPage.toastOffline') : t('nrcPage.briefError')) : t('nrcPage.briefWaitDetail')}</p>
                    <button
                      type="button"
                      onClick={() => (briefError ? requestBrief(false) : window.location.reload())}
                      className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] ${FOCUS}`}
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                      {briefError ? t('nrcPage.briefRetry') : t('nrcPage.reload')}
                    </button>
                  </div>
                )
              ) : null}

              {tab === 'draft' ? (
                <>
                  <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-900">
                    <div>
                      <span className="mb-1.5 block text-[12px] font-bold text-slate-600 dark:text-slate-300">{t('nrcPage.draftLang')}</span>
                      <Segmented value={draftLang} onChange={setDraftLang} label={t('nrcPage.draftLang')} options={[['en', 'English'], ['fr', 'Français']]} />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[12px] font-bold text-slate-600 dark:text-slate-300">{t('nrcPage.draftTone')}</span>
                      <Segmented value={draftTone} onChange={setDraftTone} label={t('nrcPage.draftTone')} options={[['formel', t('nrcPage.toneFormal')], ['semi-formel', t('nrcPage.toneSemi')]]} />
                    </div>
                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={generateDraft}
                        disabled={draftBusy}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
                      >
                        {draftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : draft ? <RefreshCw className="h-4 w-4" aria-hidden="true" /> : <PenLine className="h-4 w-4" aria-hidden="true" />}
                        {draftBusy ? t('nrcPage.draftGenerating') : draft ? t('nrcPage.draftRegenerate') : t('nrcPage.draftGenerate')}
                      </button>
                    </div>
                  </div>

                  {draft ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      {isJob ? <p className="mb-3 rounded-xl bg-[#e3ebf9] px-3 py-2 text-xs font-semibold leading-relaxed text-[#1b3a72] dark:bg-slate-800 dark:text-blue-200">{t('nrcPage.draftJobNote')}</p> : null}
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="nrc-draft-to" className="mb-1.5 block text-[12px] font-bold text-slate-600 dark:text-slate-300">
                            {t('nrcPage.draftTo')}
                          </label>
                          <input id="nrc-draft-to" type="email" value={form.to} onChange={edit('to')} onBlur={saveDraft} list="nrc-contacts" className={`${INPUT} h-11`} />
                          <datalist id="nrc-contacts">
                            {(notice.contactEmails || []).map((m) => (
                              <option key={m} value={m} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label htmlFor="nrc-draft-subject" className="mb-1.5 block text-[12px] font-bold text-slate-600 dark:text-slate-300">
                            {t('nrcPage.draftSubject')}
                          </label>
                          <input id="nrc-draft-subject" value={form.subject} onChange={edit('subject')} onBlur={saveDraft} className={`${INPUT} h-11`} />
                        </div>
                        <div>
                          <label htmlFor="nrc-draft-body" className="mb-1.5 block text-[12px] font-bold text-slate-600 dark:text-slate-300">
                            {t('nrcPage.draftBody')}
                          </label>
                          <textarea id="nrc-draft-body" value={form.body} onChange={edit('body')} onBlur={saveDraft} rows={16} className={`${INPUT} min-h-[16rem] resize-y py-3 leading-relaxed`} />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={copyDraft} className={`inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}>
                          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />}
                          {copied ? t('nrcPage.draftCopied') : t('nrcPage.draftCopy')}
                        </button>
                        <button type="button" onClick={openMailClient} className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1c3a72] ${FOCUS}`}>
                          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('nrcPage.draftMailto')}
                        </button>
                        <button type="button" onClick={createGmailDraft} disabled={gmailBusy} className={`inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-60 dark:border-red-900 dark:bg-slate-900 ${FOCUS}`}>
                          {gmailBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
                          {t('nrcPage.draftGmail')}
                        </button>
                        {saved ? <span className="text-xs font-semibold text-emerald-600">{t('nrcPage.draftSaved')}</span> : null}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <ProviderNote provider={draft.provider} t={t} />
                      </div>
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t('nrcPage.draftHint')}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-600 dark:bg-slate-900">
                      <span className={`mx-auto grid h-14 w-14 place-items-center rounded-2xl ${draftProblem ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'} dark:bg-slate-800`}>
                        {draftProblem ? <AlertTriangle className="h-7 w-7" aria-hidden="true" /> : draftBusy ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" /> : <PenLine className="h-7 w-7" aria-hidden="true" />}
                      </span>
                      {draftProblem ? (
                        <>
                          <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">{draftProblem === 'offline' ? t('nrcPage.toastOffline') : t('nrcPage.draftError')}</p>
                          <button type="button" onClick={generateDraft} disabled={draftBusy} className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}>
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            {t('nrcPage.briefRetry')}
                          </button>
                        </>
                      ) : null}
                      <p className={`mt-4 text-base font-bold text-slate-900 dark:text-white ${draftProblem ? 'hidden' : ''}`}>{t('nrcPage.draftEmptyTitle')}</p>
                      <p className={`mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400 ${draftProblem ? 'hidden' : ''}`}>{isJob ? t('nrcPage.draftEmptyJob') : t('nrcPage.draftEmptyText')}</p>
                    </div>
                  )}
                </>
              ) : null}

              {tab === 'details' ? (
                <div className="space-y-4">
                  {!notice.detailFetchedAt ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t('nrcPage.detNoDetail')}</p> : null}
                  <dl className="rounded-2xl border border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                    <DetailRow label={t('nrcPage.detType')}>{notice.noticeType}</DetailRow>
                    <DetailRow label={t('nrcPage.detReference')}>{notice.reference}</DetailRow>
                    <DetailRow label={t('nrcPage.detCountry')}>{countryLabel(notice.countryCode, notice.country, lang)}</DetailRow>
                    <DetailRow label={t('nrcPage.detLocation')}>{notice.location}</DetailRow>
                    <DetailRow label={t('nrcPage.detPosted')}>{notice.postedDate ? fmtDay(notice.postedDate, dateLocale) : ''}</DetailRow>
                    <DetailRow label={t('nrcPage.detDeadline')}>{notice.deadline ? fmtDay(notice.deadline, dateLocale) : ''}</DetailRow>
                    {isJob ? (
                      <>
                        <DetailRow label={t('nrcPage.detCategory')}>{notice.jobInfo?.category}</DetailRow>
                        <DetailRow label={t('nrcPage.detSchedule')}>{notice.jobInfo?.schedule}</DetailRow>
                        <DetailRow label={t('nrcPage.detWorkplace')}>{notice.jobInfo?.workplace}</DetailRow>
                        <DetailRow label={t('nrcPage.detGrade')}>{[notice.jobInfo?.grade, notice.jobInfo?.level].filter(Boolean).join(' · ')}</DetailRow>
                        <DetailRow label={t('nrcPage.detContract')}>{notice.jobInfo?.contract}</DetailRow>
                      </>
                    ) : null}
                    {notice.submissionSubject ? <DetailRow label={t('nrcPage.detSubject')}>{notice.submissionSubject}</DetailRow> : null}
                    {(notice.contactEmails || []).length ? (
                      <DetailRow label={t('nrcPage.detContacts')}>
                        <span className="flex flex-col gap-1">
                          {notice.contactEmails.map((m) => (
                            <a key={m} href={`mailto:${m}`} className="break-all text-[#24478a] underline-offset-2 hover:underline dark:text-blue-300">
                              {m}
                            </a>
                          ))}
                        </span>
                      </DetailRow>
                    ) : null}
                    {(notice.documents || []).length ? (
                      <DetailRow label={t('nrcPage.detDocuments')}>
                        <span className="flex flex-col gap-1.5">
                          {notice.documents.map((d) => (
                            <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 text-[#24478a] underline-offset-2 hover:underline dark:text-blue-300">
                              <FileText className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                              <span className="min-w-0 break-words">
                                {d.label}
                                {d.size ? <span className="font-medium text-slate-400"> ({d.size})</span> : null}
                              </span>
                            </a>
                          ))}
                        </span>
                      </DetailRow>
                    ) : null}
                  </dl>
                  {notice.description ? (
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('nrcPage.detDescription')}</h3>
                      <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{notice.description}</p>
                    </section>
                  ) : null}
                </div>
              ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
