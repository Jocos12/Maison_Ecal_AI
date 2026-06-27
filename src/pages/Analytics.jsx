import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { openMecalAgent } from '../components/agent/AIAgentFloat.jsx';
import {
  buildApplicationStatusData,
  buildClientMessagesData,
  buildJobsFoundData,
  buildKpis,
  buildPendingApplications,
  buildRejectionReasonsData,
  buildSourcePerformanceData,
  buildWeeklyActivityData
} from '../utils/analyticsData.js';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EMPTY_CHART = [{ label: '—', value: 0 }];

export default function Analytics() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState([]);
  const [jobsFoundData, setJobsFoundData] = useState([]);
  const [applicationStatusData, setApplicationStatusData] = useState([]);
  const [rejectionReasonsData, setRejectionReasonsData] = useState([]);
  const [sourcePerformanceData, setSourcePerformanceData] = useState([]);
  const [clientMessagesData, setClientMessagesData] = useState([]);
  const [weeklyActivityData, setWeeklyActivityData] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);

  const handleRelancerIA = (row) => {
    openMecalAgent(
      `Relance ma candidature en statut « ${row.status} » pour le poste « ${row.post} » chez ${row.org} (source ${row.src}, postulé le ${row.date}). ` +
        `Propose un email de relance professionnel en français, un plan de suivi sur 2 semaines et des actions concrètes pour M-ECAL en logistique RDC.`
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [analyticsRes, appsRes, oppsRes, logsRes, gmailStatusRes] = await Promise.allSettled([
          api.get('/api/analytics'),
          api.get('/api/applications'),
          api.get('/api/opportunities', { params: { limit: 500 } }),
          api.get('/api/agent/logs'),
          api.get('/api/gmail/status')
        ]);

        const analytics = analyticsRes.status === 'fulfilled' ? analyticsRes.value.data : {};
        const applications = appsRes.status === 'fulfilled' ? appsRes.value.data || [] : [];
        const opportunities =
          oppsRes.status === 'fulfilled'
            ? oppsRes.value.data?.data || oppsRes.value.data || []
            : [];
        const agentLogs =
          logsRes.status === 'fulfilled'
            ? logsRes.value.data || []
            : analytics.logs || [];

        let messages = [];
        const gmailConnected =
          gmailStatusRes.status === 'fulfilled' && gmailStatusRes.value.data?.connected;
        if (gmailConnected) {
          try {
            const { data } = await api.get('/api/gmail/messages', { params: { maxResults: 100 } });
            messages = data.messages || [];
          } catch {
            messages = [];
          }
        }

        const logs = agentLogs.length ? agentLogs : analytics.logs || [];

        setKpis(buildKpis({ opportunities, applications, messages, logs }));
        setJobsFoundData(buildJobsFoundData(logs));
        setApplicationStatusData(
          buildApplicationStatusData(applications).length
            ? buildApplicationStatusData(applications)
            : [{ name: 'Aucune', value: 1, color: '#94a3b8' }]
        );
        setRejectionReasonsData(
          buildRejectionReasonsData(logs).length
            ? buildRejectionReasonsData(logs)
            : [{ reason: 'Aucun rejet', count: 0 }]
        );
        setSourcePerformanceData(
          buildSourcePerformanceData(analytics.bySource || [], logs).length
            ? buildSourcePerformanceData(analytics.bySource || [], logs)
            : [{ source: '—', found: 0, quality: 0 }]
        );
        setClientMessagesData(buildClientMessagesData(messages));
        setWeeklyActivityData(buildWeeklyActivityData(logs, applications, messages));
        setPendingRows(buildPendingApplications(applications));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-1 dark:bg-slate-950 md:p-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">📊 {t('pages.analytics.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('pages.analytics.subtitle')}</p>
        {loading ? (
          <p className="mt-2 text-xs text-purple-600">{t('common.loading')}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(kpis.length ? kpis : buildKpis({})).map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{kpi.icon}</span>
              <span className="text-xs text-gray-400">{kpi.sub}</span>
            </div>
            <p className="mt-2 text-3xl font-bold text-gray-800 dark:text-white">{kpi.value}</p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">
            📈 Offres collectées vs sauvegardées
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={jobsFoundData.length ? jobsFoundData : [{ date: '—', found: 0, saved: 0 }]}>
              <defs>
                <linearGradient id="colorFound" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSaved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="found" name="Trouvées" stroke="#6366f1" fill="url(#colorFound)" />
              <Area type="monotone" dataKey="saved" name="Sauvegardées" stroke="#10b981" fill="url(#colorSaved)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">📬 Statut des candidatures</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={220}>
              <PieChart>
                <Pie
                  data={applicationStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {applicationStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {applicationStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600 dark:text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">⚠️ Raisons de rejet des offres</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rejectionReasonsData.length ? rejectionReasonsData : EMPTY_CHART} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="reason" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" name="Offres rejetées" radius={[0, 4, 4, 0]}>
                {rejectionReasonsData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">🌐 Performance par source</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sourcePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="source" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="found" name="Offres trouvées" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="quality" name="Score qualité %" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">✉️ Messages clients par mois</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={clientMessagesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="reçus" name="Reçus" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="traités" name="Traités" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              <Line
                type="monotone"
                dataKey="enAttente"
                name="En attente"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">📅 Activité hebdomadaire</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyActivityData.length ? weeklyActivityData : EMPTY_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="collectes" name="Collectes" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="candidatures" name="Candidatures" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="messages" name="Messages" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-4 font-semibold text-gray-700 dark:text-slate-200">
          ⏳ Candidatures en attente de réponse
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['Poste', 'Organisation', 'Source', 'Date postulé', 'Statut', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {pendingRows.length ? (
                pendingRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-3 font-medium text-gray-800 dark:text-white">{row.post}</td>
                    <td className="px-3 py-3 text-gray-600 dark:text-slate-300">{row.org}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {row.src}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{row.date}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          row.color === 'yellow'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => handleRelancerIA(row)}
                        className="text-xs text-purple-600 hover:underline dark:text-purple-400"
                      >
                        🤖 Relancer IA
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                    Aucune candidature en attente pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
