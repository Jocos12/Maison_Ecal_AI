import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowRight,
  Ban,
  BarChart3,
  Bot,
  Boxes,
  Car,
  CheckCircle2,
  ChevronDown,
  Database,
  FlaskConical,
  Filter,
  GraduationCap,
  History,
  Info,
  Layers,
  Loader2,
  MapPin,
  Play,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
  XCircle
} from 'lucide-react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import AgentSkipDetailPanel from '../components/agent/AgentSkipDetailPanel.jsx';
import { AiProviderMark } from '../components/agent/AiProviderMark.jsx';

const TABS = [
  { id: 'search', icon: Search },
  { id: 'results', icon: BarChart3 },
  { id: 'config', icon: Settings },
  { id: 'history', icon: History }
];

const SERVICES = [
  { key: 'formation', icon: GraduationCap, tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  { key: 'formation_chauffeurs', icon: Car, tone: 'bg-lime-50 text-lime-800 ring-lime-200' },
  { key: 'etude_marche', icon: BarChart3, tone: 'bg-violet-50 text-violet-800 ring-violet-200' },
  { key: 'inventaire_actifs', icon: Boxes, tone: 'bg-orange-50 text-orange-800 ring-orange-200' },
  { key: 'inventaire_general', icon: Warehouse, tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  { key: 'consultance', icon: Users, tone: 'bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1]' }
];
const EXCLUDED = ['jobs', 'roads', 'eies', 'audits', 'purchases', 'sanitation', 'abroad'];
const CITIES = ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi', 'RDC'];
const PROVIDERS = [
  ['claude', 'Claude'],
  ['groq', 'Groq'],
  ['gemini', 'Gemini']
];
const RECENT_COUNT = 3;
const REASONS_SHOWN = 4;

function reasonRows(skipReasons) {
  if (!skipReasons) return [];
  const entries = skipReasons instanceof Map ? [...skipReasons.entries()] : Object.entries(skipReasons);
  return entries
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, count }));
}

