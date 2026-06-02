import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Loader2, Play } from 'lucide-react';
import { api } from '../api/client.js';

export default function Agent() {
  const [status, setStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAI, setTestingAI] = useState(false);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState('search');

  const load = async () => {
    const [s, l, ai] = await Promise.all([
      api.get('/api/agent/status'),
      api.get('/api/agent/logs'),
      api.get('/api/ai/status').catch(() => ({ data: null }))
    ]);
    setStatus(s.data);
    setLogs(l.data);
    setAiStatus(ai.data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data } = await api.post('/api/opportunities/scrape');
      toast.success(`${data.saved} nouvelles opportunités sauvegardées`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Recherche impossible');
    } finally {
      setRunning(false);
    }
  };

  const testAI = async () => {
    setTestingAI(true);
    try {
      const { data } = await api.post('/api/ai/test');
      toast.success(`IA OK via ${data.provider}: ${data.response}`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test IA impossible');
    } finally {
      setTestingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          ['search', '🔍 Recherche'],
          ['results', '📊 Résultats'],
          ['config', '⚙️ Configuration'],
          ['history', '📜 Historique']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              tab === id ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white">
              <Bot className="h-7 w-7" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Agent IA</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Statut: {status?.active ? 'collecte en cours' : 'veille active'} · Sources actives: {status?.activeSources ?? 0}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Lancer une recherche maintenant
          </button>
        </div>
        {running && <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full w-2/3 animate-pulse rounded-full bg-blue-500" /></div>}
      </div>

      {aiStatus && (
        <div className="ai-status-widget glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">Providers IA</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{aiStatus.message}</p>
            </div>
            <button
              type="button"
              onClick={testAI}
              disabled={testingAI}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {testingAI ? 'Test...' : 'Tester les IA'}
            </button>
          </div>
          <div className="providers-grid">
            {[
              ['claude', 'Claude', '🟣'],
              ['groq', 'Groq', '⚡'],
              ['gemini', 'Gemini', '🔵']
            ].map(([id, label, icon]) => {
              const provider = aiStatus.providers?.[id] || {};
              return (
                <div key={id} className={`provider-card ${provider.ready ? 'ok' : 'fail'}`}>
                  <span className="provider-icon">{icon}</span>
                  <span className="provider-name">{label}</span>
                  <span className="provider-status">
                    {provider.ready ? 'Actif' : provider.configured ? 'Cooldown' : 'Non configuré'}
                  </span>
                  {provider.failCount > 0 && <small>{provider.failCount} échec(s)</small>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="font-bold text-slate-950 dark:text-white">Résultats scorés</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Les opportunités acceptées sont visibles dans “Opportunités” avec score IA, catégorie et ville confirmée.
          </p>
        </div>
      )}

      {tab === 'config' && (
        <div className="glass-panel rounded-2xl p-5">
          <h2 className="font-bold text-slate-950 dark:text-white">Configuration métier</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Inclus: formations logistiques, conduite, études de marché, inventaires, consultance et assistance. Exclus: tous les postes, emplois, recrutements et vacancies.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Villes: Bukavu, Goma, Kinshasa, Kalemie, Lubumbashi.
          </p>
        </div>
      )}

      {(tab === 'history' || tab === 'search') && <div className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold text-slate-950 dark:text-white">Logs des dernières collectes</h2>
        <div className="mt-4 space-y-2">
          {logs.map((log) => (
            <div key={log._id} className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">
              <b>{log.status}</b> · {new Date(log.startedAt).toLocaleString()} · Raw {log.totalRaw} · Saved {log.saved} · Skipped {log.skipped}
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
