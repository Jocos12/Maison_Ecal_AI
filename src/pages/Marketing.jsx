import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Send,
  SendHorizonal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import {
  buildMarketingStats,
  buildWeeklyChart,
  EMAIL_TEMPLATES,
  getRecentApplications,
  getStatusIconType,
  isApplied,
  PRIORITY_STYLES
} from '../utils/marketingData.js';

function StatCard({ label, value, sub, accent = 'blue' }) {
  const accents = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-200',
    green: 'from-emerald-500/10 to-emerald-600/5 border-emerald-200',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-200',
    violet: 'from-violet-500/10 to-violet-600/5 border-violet-200'
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${accents[accent] || accents.blue}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-sm text-slate-500">{sub}</p> : null}
    </div>
  );
}

function StatusIcon({ type }) {
  if (type === 'check') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  }
  if (type === 'send') {
    return <SendHorizonal className="h-4 w-4 shrink-0 text-blue-500" />;
  }
  return <Clock className="h-4 w-4 shrink-0 text-amber-500" />;
}

function TemplateModal({ open, title, content, loading, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-xl dark:border-blue-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white">{title || 'Contenu généré'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              Génération en cours…
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Marketing() {
  const { t } = useI18n();
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [insights, setInsights] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', content: '', loading: false });
  const chatEndRef = useRef(null);
  const autoRan = useRef(false);

  const appliedApps = useMemo(
    () => applications.filter((a) => isApplied(a.status)),
    [applications]
  );

  const stats = useMemo(() => buildMarketingStats(applications), [applications]);
  const chartData = useMemo(() => buildWeeklyChart(applications), [applications]);
  const recentApps = useMemo(() => getRecentApplications(applications, 4), [applications]);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const { data } = await api.get('/api/applications');
      setApplications(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Impossible de charger les candidatures');
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!appliedApps.length) {
      toast.error('Aucune candidature à analyser');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisDone(false);
    try {
      const { data } = await api.post('/api/ai/marketing/analyze');
      setInsights(Array.isArray(data?.conseils) ? data.conseils : []);
      setAnalysisDone(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Analyse IA indisponible');
    } finally {
      setIsAnalyzing(false);
    }
  }, [appliedApps.length]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (!loadingApps && appliedApps.length > 0 && !autoRan.current) {
      autoRan.current = true;
      handleAnalyze();
    }
  }, [loadingApps, appliedApps.length, handleAnalyze]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleAskAI = async () => {
    const q = question.trim();
    if (!q || chatLoading) return;

    const userMsg = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setChatLoading(true);

    try {
      const { data } = await api.post('/api/ai/marketing/chat', {
        question: q,
        history: messages
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer || 'Réponse indisponible.' }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e.response?.data?.message || 'Erreur lors de la requête IA.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerate = async ({ prompt, templateKey, title }) => {
    setGeneratingKey(templateKey || prompt?.slice(0, 20));
    setModal({ open: true, title: title || 'Contenu généré', content: '', loading: true });
    try {
      const { data } = await api.post('/api/ai/marketing/generate', { prompt, templateKey });
      setModal({
        open: true,
        title: data.title || title || 'Contenu généré',
        content: data.content || '',
        loading: false
      });
    } catch (e) {
      setModal({
        open: true,
        title: title || 'Erreur',
        content: e.response?.data?.message || 'Génération impossible.',
        loading: false
      });
    } finally {
      setGeneratingKey(null);
    }
  };

  const scoreTrend =
    stats.scoreEvolution > 0 ? (
      <span className="inline-flex items-center gap-1 text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />+{stats.scoreEvolution} pts vs mois préc.
      </span>
    ) : stats.scoreEvolution < 0 ? (
      <span className="inline-flex items-center gap-1 text-red-500">
        <TrendingDown className="h-3.5 w-3.5" />
        {stats.scoreEvolution} pts vs mois préc.
      </span>
    ) : (
      'Stable vs mois précédent'
    );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('pages.marketing.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.marketing.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={isAnalyzing || loadingApps}
          onClick={handleAnalyze}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
            analysisDone && !isAnalyzing
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours…
            </>
          ) : analysisDone ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Analyse à jour
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              Analyser avec l&apos;IA
            </>
          )}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offres postulées" value={stats.total} sub="Total candidatures actives" accent="blue" />
        <StatCard
          label="Réponses reçues"
          value={stats.answered}
          sub={`Taux de réponse : ${stats.answerRate} %`}
          accent="green"
        />
        <StatCard
          label="En attente"
          value={stats.pending}
          sub={`Délai moyen : ${stats.avgPendingDays} j`}
          accent="amber"
        />
        <StatCard
          label="Score matching moyen"
          value={stats.avgScore ? `${stats.avgScore} %` : '—'}
          sub={scoreTrend}
          accent="violet"
        />
      </div>

      {/* Graphique */}
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold text-slate-900 dark:text-white">
          Candidatures vs réponses — 6 dernières semaines
        </h2>
        <p className="mt-1 text-sm text-slate-500">Bleu = soumises · Vert = répondues</p>
        <div className="mt-4 h-72 w-full">
          {loadingApps ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="soumises" name="Soumises" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="repondues" name="Répondues" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* Section IA */}
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-slate-900 dark:text-white">
              Analyse IA — Conseils marketing personnalisés
            </h2>
            <p className="text-sm text-slate-500">Recommandations basées sur vos candidatures réelles</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            Basé sur vos {stats.total} candidature{stats.total !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {isAnalyzing && !insights.length ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-200 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              L&apos;IA analyse vos candidatures…
            </div>
          ) : null}

          {!isAnalyzing && !insights.length && stats.total === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-500">
              Ajoutez des candidatures pour recevoir des conseils marketing personnalisés.
            </p>
          ) : null}

          {insights.map((item, idx) => {
            const prio = PRIORITY_STYLES[item.priorite] || PRIORITY_STYLES.moyenne;
            const genKey = `insight-${idx}`;
            return (
              <article
                key={genKey}
                className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50 ${prio.border}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <h3 className="font-bold text-slate-900 dark:text-white">{item.titre}</h3>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${prio.badge}`}>
                    {prio.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.conseil}</p>
                <button
                  type="button"
                  disabled={generatingKey === genKey}
                  onClick={() =>
                    handleGenerate({
                      prompt: item.prompt,
                      title: item.action || item.titre
                    })
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {generatingKey === genKey ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  {item.action || 'Générer contenu'} ↗
                </button>
              </article>
            );
          })}
        </div>

        {/* Chat IA */}
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Posez une question à l&apos;assistant marketing
          </p>
          <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-lg bg-white/80 p-3 dark:bg-slate-900/60">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-400">
                Ex. : « Quelle source performe le mieux ? » ou « Comment améliorer mon taux de réponse ? »
              </p>
            ) : null}
            {messages.map((msg, i) => (
              <div
                key={`msg-${i}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'ml-auto bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                    : 'mr-auto bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100'
                }`}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading ? (
              <div className="mr-auto inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-sm text-blue-800">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Réflexion…
              </div>
            ) : null}
            <div ref={chatEndRef} />
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
              placeholder="Posez une question sur votre stratégie…"
              className="flex-1 rounded-xl border-2 border-blue-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-blue-600 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAskAI}
              disabled={chatLoading || !question.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </div>
      </section>

      {/* Bas : templates + candidatures récentes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass-panel rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 dark:text-white">Templates emails</h2>
          <p className="mt-1 text-sm text-slate-500">Cliquez pour générer un modèle complet avec l&apos;IA</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {EMAIL_TEMPLATES.map((tpl) => (
              <button
                key={tpl.key}
                type="button"
                disabled={generatingKey === tpl.key}
                onClick={() => handleGenerate({ templateKey: tpl.key, title: tpl.label })}
                className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
              >
                <p className="font-semibold text-slate-900 dark:text-white">{tpl.label}</p>
                <p className="mt-1 text-xs text-slate-500">{tpl.desc}</p>
                {generatingKey === tpl.key ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Génération…
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <h2 className="font-bold text-slate-900 dark:text-white">Candidatures récentes</h2>
          <p className="mt-1 text-sm text-slate-500">Les 4 dernières candidatures soumises</p>
          <ul className="mt-4 space-y-3">
            {recentApps.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                Aucune candidature récente
              </li>
            ) : (
              recentApps.map((app) => (
                <li
                  key={app.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50"
                >
                  <StatusIcon type={getStatusIconType(app.status)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{app.title}</p>
                    <p className="text-xs text-slate-500">
                      {app.source}
                      {app.score ? ` · Score ${app.score} %` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {app.statusLabel}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <TemplateModal
        open={modal.open}
        title={modal.title}
        content={modal.content}
        loading={modal.loading}
        onClose={() => setModal({ open: false, title: '', content: '', loading: false })}
      />
    </div>
  );
}
