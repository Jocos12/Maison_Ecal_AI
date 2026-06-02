import { useI18n } from '../../context/I18nContext.jsx';

const cats = ['', 'formation', 'formation_chauffeurs', 'consultance', 'inventaire_actifs', 'inventaire_general', 'etude_marche', 'assistance'];

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
  status,
  onStatus,
  viewMode,
  onViewMode
}) {
  const { t } = useI18n();

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c || 'all'}
            type="button"
            onClick={() => onCategory(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition ${
              (c || '') === (category || '')
                ? 'border-blue-500 bg-blue-600/20 text-blue-700 dark:text-blue-200'
                : 'border-slate-300 text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:text-slate-300'
            }`}
          >
            {c ? t(`opportunities.${c}`) : t('opportunities.all')}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('opportunities.search')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <select
          value={source}
          onChange={(e) => onSource(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="">Toutes sources</option>
          {sources.map((s) => (
            <option key={s.key} value={s.scraperKey || s.key}>
              {s.name}
            </option>
          ))}
        </select>
        <input
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          placeholder="Pays / ville"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        />
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="">Actives</option>
          <option value="new">Nouvelles</option>
          <option value="urgent">Clôture proche</option>
        </select>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
        >
          <option value="recent">{t('opportunities.sortRecent')}</option>
          <option value="deadline">{t('opportunities.sortDeadline')}</option>
          <option value="relevance">Pertinence</option>
          <option value="platform">{t('opportunities.sortPlatform')}</option>
        </select>
        <div className="grid grid-cols-2 rounded-lg border border-slate-300 p-1 dark:border-slate-600">
          {['cards', 'list'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewMode(mode)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
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
