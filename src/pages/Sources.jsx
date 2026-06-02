import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';

export default function Sources() {
  const [sources, setSources] = useState([]);

  const load = async () => {
    const { data } = await api.get('/api/sources');
    setSources(data);
  };

  useEffect(() => {
    load().catch(() => toast.error('Impossible de charger les sources'));
  }, []);

  const toggle = async (source) => {
    await api.put(`/api/sources/${source._id}`, { enabled: !source.enabled });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Sources de Veille</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Plateformes surveillées pour les services logistiques M-ECAL.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <div key={source._id} className="glass-panel rounded-2xl p-5 transition hover:-translate-y-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">{source.name}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{source.description}</p>
                <a className="mt-2 block text-xs text-blue-500 hover:underline" href={source.url} target="_blank" rel="noreferrer">
                  {source.url}
                </a>
              </div>
              <button
                type="button"
                onClick={() => toggle(source)}
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  source.enabled ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-slate-500/15 text-slate-500'
                }`}
              >
                {source.enabled ? 'Actif' : 'Inactif'}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <span className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                <b>{source.frequencyHours}h</b>
                <br />Fréquence
              </span>
              <span className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                <b>{source.opportunitiesCount}</b>
                <br />Actives
              </span>
              <span className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
                <b>{source.lastStatus}</b>
                <br />Statut
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
