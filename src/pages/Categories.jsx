import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';

const categories = [
  ['formation', 'Formations procédures logistiques'],
  ['formation_chauffeurs', 'Formation chauffeurs / conduite véhicules'],
  ['etude_marche', 'Étude de marchés'],
  ['inventaire_actifs', "Inventaire d'Actifs d'une Organisation"],
  ['inventaire_general', "Inventaire général d'une Organisation"],
  ['consultance', 'Consultance, Assistance et Conseils']
];

export default function Categories() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(Object.fromEntries(categories.map(([key]) => [key, true])));
  const [counts, setCounts] = useState({});

  useEffect(() => {
    api.get('/api/analytics').then(({ data }) => {
      setCounts(Object.fromEntries(data.byCategory.map((row) => [row.category, row.count])));
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('pages.categories.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('pages.categories.subtitle')}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {categories.map(([key, label]) => (
          <label key={key} className="glass-panel flex items-center justify-between rounded-2xl p-5">
            <span>
              <span className="font-semibold text-slate-950 dark:text-white">{label}</span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                {counts[key] || counts[key.replace(/_.*/, '')] || 0} opportunités
              </span>
            </span>
            <input
              type="checkbox"
              checked={enabled[key]}
              onChange={(e) => setEnabled((current) => ({ ...current, [key]: e.target.checked }))}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
