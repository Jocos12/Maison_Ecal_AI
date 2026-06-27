import { Search } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

const cats = ['', 'formation', 'formation_chauffeurs', 'consultance', 'inventaire_actifs', 'inventaire_general', 'etude_marche'];
const cities = ['', 'Kinshasa', 'Goma', 'Bukavu', 'Lubumbashi', 'Kalemie', 'RDC'];

export default function FilterBar({
  category,
  onCategory,
  search,
  onSearch,
  sort,
  onSort,
  source,
  onSource,
  sources = [],
  country,
  onCountry,
  ville = '',
  onVille,
  status,
  onStatus,
  viewMode,
  onViewMode
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => onCategory(c)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              (c || '') === (category || '')
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {c ? t(`opportunities.${c}`) : t('opportunities.all')}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('opportunities.search')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <select
          value={source}
          onChange={(e) => onSource(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Toutes sources</option>
          {sources.map((s) => (
            <option key={s.key} value={s.scraperKey || s.key}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={ville}
          onChange={(e) => onVille?.(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Toutes villes RDC</option>
          {cities.filter(Boolean).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          placeholder="Pays / ville"
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="">Actives</option>
          <option value="new">Nouvelles</option>
          <option value="urgent">Clôture proche</option>
        </select>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        >
          <option value="recent">{t('opportunities.sortRecent')}</option>
          <option value="deadline">{t('opportunities.sortDeadline')}</option>
          <option value="relevance">Pertinence</option>
          <option value="platform">{t('opportunities.sortPlatform')}</option>
        </select>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800">
          {['cards', 'list'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewMode(mode)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:text-blue-600 dark:text-slate-300'
              }`}
            >
              {mode === 'cards' ? 'Cartes' : 'Liste'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