function Card({ className = '', children }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

function CardTitle({ icon: Icon, tone = 'bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800 dark:text-blue-200', title, hint }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${tone}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function LogStatus({ status, t }) {
  const base = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold';
  if (status === 'success') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('pages.agent.logSuccess')}
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className={`${base} bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {t('pages.agent.logRunning')}
      </span>
    );
  }
  return (
    <span className={`${base} bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300`}>
      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
      {t('pages.agent.logError')}
    </span>
  );
}

/** One collection: when it ran, what it read, kept and set aside, and why offers were set aside. */
function LogCard({ log, t, locale, onDetails, compact = false }) {
  const [all, setAll] = useState(false);
  const raw = Number(log.totalRaw ?? 0);
  const saved = Number(log.saved ?? 0);
  const skipped = Number(log.skipped ?? 0);
  const reasons = reasonRows(log.skipReasons);
  const maxReason = reasons[0]?.count || 1;
  const visible = all ? reasons : reasons.slice(0, REASONS_SHOWN);
  const when = new Date(log.startedAt);
  const base = Math.max(raw, saved + skipped, 1);

  const tiles = [
    { key: 'collected', label: t('pages.agent.collected'), value: raw, icon: Database, tone: 'text-slate-600 dark:text-slate-300' },
    { key: 'saved', label: t('pages.agent.saved'), value: saved, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'filtered', label: t('pages.agent.filtered'), value: skipped, icon: Filter, tone: 'text-amber-600 dark:text-amber-400' }
  ];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <LogStatus status={log.status} t={t} />
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {format(when, 'dd MMM yyyy', { locale })}
            <span className="ml-2 font-medium text-slate-500 dark:text-slate-400">{format(when, 'HH:mm')}</span>
          </p>
        </div>
      </header>

      <div className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-2.5">
        {tiles.map(({ key, label, value, icon: Icon, tone }) => (
          <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 sm:block dark:bg-slate-800/70">
            <div className={`flex items-center gap-1.5 ${tone}`}>
              <Icon className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{label}</span>
            </div>
            <p className={`text-2xl font-extrabold leading-none tabular-nums sm:mt-1.5 ${tone}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        {saved ? <span className="bg-emerald-500" style={{ width: `${(saved / base) * 100}%` }} /> : null}
        {skipped ? <span className="bg-amber-400" style={{ width: `${(skipped / base) * 100}%` }} /> : null}
      </div>

      {!compact && reasons.length ? (
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {visible.map(({ key, count }) => {
            const label = t(`pages.agent.skipReasons.${key}`);
            const text = label === `pages.agent.skipReasons.${key}` ? key.replace(/_/g, ' ') : label;
            return (
              <li key={key}>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="min-w-0 leading-snug text-slate-700 dark:text-slate-200">{text}</span>
                  <span className="flex flex-none items-center gap-2.5">
                    <span className="font-bold tabular-nums text-amber-700 dark:text-amber-400">{count}</span>
                    <button
                      type="button"
                      onClick={() => onDetails(log, key, text, count)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#24478a]/40 px-2.5 py-1 text-[11px] font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:border-blue-300/40 dark:text-blue-300"
                    >
                      <Search className="h-3 w-3" aria-hidden="true" />
                      {t('pages.agent.details')}
                    </button>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/50" aria-hidden="true">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxReason) * 100}%` }} />
                </div>
              </li>
            );
          })}
          {reasons.length > REASONS_SHOWN ? (
            <li>
              <button
                type="button"
                onClick={() => setAll((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24478a] hover:underline dark:text-blue-300"
              >
                {all ? t('pages.agent.showLess') : t('pages.agent.showAll', { count: reasons.length })}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${all ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {!compact && saved === 0 && skipped > 0 && reasons.length === 0 ? (
        <p className="mt-3 text-xs italic text-slate-500">{t('pages.agent.detailMissing')}</p>
      ) : null}
    </article>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
      {text}
    </div>
  );
}

export default function Agent() {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const [status, setStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAI, setTestingAI] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [serverRunning, setServerRunning] = useState(false);
  const [tab, setTab] = useState('search');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailContext, setDetailContext] = useState(null);
  const startedRef = useRef(false);

  const busy = running || serverRunning;

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)),
    [logs]
  );
  const latest = sortedLogs[0];

  const load = useCallback(async () => {
    const [s, l, ai] = await Promise.all([
      api.get('/api/agent/status'),
      api.get('/api/agent/logs'),
      api.get('/api/ai/status').catch(() => ({ data: null }))
    ]);
    setStatus(s.data);
    setLogs(Array.isArray(l.data) ? l.data : []);
    setAiStatus(ai.data);
    return Array.isArray(l.data) ? l.data : [];
  }, []);

  useEffect(() => {
    load().catch(() => {});
    api
      .get('/api/opportunities/scrape/status')
      .then(({ data }) => setServerRunning(data?.running === true))
      .catch(() => {});
  }, [load]);

  // While a collection runs, look at its progress every few seconds.
  useEffect(() => {
    if (!busy) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const { data } = await api.get('/api/opportunities/scrape/status');
        if (data?.running !== false) return;
        const fresh = await load();
        const newest = [...fresh].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
        if (startedRef.current) {
          startedRef.current = false;
          if (newest?.status === 'error') toast.error(t('pages.agent.runFailed'));
          else if ((newest?.saved ?? 0) > 0) toast.success(t('pages.agent.runDone', { saved: newest.saved }));
          else toast(t('pages.agent.runNone', { skipped: newest?.skipped ?? 0 }), { duration: 6000 });
        }
        setRunning(false);
        setServerRunning(false);
      } catch {
        /* the next tick tries again */
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [busy, load, t]);

  const openDetailPanel = (log, reasonKey, label, count) => {
    setDetailContext({
      logId: log._id,
      reasonKey,
      categoryLabel: label,
      count,
      logDate: new Date(log.startedAt).toLocaleString(lang === 'fr' ? 'fr-FR' : undefined)
    });
    setShowDetailPanel(true);
  };

  const startScan = async (quick) => {
    if (busy) {
      toast(t('pages.agent.alreadyRunning'));
      return;
    }
    setRunning(true);
    startedRef.current = true;
    try {
      const res = await api.post('/api/opportunities/scrape', { background: true, quick });
      if (res.status === 202 && res.data?.started === false) {
        startedRef.current = false;
        toast(t('pages.agent.alreadyRunning'));
        setRunning(false);
        setServerRunning(true);
      } else if (res.status !== 202) {
        // older server: it answered when the whole collection was over
        startedRef.current = false;
        const data = res.data || {};
        if (data.saved > 0) toast.success(t('pages.agent.runDone', { saved: data.saved }));
        else toast(t('pages.agent.runNone', { skipped: data.skipped ?? 0 }), { duration: 6000 });
        await load();
        setRunning(false);
      }
    } catch (e) {
      startedRef.current = false;
      toast.error(e.response?.data?.message || t('pages.agent.runFailed'));
      setRunning(false);
    }
  };

  const testAI = async () => {
    setTestingAI(true);
    try {
      const { data } = await api.post('/api/ai/test');
      toast.success(`${t('pages.agent.testOk', { provider: data.provider })}${data.response ? ` : ${data.response}` : ''}`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || t('pages.agent.testFail'));
    } finally {
      setTestingAI(false);
    }
  };

  const reclassify = async (useAI = false) => {
    setReclassifying(true);
    try {
      const { data } = await api.post('/api/opportunities/reclassify', { useAI });
      toast.success(t('pages.agent.reclassifyDone', { updated: data.updated, archived: data.archived, aVerifier: data.aVerifier }));
    } catch (e) {
      toast.error(e.response?.data?.message || t('pages.agent.reclassifyFail'));
    } finally {
      setReclassifying(false);
    }
  };

  const lastWhen = latest ? format(new Date(latest.startedAt), 'dd MMM yyyy, HH:mm', { locale }) : null;

  return (
    <div className="page-shell">
      <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        {/* Control panel: who the agent is, what it is doing, the buttons to start it, the AIs behind it */}
        <aside className="contents lg:sticky lg:top-2 lg:block lg:space-y-4">
          <Card className="order-1 overflow-hidden lg:order-none">
            <div className="bg-[#24478a] p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold ${
                    busy ? 'bg-amber-400 text-slate-900' : 'bg-white/15 text-white'
                  }`}
                  role="status"
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                  )}
                  {busy ? t('pages.agent.statusRunning') : t('pages.agent.statusReady')}
                </span>
              </div>
              <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t('pages.agent.title')}</h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-blue-100">{t('pages.agent.subtitle')}</p>
            </div>

            <div className="space-y-3 p-5">
              <button
                type="button"
                onClick={() => startScan(true)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl bg-[#24478a] px-4 py-3 text-left text-white shadow-sm transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/30 disabled:cursor-wait disabled:opacity-80"
              >
                {running ? <Loader2 className="h-5 w-5 flex-none animate-spin" /> : <Play className="h-5 w-5 flex-none" />}
                <span>
                  <span className="block text-sm font-bold">{running ? t('pages.agent.running') : t('pages.agent.runQuick')}</span>
                  <span className="block text-[11px] text-blue-100">{t('pages.agent.runQuickHint')}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => startScan(false)}
                disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 text-left transition hover:border-[#24478a] hover:bg-[#f4f7fd] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 disabled:cursor-wait disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
              >
                <Layers className="h-4 w-4 flex-none text-[#24478a] dark:text-blue-300" aria-hidden="true" />
                <span>
                  <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100">{t('pages.agent.runFull')}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t('pages.agent.runFullHint')}</span>
                </span>
              </button>
              {busy ? (
                <div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-[#24478a]" />
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{t('pages.agent.runningHint')}</p>
                </div>
              ) : null}

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('pages.agent.lastRun')}</p>
                {latest ? (
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{lastWhen}</p>
                    <LogStatus status={latest.status} t={t} />
                  </div>
                ) : (
                  <p className="mt-1.5 text-[13px] text-slate-500">{t('pages.agent.noRun')}</p>
                )}
              </div>
            </div>
          </Card>

          {aiStatus ? (
            <Card className="order-3 p-5 lg:order-none">
              <CardTitle
                icon={ShieldCheck}
                title={t('pages.agent.providersTitle')}
                hint={aiStatus.message || t('pages.agent.providersNone')}
              />
              <ul className="mt-4 space-y-2">
                {PROVIDERS.map(([id, label]) => {
                  const provider = aiStatus.providers?.[id] || {};
                  const state = provider.ready ? 'active' : provider.configured ? 'cooldown' : 'off';
                  const tone =
                    state === 'active'
                      ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/30 dark:ring-emerald-900'
                      : state === 'cooldown'
                        ? 'bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900'
                        : 'bg-slate-50 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700';
                  const dot = state === 'active' ? 'bg-emerald-500' : state === 'cooldown' ? 'bg-amber-500' : 'bg-slate-400';
                  return (
                    <li key={id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ${tone}`}>
                      <AiProviderMark id={id} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p>
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                          {state === 'active'
                            ? t('pages.agent.providerActive')
                            : state === 'cooldown'
                              ? t('pages.agent.providerCooldown')
                              : t('pages.agent.providerOff')}
                          {provider.failCount > 0 ? <span className="text-slate-400">· {t('pages.agent.failures', { count: provider.failCount })}</span> : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={testAI}
                disabled={testingAI}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#24478a] px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 disabled:opacity-60 dark:border-blue-300 dark:text-blue-300"
              >
                {testingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                {testingAI ? t('pages.agent.testing') : t('pages.agent.testAi')}
              </button>
            </Card>
          ) : null}
        </aside>

        {/* Work area */}
        <div className="order-2 min-w-0 space-y-5 lg:order-none">
          <nav
            className="flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            role="tablist"
          >
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 sm:flex-none ${
                  tab === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 flex-none" aria-hidden="true" />
                {t(`pages.agent.tabs.${id}`)}
              </button>
            ))}
          </nav>

          {tab === 'search' ? (
            <>
              <p className="flex items-start gap-2.5 rounded-2xl bg-[#eaf0fb] px-4 py-3 text-xs leading-relaxed text-[#1b3a72] dark:bg-slate-800 dark:text-blue-100">
                <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                {t('pages.agent.logsHint')}
              </p>
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pages.agent.recentTitle')}</h2>
                {sortedLogs.length > RECENT_COUNT ? (
                  <button
                    type="button"
                    onClick={() => setTab('history')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24478a] hover:underline dark:text-blue-300"
                  >
                    {t('pages.agent.seeHistory')}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              {sortedLogs.length ? (
                <div className="space-y-3">
                  {sortedLogs.slice(0, RECENT_COUNT).map((log) => (
                    <LogCard key={log._id} log={log} t={t} locale={locale} onDetails={openDetailPanel} />
                  ))}
                </div>
              ) : (
                <Empty text={t('pages.agent.noLogs')} />
              )}
            </>
          ) : null}

          {tab === 'history' ? (
            <>
              <div className="px-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pages.agent.historyTitle')}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('pages.agent.logsHint')}</p>
              </div>
              {sortedLogs.length ? (
                <div className="space-y-3">
                  {sortedLogs.map((log) => (
                    <LogCard key={log._id} log={log} t={t} locale={locale} onDetails={openDetailPanel} />
                  ))}
                </div>
              ) : (
                <Empty text={t('pages.agent.noLogs')} />
              )}
            </>
          ) : null}

          {tab === 'results' ? (
            <Card className="p-6">
              <CardTitle icon={BarChart3} title={t('pages.agent.resultsTitle')} hint={t('pages.agent.resultsText')} />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {latest
                  ? [
                      { key: 'collected', value: latest.totalRaw ?? 0, tone: 'text-slate-700 dark:text-slate-200' },
                      { key: 'saved', value: latest.saved ?? 0, tone: 'text-emerald-600 dark:text-emerald-400' },
                      { key: 'filtered', value: latest.skipped ?? 0, tone: 'text-amber-600 dark:text-amber-400' }
                    ].map(({ key, value, tone }) => (
                      <div key={key} className="flex flex-row-reverse items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:block dark:bg-slate-800/70">
                        <p className={`text-3xl font-extrabold leading-none tabular-nums ${tone}`}>{value}</p>
                        <p className="text-[11px] sm:mt-2 font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                          {t(`pages.agent.${key}`)}
                        </p>
                      </div>
                    ))
                  : null}
              </div>
              <Link
                to="/opportunities"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25"
              >
                {t('pages.agent.seeOpportunities')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Card>
          ) : null}

          {tab === 'config' ? (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="p-5">
                  <CardTitle
                    icon={CheckCircle2}
                    tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    title={t('pages.agent.includedTitle')}
                    hint={t('pages.agent.includedHint')}
                  />
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {SERVICES.map(({ key, icon: Icon, tone }) => (
                      <li key={key} className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ring-1 ${tone}`}>
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {t(`opportunities.${key}`)}
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="p-5">
                  <CardTitle
                    icon={Ban}
                    tone="bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                    title={t('pages.agent.excludedTitle')}
                  />
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {EXCLUDED.map((key) => (
                      <li
                        key={key}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] font-semibold text-red-800 ring-1 ring-red-200 dark:bg-red-950/30 dark:text-red-200 dark:ring-red-900"
                      >
                        <XCircle className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                        {t(`pages.agent.excluded.${key}`)}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>

              <Card className="p-5">
                <CardTitle
                  icon={MapPin}
                  tone="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
                  title={t('pages.agent.citiesTitle')}
                  hint={t('pages.agent.citiesHint')}
                />
                <ul className="mt-4 flex flex-wrap gap-2">
                  {CITIES.map((city) => (
                    <li
                      key={city}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1.5 text-[12px] font-semibold text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/30 dark:text-teal-200 dark:ring-teal-900"
                    >
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {city}
                    </li>
                  ))}
                </ul>
              </Card>

              {isAdmin ? (
                <Card className="p-5">
                  <CardTitle icon={Settings} title={t('pages.agent.adminTitle')} hint={t('pages.agent.adminHint')} />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => reclassify(false)}
                      disabled={reclassifying}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#24478a] px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 disabled:opacity-60 dark:border-blue-300 dark:text-blue-300"
                    >
                      {reclassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {t('pages.agent.rescore')}
                    </button>
                    <button
                      type="button"
                      onClick={() => reclassify(true)}
                      disabled={reclassifying}
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/40 disabled:opacity-60"
                    >
                      {reclassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {t('pages.agent.rescoreAi')}
                    </button>
                  </div>
                </Card>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <AgentSkipDetailPanel
        open={showDetailPanel}
        logId={detailContext?.logId}
        reasonKey={detailContext?.reasonKey}
        categoryLabel={detailContext?.categoryLabel}
        count={detailContext?.count}
        logDate={detailContext?.logDate}
        onClose={() => setShowDetailPanel(false)}
      />
    </div>
  );
}
