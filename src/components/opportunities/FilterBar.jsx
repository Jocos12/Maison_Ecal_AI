import {
  ArrowUpDown,
  BarChart3,
  Boxes,
  Car,
  Check,
  Database,
  Flag,
  GraduationCap,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  Users,
  Warehouse,
  X
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import Dropdown from '../ui/Dropdown.jsx';

const CATEGORIES = [
  { key: '', icon: LayoutGrid, tone: 'bg-slate-100 text-slate-600' },
  { key: 'formation', icon: GraduationCap, tone: 'bg-emerald-100 text-emerald-700' },
  { key: 'formation_chauffeurs', icon: Car, tone: 'bg-lime-100 text-lime-700' },
  { key: 'consultance', icon: Users, tone: 'bg-blue-100 text-blue-700' },
  { key: 'inventaire_actifs', icon: Boxes, tone: 'bg-orange-100 text-orange-700' },
  { key: 'inventaire_general', icon: Warehouse, tone: 'bg-yellow-100 text-yellow-700' },
  { key: 'etude_marche', icon: BarChart3, tone: 'bg-violet-100 text-violet-700' }
];
const cities = ['Kinshasa', 'Goma', 'Bukavu', 'Lubumbashi', 'Kalemie', 'RDC'];

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#24478a] focus:outline-none focus:ring-4 focus:ring-[#24478a]/10 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

function Field({ label, children, as: Tag = 'label' }) {
  return (
    <Tag className="block min-w-0">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </Tag>
  );
}

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
  onViewMode,
  hasFilters = false,
  onReset
}) {
  const { t } = useI18n();

  const sourceOptions = [
    { value: '', label: t('opportunities.filters.allSources') },
    ...sources
      .filter((s) => s.scraperKey)
      .map((s) => ({ value: (s.scraperKey || '').replace(/Veille$/i, ''), label: s.name }))
  ];
  const cityOptions = [{ value: '', label: t('opportunities.filters.allCities') }, ...cities.map((c) => ({ value: c, label: c }))];
  const statusOptions = [
    { value: '', label: t('opportunities.filters.statusActive'), dot: 'bg-slate-400' },
    { value: 'new', label: t('opportunities.filters.statusNew'), dot: 'bg-[#24478a]' },
    { value: 'urgent', label: t('opportunities.filters.statusUrgent'), dot: 'bg-red-500' }
  ];
  const sortOptions = [
    { value: 'relevance', label: t('opportunities.sortPriority') },
    { value: 'recent', label: t('opportunities.sortRecent') },
    { value: 'deadline', label: t('opportunities.sortDeadline') },
    { value: 'platform', label: t('opportunities.sortPlatform') }
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7"
        role="radiogroup"
        aria-label={t('opportunities.filters.category')}
      >
        {CATEGORIES.map(({ key, icon: Icon, tone }) => {
          const active = key === (category || '');
          return (
            <button
              key={key || 'all'}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCategory(key)}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border px-2 pb-3 pt-3.5 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 ${
                active
                  ? 'border-[#24478a] bg-[#24478a] text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#24478a]/50 hover:shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl transition ${
                  active ? 'bg-white/15 text-white' : tone
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-[12.5px] font-semibold leading-tight">
                {key ? t(`opportunities.${key}`) : t('opportunities.all')}
              </span>
              {active ? (
                <span className="absolute right-2 top-2 grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[#24478a]">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('opportunities.filters.searchPlaceholder')}
            aria-label={t('opportunities.search')}
            className={`${fieldClass} py-3 pl-10 pr-10`}
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearch('')}
              aria-label={t('search.clear')}
              className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div
          className="grid flex-none grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-600 dark:bg-slate-800"
          role="group"
          aria-label="Affichage"
        >
          {[
            ['cards', LayoutGrid, t('opportunities.filters.viewCards')],
            ['list', List, t('opportunities.filters.viewList')]
          ].map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24478a]/30 ${
                viewMode === mode
                  ? 'bg-[#24478a] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#24478a] dark:text-slate-300 dark:hover:text-blue-300'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(13.5rem,1fr))] gap-3">
        <Field label={t('opportunities.filters.source')} as="div">
          <Dropdown
            label={t('opportunities.filters.source')}
            icon={Database}
            value={source}
            options={sourceOptions}
            onChange={onSource}
          />
        </Field>
        <Field label={t('opportunities.filters.city')} as="div">
          <Dropdown
            label={t('opportunities.filters.city')}
            icon={MapPin}
            value={ville}
            options={cityOptions}
            onChange={(v) => onVille?.(v)}
          />
        </Field>
        <Field label={t('opportunities.filters.place')}>
          <input
            value={country}
            onChange={(e) => onCountry(e.target.value)}
            placeholder={t('opportunities.filters.placePlaceholder')}
            className={`${fieldClass} h-[46px] text-[13px]`}
          />
        </Field>
        <Field label={t('opportunities.filters.status')} as="div">
          <Dropdown
            label={t('opportunities.filters.status')}
            icon={Flag}
            value={status}
            options={statusOptions}
            onChange={onStatus}
          />
        </Field>
        <Field label={t('opportunities.filters.sort')} as="div">
          <Dropdown
            label={t('opportunities.filters.sort')}
            icon={ArrowUpDown}
            value={sort}
            defaultValue="relevance"
            options={sortOptions}
            onChange={onSort}
          />
        </Field>
      </div>

      {hasFilters ? (
        <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#24478a] transition hover:bg-[#e3ebf9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24478a]/30 dark:text-blue-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t('opportunities.filters.reset')}
          </button>
        </div>
      ) : null}
    </section>
  );
}
