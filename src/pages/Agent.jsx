import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bot, Loader2, Play, RefreshCw, Search } from 'lucide-react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import AgentSkipDetailPanel from '../components/agent/AgentSkipDetailPanel.jsx';

const SKIP_REASON_LABELS = {
  not_mecal_service: 'Hors services M-ECAL (6 catégories logistiques)',
  ai_rejected: 'Rejeté par l\'IA (hors périmètre ou emploi)',
  non_logistics: 'Hors logistique (routes, EIES, achats matériel…)',
  job_posting: 'Offre d\'emploi (exclue de la veille)',
  ai_low_score: 'Score de pertinence IA trop faible',
  hors_rdc: 'Hors République Démocratique du Congo',
  needs_ai_no_keys: 'Analyse IA requise mais aucune clé configurée',
  no_category: 'Catégorie M-ECAL non identifiée',
  duplicate: 'Doublon déjà en base',
  missing_fields: 'Titre ou lien source manquant'
};

function formatSkipReasons(skipReasons) {
  if (!skipReasons) return [];
  const entries = skipReasons instanceof Map ? [...skipReasons.entries()] : Object.entries(skipReasons);
  return entries
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      key,
      count,
      label: SKIP_REASON_LABELS[key] || key
    }));
}

export default function Agent() {
  const { t } = useI18n();
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const [status, setStatus] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAI, setTestingAI] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState('search');
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [detailContext, setDetailContext] = useState(null);

  const openDetailPanel = (log, reasonKey, label, count) => {
    setDetailContext({
      logId: log._id,
      reasonKey,
      categoryLabel: label,
      count,
      logDate: new Date(log.startedAt).toLocaleString('fr-FR')
    });
    setShowDetailPanel(true);
  };

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
      if (data.saved > 0) {
        toast.success(`${data.saved} nouvelle(s) opportunité(s) sauvegardée(s)`);
      } else {
        const reasons = formatSkipReasons(data.skipReasons);
        const top = reasons[0];
        toast(
          `Collecte terminée : 0 sauvegardée — ${data.skipped || 0} filtrée(s)${
            top ? ` (principalement : ${top.label})` : ''
          }`,
          { icon: 'ℹ️', duration: 6000 }
        );
      }
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

  const reclassify = async (useAI = false) => {
    setReclassifying(true);
    try {
      const { data } = await api.post('/api/opportunities/reclassify', { useAI });
      toast.success(
        `Reclassification: ${data.updated} mises à jour, ${data.archived} archivées, ${data.aVerifier} à vérifier`
      );
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reclassification impossible');
    } finally {
      setReclassifying(false);
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
              <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('pages.agent.title')}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.agent.subtitle')}</p>
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
            Inclus (6 services logistiques uniquement) : formations procédures logistiques, formation chauffeurs, études de marché, inventaire d&apos;actifs, inventaire général, consultance/assistance logistique.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Exclus : emplois, travaux routiers, EIES/environnement, audits techniques, achats de véhicules/matériel, assainissement, <strong>tout pays hors RDC</strong> (Congo-Brazzaville, Kenya, Ouganda, etc.).
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Villes cibles : Bukavu, Goma, Kinshasa, Kalemie, Lubumbashi (+ badge RDC pour marchés nationaux).
          </p>
          {isAdmin && (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
              <button
                type="button"
                onClick={() => reclassify(false)}
                disabled={reclassifying}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {reclassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Recalculer les opportunités existantes
              </button>
              <button
                type="button"
                onClick={() => reclassify(true)}
                disabled={reclassifying}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-500 disabled:opacity-60"
              >
                {reclassifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Recalculer avec IA
              </button>
            </div>
          )}
        </div>
      )}

      {(tab === 'history' || tab === 'search') && <div className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold text-slate-950 dark:text-white">Logs des dernières collectes</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            « Skipped » = opportunités collectées mais filtrées (hors périmètre M-ECAL, emplois, hors RDC, score IA faible…). Seules les opportunités confirmées en RDC sont enregistrées.
          </p>
        <div className="mt-4 space-y-3">
          {logs.map((log) => {
            const reasons = formatSkipReasons(log.skipReasons);
            return (
              <div key={log._id} className="rounded-xl bg-slate-100 p-4 text-sm dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <b className={log.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                    {log.status}
                  </b>
                  <span className="text-slate-500">·</span>
                  <span>{new Date(log.startedAt).toLocaleString()}</span>
                  <span className="text-slate-500">·</span>
                  <span>Raw <b>{log.totalRaw ?? 0}</b></span>
                  <span className="text-slate-500">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Saved <b>{log.saved ?? 0}</b></span>
                  <span className="text-slate-500">·</span>
                  <span className="text-amber-600 dark:text-amber-400">Skipped <b>{log.skipped ?? 0}</b></span>
                </div>
                {reasons.length > 0 && (
                  <ul className="mt-3 space-y-0 border-t border-slate-200 pt-3 dark:border-slate-700">
                    {reasons.map(({ key, count, label }) => (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-xs text-slate-600 last:border-0 dark:border-slate-800 dark:text-slate-400"
                      >
                        <span>{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">{count}</span>
                          {count > 0 && (
                            <button
                              type="button"
                              onClick={() => openDetailPanel(log, key, label, count)}
                              className="inline-flex items-center gap-1 rounded-full border border-blue-300 px-3 py-1 text-xs text-blue-600 transition hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/40"
                            >
                              <Search className="h-3 w-3" />
                              Détails
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {log.saved === 0 && log.skipped > 0 && reasons.length === 0 && (
                  <p className="mt-2 text-xs text-slate-500 italic">
                    Détail des filtres non enregistré pour cette collecte (relancez une recherche pour voir le détail).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>}

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
