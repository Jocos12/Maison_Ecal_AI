import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOpportunities } from '../hooks/useOpportunities.js';
import { useI18n } from '../context/I18nContext.jsx';
import FilterBar from '../components/opportunities/FilterBar.jsx';
import OpportunityList from '../components/opportunities/OpportunityList.jsx';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';
import { api } from '../api/client.js';

export default function Opportunities() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [source, setSource] = useState('');
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [sources, setSources] = useState([]);
  const [selectedCities, setSelectedCities] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mecal_city_filters') || '[]');
    } catch {
      return [];
    }
  });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      ...(category ? { category } : {}),
      ...(source ? { platform: source } : {}),
      ...(selectedCities.length ? { ville: selectedCities.join(',') } : {}),
      ...(country ? { country } : {}),
      ...(status === 'new' ? { isNew: true } : {}),
      ...(status === 'urgent' ? { isUrgent: true } : {}),
      ...(search ? { search } : {}),
      sort: sort === 'recent' ? undefined : sort
    }),
    [page, category, source, selectedCities, country, status, search, sort]
  );

  const { items, total, pages, loading, reload } = useOpportunities(params);

  useEffect(() => {
    api.get('/api/sources').then(({ data }) => setSources(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onCities = (event) => {
      setSelectedCities(event.detail || []);
      setPage(1);
    };
    window.addEventListener('mecal:city-filters', onCities);
    return () => window.removeEventListener('mecal:city-filters', onCities);
  }, []);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/opportunities/${id}`);
        setModal(data);
      } catch {
        setSearchParams({});
      }
    })();
  }, [searchParams, setSearchParams]);

  const onOpen = (opp) => {
    setModal(opp);
    setSearchParams({ id: opp._id });
  };

  const onClose = () => {
    setModal(null);
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('opportunities.title')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Services logistiques uniquement: formations, inventaires, études de marché, consultance et assistance.
        </p>
      </div>
      <FilterBar
        category={category}
        onCategory={(c) => {
          setCategory(c);
          setPage(1);
        }}
        search={search}
        onSearch={(s) => {
          setSearch(s);
          setPage(1);
        }}
        sort={sort}
        onSort={(s) => {
          setSort(s);
          setPage(1);
        }}
        source={source}
        sources={sources}
        onSource={(s) => {
          setSource(s);
          setPage(1);
        }}
        country={country}
        onCountry={(s) => {
          setCountry(s);
          setPage(1);
        }}
        status={status}
        onStatus={(s) => {
          setStatus(s);
          setPage(1);
        }}
        viewMode={viewMode}
        onViewMode={setViewMode}
      />
      {loading ? <p className="text-slate-500">{t('common.loading')}</p> : <OpportunityList items={items} onOpen={onOpen} viewMode={viewMode} />}
      {pages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-slate-600 px-3 py-1 text-sm disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-slate-400 self-center">
            {page} / {pages} ({total})
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-slate-600 px-3 py-1 text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
      {modal && (
        <OpportunityModal opp={modal} onClose={onClose} onCreated={reload} />
      )}
    </div>
  );
}
