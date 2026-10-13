import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle,
  Bot,
  Brain,
  CalendarClock,
  CheckCircle2,
  Clock,
  Gauge,
  Handshake,
  Hourglass,
  Loader2,
  Mail,
  MailCheck,
  Megaphone,
  Newspaper,
  Send,
  SendHorizonal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  BellRing,
  Briefcase,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import Dropdown from '../components/ui/Dropdown.jsx';
import ScoreRing from '../components/ui/ScoreRing.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { AgentMarkdown } from '../utils/agentMarkdown.jsx';
import { stripMarkdown } from '../utils/stripMarkdown.js';
import {
  buildMarketingStats,
  buildWeeklyChart,
  EMAIL_TEMPLATES,
  getPendingApplications,
  getRecentApplications,
  getStatusIconType,
  isApplied,
  PRIORITY_STYLES
} from '../utils/marketingData.js';

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const TEMPLATE_STYLE = {
  cold_outreach: { icon: Send, tone: 'bg-[#e3ebf9] text-[#24478a]' },
  followup_j7: { icon: CalendarClock, tone: 'bg-teal-50 text-teal-700' },
  followup_j14: { icon: BellRing, tone: 'bg-orange-50 text-orange-700' },
  collaboration_b2b: { icon: Handshake, tone: 'bg-indigo-50 text-indigo-700' },
  newsletter: { icon: Newspaper, tone: 'bg-emerald-50 text-emerald-700' },
  post_interview: { icon: UserCheck, tone: 'bg-violet-50 text-violet-700' }
};

function Kpi({ icon: Icon, tone, label, value, sub, aside, footer }) {
  return (
    <div className="flex flex-col gap-3 bg-white p-5 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-3xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">{value}</p>
        {aside}
      </div>
      <div className="text-xs leading-snug text-slate-500 dark:text-slate-400">{sub}</div>
      {footer}
    </div>
  );
}

