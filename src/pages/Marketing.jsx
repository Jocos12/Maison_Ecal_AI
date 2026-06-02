import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';

const templates = [
  'Présentation M-ECAL (cold outreach)',
  'Suivi après candidature (J+7)',
  'Relance sans réponse (J+14)',
  'Proposition de collaboration',
  'Newsletter mensuelle'
];

export default function Marketing() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const stats = await api.get('/api/stats').then((r) => r.data).catch(() => ({}));
      const { data } = await api.post('/api/ai/marketing-suggestions', { stats });
      setSuggestions(data.suggestions || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Suggestions indisponibles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Marketing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Visibilité B2B, templates et prospection M-ECAL.</p>
        </div>
        <button disabled={loading} onClick={generate} className="rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-60">
          {loading ? 'Génération...' : 'Générer suggestions IA'}
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {suggestions.map((s, i) => (
          <div key={i} className="glass-panel rounded-2xl p-5">
            <div className="flex gap-2 text-xs font-bold">
              <span className="rounded-full bg-blue-500/15 px-2 py-1 text-blue-600">Priorité {s.priorité || s.priorite}</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-emerald-600">Impact {s.impact}</span>
            </div>
            <h2 className="mt-3 font-bold">{s.suggestion}</h2>
            <p className="mt-2 text-sm text-slate-500">{s.exemple_concret}</p>
          </div>
        ))}
      </div>
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold">Templates emails marketing</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t} className="rounded-xl bg-white p-4 text-sm font-semibold dark:bg-slate-900">{t}</div>
          ))}
        </div>
      </section>
      <section className="glass-panel rounded-2xl p-5">
        <h2 className="font-bold">Prospection</h2>
        <p className="mt-2 text-sm text-slate-500">Import CSV, personnalisation IA, envoi programmé et suivi ouvertures/réponses sont prêts côté écran. Les suivis réels nécessitent les webhooks Gmail/analytics d’ouverture.</p>
      </section>
    </div>
  );
}
