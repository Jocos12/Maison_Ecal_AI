import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  RadarChart,
  Radar,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  Clock,
  Filter,
  Globe,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Search,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client.js';
import { openMecalAgent } from '../components/agent/AIAgentFloat.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import {
  buildApplicationStatusData,
  buildJobsFoundData,
  buildKpis,
  buildPendingApplications,
  buildPipeline,
  buildRejectionReasonsData,
  buildSourcePerformanceData,
  buildWeeklyActivityData
} from '../utils/analyticsData.js';

const BLUE = '#24478a';
const GREEN = '#10b981';
const AMBER = '#f59e0b';
const VIOLET = '#7c3aed';
const TEAL = '#0f766e';
const RED = '#ef4444';
const PALETTE = [BLUE, GREEN, VIOLET, AMBER, TEAL, RED];
const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';
const AXIS = { fontSize: 11, fill: '#64748b' };
const TOOLTIP = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 };

function CardTitle({ icon: Icon, tone = 'bg-[#e3ebf9] text-[#24478a]', title, hint, aside }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
      </div>
      {aside}
    </div>
  );
}

function LegendChips({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
      {items.map(([color, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <p className="grid h-full min-h-[8rem] place-items-center rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
      {children}
    </p>
  );
}

/** One column of the blue scoreboard: a big figure, what it counts, and a small coloured mark. */
function ScoreCell({ icon: Icon, accent, label, value, sub }) {
  return (
    <div className="relative bg-[#24478a] p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase leading-snug tracking-[0.14em] text-blue-200">{label}</p>
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/15 text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-5 text-5xl font-extrabold leading-none tabular-nums text-white">{value}</p>
      <p className="mt-3 flex items-center gap-2 text-xs font-medium leading-snug text-blue-100">
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: accent }} aria-hidden="true" />
        {sub}
      </p>
    </div>
  );
}

export default function Analytics() {
  const { t, dateLocale } = useUiLocale();
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [raw, setRaw] = useState({ analytics: {}, applications: [], opportunities: [], logs: [], messages: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, appsRes, oppsRes, logsRes, gmailStatusRes] = await Promise.allSettled([
        api.get('/api/analytics'),
        api.get('/api/applications'),
        api.get('/api/opportunities', { params: { limit: 500 } }),
        api.get('/api/agent/logs'),
        api.get('/api/gmail/status')
      ]);
      const analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value.data || {} : {};
      const applications = appsRes.status === 'fulfilled' && Array.isArray(appsRes.value.data) ? appsRes.value.data : [];
      const oppsData = oppsRes.status === 'fulfilled' ? oppsRes.value.data : [];
      const opportunities = Array.isArray(oppsData?.data) ? oppsData.data : Array.isArray(oppsData) ? oppsData : [];
      const agentLogs = logsRes.status === 'fulfilled' && Array.isArray(logsRes.value.data) ? logsRes.value.data : [];
      const logs = agentLogs.length ? agentLogs : analytics.logs || [];

      let messages = [];
      if (gmailStatusRes.status === 'fulfilled' && gmailStatusRes.value.data?.connected) {
        try {
          const { data } = await api.get('/api/gmail/messages', { params: { maxResults: 100 } });
          messages = data.messages || [];
        } catch {
          messages = [];
        }
      }
      setRaw({ analytics, applications, opportunities, logs, messages });
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { analytics, applications, opportunities, logs, messages } = raw;
  const kpis = useMemo(() => buildKpis({ opportunities, applications, messages, logs }), [opportunities, applications, messages, logs]);
  const collectData = useMemo(() => buildJobsFoundData(logs, dateLocale), [logs, dateLocale]);
  const statusData = useMemo(() => buildApplicationStatusData(applications), [applications]);
  const reasons = useMemo(() => buildRejectionReasonsData(logs), [logs]);
  const sources = useMemo(() => buildSourcePerformanceData(analytics.bySource || []), [analytics]);
  const weekData = useMemo(() => buildWeeklyActivityData(logs, applications, messages, dateLocale), [logs, applications, messages, dateLocale]);
  const pendingRows = useMemo(() => buildPendingApplications(applications, dateLocale), [applications, dateLocale]);
  const pipeline = useMemo(() => buildPipeline({ logs, applications }), [logs, applications]);

  const statusTotal = statusData.reduce((sum, s) => sum + s.value, 0);
  const totalReasons = reasons.reduce((sum, r) => sum + r.count, 0);
  const weekHasData = weekData.some((d) => d.collectes || d.candidatures || d.messages);
  const pipeMax = Math.max(0, ...pipeline.map((p) => p.value));

  const reasonLabel = (key) => {
    const label = t(`pages.agent.skipReasons.${key}`);
    return label === `pages.agent.skipReasons.${key}` ? key.replace(/_/g, ' ') : label;
  };

  const radialData = reasons.map((r, i) => ({ name: reasonLabel(r.key), value: r.count, fill: PALETTE[i % PALETTE.length] }));
  // The width follows the square root of the figure (never under 14 %) so small stages stay visible; the real figure is written next to each stage
  const funnelData = pipeline.map((p) => ({
    name: t(`analyticsPage.pipe.${p.key}`),
    value: p.value,
    shape: pipeMax > 0 ? Math.max(Math.sqrt(p.value / pipeMax), 0.14) : 0,
    fill: p.color
  }));

  const handleRelaunch = (row) => {
    openMecalAgent(
      t('analyticsPage.relaunchPrompt', {
        status: t(`analyticsPage.status.${row.status}`),
        post: row.post || t('analyticsPage.untitled'),
        org: row.org || t('alertsPage.notAvailable'),
        src: row.src,
        date: row.date
      })
    );
  };

  const kpiCards = [
    { icon: Search, tone: 'bg-[#e3ebf9] text-[#24478a]', color: BLUE, label: t('analyticsPage.kpiCollected'), value: kpis.collected, sub: t('analyticsPage.kpiCollectedSub') },
    {
      icon: Save,
      tone: 'bg-emerald-50 text-emerald-700',
      color: GREEN,
      label: t('analyticsPage.kpiSaved'),
      value: kpis.saved,
      sub: kpis.lastSaved ? t('analyticsPage.kpiSavedDelta', { count: kpis.lastSaved }) : t('analyticsPage.kpiSavedActive')
    },
    { icon: Inbox, tone: 'bg-violet-50 text-violet-700', color: VIOLET, label: t('analyticsPage.kpiApplications'), value: kpis.applications, sub: t('analyticsPage.kpiApplicationsSub', { count: kpis.pending }) },
    { icon: Mail, tone: 'bg-amber-50 text-amber-700', color: AMBER, label: t('analyticsPage.kpiMessages'), value: kpis.messages, sub: t('analyticsPage.kpiMessagesSub', { count: kpis.unread }) }
  ];

  return (
    <div className="page-shell min-h-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#24478a] text-white shadow-sm">
            <BarChart3 className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white">{t('pages.analytics.title')}</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('pages.analytics.subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Clock className="h-3.5 w-3.5" aria-hidden="true" />}
            {loading || !updatedAt
              ? t('analyticsPage.loading')
              : t('analyticsPage.updatedAt', { time: updatedAt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) })}
          </span>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25 disabled:opacity-60 dark:bg-slate-900 dark:text-blue-200"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {t('analyticsPage.refresh')}
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-3xl bg-[#24478a] shadow-sm">
        <span className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full border-[30px] border-white/5" aria-hidden="true" />
        <div className="relative grid gap-px bg-white/15 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <ScoreCell key={card.label} {...card} accent={card.color} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* 1. Area chart: offers found and saved over the days */}
        <section className={CARD}>
          <CardTitle
            icon={TrendingUp}
            title={t('analyticsPage.chartCollect')}
            hint={t('analyticsPage.chartCollectHint')}
            aside={<LegendChips items={[[BLUE, t('analyticsPage.found')], [GREEN, t('analyticsPage.saved')]]} />}
          />
          <div className="mt-4 h-64 w-full">
            {collectData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collectData} margin={{ top: 10, right: 12, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Area type="monotone" dataKey="found" name={t('analyticsPage.found')} stroke={BLUE} strokeWidth={2.5} fill={BLUE} fillOpacity={0.14} dot={{ r: 3.5, fill: BLUE }} />
                  <Area type="monotone" dataKey="saved" name={t('analyticsPage.saved')} stroke={GREEN} strokeWidth={2.5} fill={GREEN} fillOpacity={0.18} dot={{ r: 3.5, fill: GREEN }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>{t('analyticsPage.noData')}</EmptyNote>
            )}
          </div>
        </section>

        {/* 2. Donut: status of the applications */}
        <section className={CARD}>
          <CardTitle icon={Inbox} tone="bg-violet-50 text-violet-700" title={t('analyticsPage.statusTitle')} />
          {statusTotal === 0 ? (
            <div className="mt-4 h-64">
              <EmptyNote>{t('analyticsPage.statusNone')}</EmptyNote>
            </div>
          ) : (
            <div className="mt-4">
              <div className="relative mx-auto h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData.map((s) => ({ ...s, name: t(`analyticsPage.status.${s.key}`) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-3xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">{statusTotal}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('analyticsPage.statusTotal')}</p>
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {statusData.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} aria-hidden="true" />
                      {t(`analyticsPage.status.${item.key}`)}
                    </span>
                    <span className="font-bold tabular-nums text-slate-900 dark:text-white">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3. Horizontal bars: offers per source */}
        <section className={CARD}>
          <CardTitle icon={Globe} tone="bg-teal-50 text-teal-700" title={t('analyticsPage.sourcesTitle')} hint={t('analyticsPage.sourcesHint')} />
          <div className="mt-4 h-64 w-full">
            {sources.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sources} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="source" width={92} tick={{ fontSize: 12, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(36,71,138,0.06)' }} formatter={(value) => [t('analyticsPage.offersCount', { count: value }), '']} />
                  <Bar dataKey="found" radius={[0, 8, 8, 0]} barSize={20}>
                    {sources.map((s, i) => (
                      <Cell key={s.source} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="found" position="right" style={{ fontSize: 12, fontWeight: 700, fill: '#0f172a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>{t('analyticsPage.sourcesNone')}</EmptyNote>
            )}
          </div>
        </section>

        {/* 4. Radial bars: why offers are rejected */}
        <section className={CARD}>
          <CardTitle icon={AlertTriangle} tone="bg-amber-50 text-amber-700" title={t('analyticsPage.reasonsTitle')} hint={t('analyticsPage.reasonsHint')} />
          {reasons.length ? (
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-56 w-56 flex-none">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart data={radialData} innerRadius="40%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={10}>
                    <RadialBar dataKey="value" background={{ fill: '#f1f5f9' }} cornerRadius={8} />
                    <Tooltip contentStyle={TOOLTIP} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <p className="text-2xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">{totalReasons}</p>
                    <p className="mt-1 max-w-[4.5rem] text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{t('analyticsPage.reasonsTotal')}</p>
                  </div>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-2.5 self-stretch">
                {radialData.map((r) => (
                  <li key={r.name} className="flex items-start justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-start gap-2 text-slate-700 dark:text-slate-200">
                      <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full" style={{ background: r.fill }} aria-hidden="true" />
                      <span className="break-words leading-snug">{r.name}</span>
                    </span>
                    <span className="flex-none font-bold tabular-nums text-slate-900 dark:text-white">
                      {r.value} · {Math.round((r.value / totalReasons) * 100)} %
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 h-56">
              <EmptyNote>{t('analyticsPage.reasonsNone')}</EmptyNote>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 5. Radar: the rhythm of the last seven days */}
        <section className={CARD}>
          <CardTitle
            icon={CalendarDays}
            title={t('analyticsPage.weekTitle')}
            hint={t('analyticsPage.weekHint')}
            aside={
              <LegendChips
                items={[
                  [BLUE, t('analyticsPage.collects')],
                  [GREEN, t('analyticsPage.applicationsLabel')],
                  [AMBER, t('analyticsPage.messagesLabel')]
                ]}
              />
            }
          />
          <div className="mt-2 h-72 w-full">
            {weekHasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={weekData} outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="day" tick={{ fontSize: 12, fill: '#334155' }} />
                  <PolarRadiusAxis angle={90} allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} />
                  <Radar name={t('analyticsPage.collects')} dataKey="collectes" stroke={BLUE} fill={BLUE} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name={t('analyticsPage.applicationsLabel')} dataKey="candidatures" stroke={GREEN} fill={GREEN} fillOpacity={0.2} strokeWidth={2} />
                  <Radar name={t('analyticsPage.messagesLabel')} dataKey="messages" stroke={AMBER} fill={AMBER} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={TOOLTIP} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyNote>{t('analyticsPage.noData')}</EmptyNote>
            )}
          </div>
        </section>

        {/* 6. Funnel: from a collected offer to an accepted application */}
        <section className={CARD}>
          <CardTitle icon={Filter} tone="bg-violet-50 text-violet-700" title={t('analyticsPage.pipelineTitle')} hint={t('analyticsPage.pipelineHint')} />
          {pipeMax > 0 ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="h-64 w-full sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <FunnelChart>
                    <Tooltip contentStyle={TOOLTIP} formatter={(_, __, item) => [item?.payload?.value, item?.payload?.name]} />
                    <Funnel dataKey="shape" data={funnelData} isAnimationActive={false} stroke="none">
                      {funnelData.map((p) => (
                        <Cell key={p.name} fill={p.fill} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              </div>
              <ol className="min-w-0 flex-1 space-y-3">
                {funnelData.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2 text-slate-700 dark:text-slate-200">
                      <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: p.fill }} aria-hidden="true" />
                      <span className="break-words leading-snug">{p.name}</span>
                    </span>
                    <span className="flex-none font-bold tabular-nums text-slate-900 dark:text-white">
                      {p.value}
                      {i > 0 && funnelData[i - 1].value > 0 ? (
                        <span className="ml-1.5 text-xs font-semibold text-slate-400">{Math.round((p.value / funnelData[i - 1].value) * 100)} %</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="mt-4 h-64">
              <EmptyNote>{t('analyticsPage.noData')}</EmptyNote>
            </div>
          )}
        </section>
      </div>

      <section className={CARD}>
        <CardTitle icon={Clock} tone="bg-orange-50 text-orange-700" title={t('analyticsPage.pendingTitle')} />
        {pendingRows.length ? (
          <div className="mt-4">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-3 px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 md:grid">
              {['colPost', 'colOrg', 'colSource', 'colDate', 'colStatus', 'colAction'].map((k) => (
                <span key={k}>{t(`analyticsPage.${k}`)}</span>
              ))}
            </div>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {pendingRows.map((row) => (
                <li
                  key={row.id}
                  className="grid gap-x-3 gap-y-2 px-3 py-3.5 text-sm transition hover:bg-slate-50 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] md:items-center dark:hover:bg-slate-800/50"
                >
                  <span className="break-words font-bold leading-snug text-slate-900 dark:text-white">{row.post || t('analyticsPage.untitled')}</span>
                  <span className="break-words text-slate-600 dark:text-slate-300">{row.org}</span>
                  <span>
                    <span className="inline-flex rounded-lg bg-[#eaf0fb] px-2 py-1 text-xs font-semibold text-[#1b3a72] dark:bg-slate-800 dark:text-blue-200">{row.src}</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{row.date}</span>
                  <span>
                    <span
                      className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${
                        row.status === 'interview'
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                          : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      {t(`analyticsPage.status.${row.status}`)}
                    </span>
                  </span>
                  <span>
                    <button
                      type="button"
                      onClick={() => handleRelaunch(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-700 px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-700 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-700/30 dark:text-violet-300"
                    >
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('analyticsPage.relaunch')}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyNote>{t('analyticsPage.pendingNone')}</EmptyNote>
          </div>
        )}
      </section>
    </div>
  );
}