function StatusTile({ type }) {
  if (type === 'check') {
    return (
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  if (type === 'send') {
    return (
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
        <SendHorizonal className="h-4 w-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
      <Clock className="h-4 w-4" aria-hidden="true" />
    </span>
  );
}

function TemplateModal({ open, title, content, loading, pendingApps, onClose, onSent }) {
  const { t } = useUiLocale();
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState('');
  const [step, setStep] = useState('view');
  const [preview, setPreview] = useState(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(content || '');
    setStep('view');
    setPreview(null);
    setSelectedId(pendingApps[0]?.id || '');
  }, [open, content, pendingApps]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const selected = pendingApps.find((a) => a.id === selectedId);
  const field =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  const openPreview = async () => {
    if (!selected?.opportunityId) {
      toast.error(t('marketingPage.pickPending'));
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/api/applications/preview-email', {
        applicationId: selected.id,
        opportunityId: selected.opportunityId,
        letterOverride: draft
      });
      setPreview(data);
      setTo(data.to || selected.contact || '');
      setSubject(data.subject || title || t('marketingPage.defaultSubject'));
      setBody(stripMarkdown(draft || data.body || ''));
      setStep('confirm');
    } catch (e) {
      toast.error(e.response?.data?.message || t('marketingPage.previewFail'));
    } finally {
      setBusy(false);
    }
  };

  const confirmSend = async () => {
    if (!to.includes('@') || !body.trim()) {
      toast.error(t('marketingPage.recipientRequired'));
      return;
    }
    if (!preview?.gmailConnected) {
      toast.error(t('marketingPage.connectGmail'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/applications/send-email', {
        applicationId: selected.id,
        opportunityId: selected.opportunityId,
        confirmed: true,
        to,
        subject,
        body
      });
      toast.success(t('marketingPage.sent'));
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || t('marketingPage.sendFail'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onClose} role="presentation">
      <div
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-start gap-3 bg-[#24478a] px-5 py-4 text-white">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white text-[#24478a]">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-100">{t('marketingPage.modalKicker')}</p>
            <h3 className="mt-0.5 break-words text-base font-bold leading-snug">{title || t('marketingPage.defaultTitle')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-white/15 transition hover:rotate-90 hover:bg-red-600"
            aria-label={t('marketingPage.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-[#24478a]" />
              {t('marketingPage.generatingModal')}
            </div>
          ) : step === 'confirm' ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {t('marketingPage.confirmSendTo', { title: selected?.title || '' })}
              </p>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('marketingPage.recipient')}
                <input value={to} onChange={(e) => setTo(e.target.value)} className={field} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('marketingPage.subject')}
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={field} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                {t('marketingPage.message')}
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={`${field} resize-none`} />
              </label>
              {!preview?.gmailConnected ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  {t('marketingPage.gmailOff')}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setStep('view')}
                  className={`rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${FOCUS}`}
                >
                  {t('marketingPage.back')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmSend}
                  className={`inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60 ${FOCUS}`}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('marketingPage.confirmSend')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <AgentMarkdown text={draft || content} />
              </div>
              {pendingApps.length ? (
                <div className="mt-5 space-y-3 rounded-xl border border-[#c9d8f1] bg-[#f4f7fd] p-4 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('marketingPage.sendToPending')}</p>
                  <Dropdown
                    label={t('marketingPage.sendToPending')}
                    icon={Briefcase}
                    value={selectedId}
                    defaultValue={selectedId}
                    onChange={setSelectedId}
                    options={pendingApps.map((app) => ({
                      value: app.id,
                      label: t('marketingPage.pendingOption', { title: app.title, days: app.daysPending })
                    }))}
                  />
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={5}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={openPreview}
                    className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {t('marketingPage.preview')}
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-xs text-slate-500">{t('marketingPage.noPending')}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Marketing() {
  const { t, dateLocale } = useUiLocale();
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [insights, setInsights] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [tab, setTab] = useState('advice');
  const [modal, setModal] = useState({ open: false, title: '', content: '', loading: false });
  const chatScrollRef = useRef(null);
  const autoRan = useRef(false);

  const appliedApps = useMemo(() => applications.filter((a) => isApplied(a.status)), [applications]);
  const stats = useMemo(() => buildMarketingStats(applications), [applications]);
  const chartData = useMemo(() => buildWeeklyChart(applications, dateLocale), [applications, dateLocale]);
  const recentApps = useMemo(() => getRecentApplications(applications, 4), [applications]);
  const pendingApps = useMemo(() => getPendingApplications(applications), [applications]);
  const chartMax = Math.max(0, ...chartData.map((d) => Math.max(d.soumises, d.repondues)));

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const { data } = await api.get('/api/applications');
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      toast.error(t('marketingPage.loadFail'));
    } finally {
      setLoadingApps(false);
    }
  }, [t]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisDone(false);
    try {
      const { data: apps } = await api.get('/api/applications');
      const list = Array.isArray(apps) ? apps : [];
      setApplications(list);
      const applied = list.filter((a) => isApplied(a.status));
      if (!applied.length) {
        toast.error(t('marketingPage.nothingToAnalyze'));
        return;
      }
      const { data } = await api.post('/api/ai/marketing/analyze');
      setInsights(Array.isArray(data?.conseils) ? data.conseils : []);
      setAnalysisDone(true);
      toast.success(t('marketingPage.analysisUpdated'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('marketingPage.aiUnavailable'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [t]);

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadingApps && appliedApps.length > 0 && !autoRan.current) {
      autoRan.current = true;
      handleAnalyze();
    }
  }, [loadingApps, appliedApps.length, handleAnalyze]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleAskAI = async (text) => {
    const q = (typeof text === 'string' ? text : question).trim();
    if (!q || chatLoading) return;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setChatLoading(true);
    try {
      const { data } = await api.post('/api/ai/marketing/chat', { question: q, history: messages });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer || t('marketingPage.unavailable') }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e.response?.data?.message || t('marketingPage.chatError') }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerate = async ({ prompt, templateKey, title, key }) => {
    setGeneratingKey(key || templateKey);
    setModal({ open: true, title: title || t('marketingPage.defaultTitle'), content: '', loading: true });
    try {
      const { data } = await api.post('/api/ai/marketing/generate', { prompt, templateKey });
      setModal({
        open: true,
        title: data.title || title || t('marketingPage.defaultTitle'),
        content: data.content || '',
        loading: false
      });
    } catch (e) {
      setModal({
        open: true,
        title: title || t('marketingPage.errorTitle'),
        content: e.response?.data?.message || t('marketingPage.genFailed'),
        loading: false
      });
    } finally {
      setGeneratingKey(null);
    }
  };

  const scoreSub =
    stats.scoreEvolution > 0 ? (
      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        {t('marketingPage.scoreUp', { pts: stats.scoreEvolution })}
      </span>
    ) : stats.scoreEvolution < 0 ? (
      <span className="inline-flex items-center gap-1 font-semibold text-red-600">
        <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
        {t('marketingPage.scoreDown', { pts: stats.scoreEvolution })}
      </span>
    ) : (
      t('marketingPage.scoreStable')
    );

  const analyzeLabel = isAnalyzing
    ? t('marketingPage.analyzing')
    : analysisDone
      ? t('marketingPage.refreshAnalysis')
      : t('marketingPage.analyze');

  return (
    <div className="page-shell space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#24478a] text-white shadow-sm">
            <Megaphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white">
              {t('pages.marketing.title')}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('pages.marketing.subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={isAnalyzing || loadingApps}
          onClick={handleAnalyze}
          title={t('marketingPage.analyzeHint')}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${FOCUS} ${
            analysisDone && !isAnalyzing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#24478a] hover:bg-[#1c3a72]'
          }`}
        >
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : analysisDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {analyzeLabel}
        </button>
      </header>

      {/* Four indicators in one strip */}
      <section className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
        <Kpi
          icon={Briefcase}
          tone="bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800"
          label={t('marketingPage.kpiApplied')}
          value={stats.total}
          sub={t('marketingPage.kpiAppliedSub')}
        />
        <Kpi
          icon={MailCheck}
          tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
          label={t('marketingPage.kpiAnswered')}
          value={stats.answered}
          sub={t('marketingPage.kpiAnsweredSub', { rate: stats.answerRate })}
          footer={
            <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-slate-700" aria-hidden="true">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, stats.answerRate)}%` }} />
            </div>
          }
        />
        <Kpi
          icon={Hourglass}
          tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40"
          label={t('marketingPage.kpiPending')}
          value={stats.pending}
          sub={t('marketingPage.kpiPendingSub', { days: stats.avgPendingDays })}
        />
        <Kpi
          icon={Gauge}
          tone="bg-violet-50 text-violet-700 dark:bg-violet-950/40"
          label={t('marketingPage.kpiScore')}
          value={stats.avgScore ? `${stats.avgScore} %` : t('marketingPage.scoreNone')}
          sub={scoreSub}
          aside={stats.avgScore ? <ScoreRing value={stats.avgScore} size={44} stroke={5} /> : null}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className={`${CARD} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('marketingPage.chartTitle')}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t('marketingPage.chartHint')}
                {chartMax === 0 ? t('marketingPage.chartNoDates') : t('marketingPage.chartDates')}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#24478a]" aria-hidden="true" />
                {t('marketingPage.submitted')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                {t('marketingPage.answered')}
              </span>
            </div>
          </div>
          <div className="mt-4 h-64 w-full">
            {loadingApps ? (
              <div className="flex h-full items-center justify-center text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('marketingPage.loading')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} domain={[0, Math.max(chartMax, 3)]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.periode || ''}
                    formatter={(value, name) => [value, name]}
                    cursor={{ fill: 'rgba(36,71,138,0.06)' }}
                  />
                  <Bar dataKey="soumises" name={t('marketingPage.submitted')} fill="#24478a" radius={[5, 5, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="repondues" name={t('marketingPage.answered')} fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={`${CARD} p-5`}>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('marketingPage.recentTitle')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('marketingPage.recentHint', { count: 4 })}</p>
          <ul className="mt-4 space-y-2.5">
            {recentApps.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600">
                {t('marketingPage.recentNone')}
              </li>
            ) : (
              recentApps.map((app) => {
                const open = ['pending', 'submitted'].includes(app.status);
                return (
                  <li
                    key={app.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <StatusTile type={getStatusIconType(app.status)} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-snug text-slate-900 dark:text-white">{app.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {app.source}
                        {app.score ? ` · ${t('marketingPage.scoreOf', { score: app.score })}` : ''}
                      </p>
                      <div className="mt-2">
                        {open && stats.avgPendingDays > 0 && app.daysPending >= stats.avgPendingDays ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            {t('marketingPage.followUp', { days: app.daysPending })}
                          </span>
                        ) : open && app.daysPending >= 7 ? (
                          <span className="inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
                            {t('marketingPage.days', { days: app.daysPending })}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            {t(`marketingPage.status.${app.status}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      {/* AI advisor: advice cards and a chat, in two tabs */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-violet-700 text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-[10rem] flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('marketingPage.advisorTitle')}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('marketingPage.advisorSubtitle')}</p>
          </div>
          <span className="rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800 ring-1 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900">
            {t('marketingPage.basedOn', { count: stats.total })}
          </span>
        </div>

        <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800/40" role="tablist">
          {[
            ['advice', t('marketingPage.tabAdvice'), Sparkles],
            ['chat', t('marketingPage.tabChat'), Bot]
          ].map(([id, label, TabIcon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${FOCUS} ${
                tab === id ? 'bg-violet-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <TabIcon className="h-4 w-4" aria-hidden="true" />
              {label}
              {id === 'advice' && insights.length ? (
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${tab === id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'}`}>
                  {insights.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'advice' ? (
            <>
              {isAnalyzing && !insights.length ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-violet-200 py-12 text-sm text-slate-500 dark:border-violet-900">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-700" />
                  {t('marketingPage.analyzingAi')}
                </div>
              ) : null}
              {!isAnalyzing && !insights.length && stats.total === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-600">
                  {t('marketingPage.adviceEmpty')}
                </p>
              ) : null}
              {!isAnalyzing && !insights.length && stats.total > 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-500 dark:border-slate-600">
                  {t('marketingPage.adviceIdle')}
                </p>
              ) : null}
              <div className="grid gap-4 md:grid-cols-2">
                {insights.map((item, idx) => {
                  const prioKey = PRIORITY_STYLES[item.priorite] ? item.priorite : 'moyenne';
                  const prio = PRIORITY_STYLES[prioKey];
                  const genKey = `insight-${idx}`;
                  return (
                    <article
                      key={genKey}
                      className={`flex flex-col rounded-xl border border-l-4 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40 ${prio.border}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 flex-none text-violet-600" aria-hidden="true" />
                          <h3 className="break-words text-sm font-bold leading-snug text-slate-900 dark:text-white">{item.titre}</h3>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${prio.badge}`}>
                          {t(`marketingPage.priority.${prioKey}`)}
                        </span>
                      </div>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.conseil}</p>
                      <button
                        type="button"
                        disabled={generatingKey === genKey}
                        onClick={() => handleGenerate({ prompt: item.prompt, title: item.action || item.titre, key: genKey })}
                        className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-violet-700 bg-white px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-700 hover:text-white disabled:opacity-60 dark:bg-slate-900 dark:text-violet-300 ${FOCUS}`}
                      >
                        {generatingKey === genKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {item.action || t('marketingPage.generate')}
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('marketingPage.chatTitle')}</p>
              <div
                ref={chatScrollRef}
                className="historique-scroll h-72 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40"
              >
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t('marketingPage.chatEmpty')}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['ex1', 'ex2', 'ex3'].map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleAskAI(t(`marketingPage.${k}`))}
                          className={`rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 transition hover:bg-violet-700 hover:text-white dark:border-violet-900 dark:bg-slate-900 dark:text-violet-200 ${FOCUS}`}
                        >
                          {t(`marketingPage.${k}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {messages.map((msg, i) => (
                  <div
                    key={`msg-${i}`}
                    className={`max-w-[88%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'ml-auto rounded-br-md bg-[#24478a] text-white'
                        : 'mr-auto rounded-tl-md border border-violet-100 bg-violet-50/70 text-slate-800 dark:border-violet-900/50 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {msg.role === 'assistant' ? <AgentMarkdown text={msg.content} /> : msg.content}
                  </div>
                ))}
                {chatLoading ? (
                  <div className="mr-auto inline-flex items-center gap-2 rounded-2xl rounded-tl-md border border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-slate-800 dark:text-violet-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('marketingPage.thinking')}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAskAI();
                    }
                  }}
                  placeholder={t('marketingPage.chatPlaceholder')}
                  aria-label={t('marketingPage.chatPlaceholder')}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-700 focus:ring-4 focus:ring-violet-700/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleAskAI()}
                  disabled={chatLoading || !question.trim()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-bold text-white transition hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-700/30 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {t('marketingPage.send')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ready-made e-mail templates */}
      <section className={`${CARD} p-5`}>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('marketingPage.templatesTitle')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('marketingPage.templatesHint')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {EMAIL_TEMPLATES.map((tpl) => {
            const style = TEMPLATE_STYLE[tpl.key] || TEMPLATE_STYLE.cold_outreach;
            const TplIcon = style.icon;
            const label = t(`marketingPage.templates.${tpl.key}.label`);
            return (
              <button
                key={tpl.key}
                type="button"
                disabled={generatingKey === tpl.key}
                onClick={() => handleGenerate({ templateKey: tpl.key, title: label })}
                className={`group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-[#24478a]/50 hover:shadow-md disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800/40 ${FOCUS}`}
              >
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${style.tone}`}>
                  {generatingKey === tpl.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <TplIcon className="h-5 w-5" aria-hidden="true" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">
                    {generatingKey === tpl.key ? t('marketingPage.generating') : t(`marketingPage.templates.${tpl.key}.desc`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <TemplateModal
        open={modal.open}
        title={modal.title}
        content={modal.content}
        loading={modal.loading}
        pendingApps={pendingApps}
        onSent={loadApplications}
        onClose={() => setModal({ open: false, title: '', content: '', loading: false })}
      />
    </div>
  );
}
