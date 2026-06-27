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
  const [ville, setVille] = useState('');
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
      ...(ville ? { ville } : selectedCities.length ? { ville: selectedCities.join(',') } : {}),
      ...(country ? { country } : {}),
      ...(status === 'new' ? { isNew: true } : {}),
      ...(status === 'urgent' ? { isUrgent: true } : {}),
      ...(search ? { search } : {}),
      sort: sort === 'recent' ? undefined : sort
    }),
    [page, category, source, ville, selectedCities, country, status, search, sort]
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
      <section className="mecal-hero-dashboard relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl md:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <h1 className="mecal-title-shine text-2xl font-bold tracking-tight md:text-3xl">
          {t('opportunities.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100/90">{t('opportunities.subtitle')}</p>
      </section>
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
        ville={ville}
        onVille={(v) => {
          setVille(v);
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
