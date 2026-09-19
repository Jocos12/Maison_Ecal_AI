import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOpportunities } from '../hooks/useOpportunities.js';
import { useI18n } from '../context/I18nContext.jsx';
import FilterBar from '../components/opportunities/FilterBar.jsx';
import OpportunityList from '../components/opportunities/OpportunityList.jsx';
import OpportunityModal from '../components/opportunities/OpportunityModal.jsx';
import Pagination from '../components/opportunities/Pagination.jsx';
import { Briefcase, ClipboardCheck, Eye, Hourglass, Layers } from 'lucide-react';
import { api } from '../api/client.js';
import toast from 'react-hot-toast';
import { getViewedOpportunityIds, markOpportunityViewed } from '../utils/opportunityUrgency.js';

export default function Opportunities() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('relevance');
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
  const [appliedIds, setAppliedIds] = useState(() => new Set());
  const [viewedCount, setViewedCount] = useState(() => getViewedOpportunityIds().length);

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
      sort
    }),
    [page, category, source, ville, selectedCities, country, status, search, sort]
  );

  const { items, total, pages, loading, reload } = useOpportunities(params);

  useEffect(() => {
    api.get('/api/sources').then(({ data }) => setSources(Array.isArray(data) ? data : data.sources || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .get('/api/applications')
      .then(({ data }) => {
        const ids = new Set(
          (data || []).map((a) => String(a.opportunity?._id || a.opportunity)).filter(Boolean)
        );
        setAppliedIds(ids);
      })
      .catch(() => {});
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

  // Voice / deep-link filters (additive — does not change default empty behavior)
  useEffect(() => {
    const q = searchParams.get('search');
    const cat = searchParams.get('category');
    const v = searchParams.get('ville');
    const c = searchParams.get('country');
    const st = searchParams.get('status');
    const fit = searchParams.get('fit');
    if (q != null) setSearch(q);
    if (cat != null) setCategory(cat);
    if (v != null) setVille(v);
    if (c != null) setCountry(c);
    if (st != null) setStatus(st);
    if (fit === 'mecal' && (q == null || q === '')) {
      setSearch((prev) => prev || 'logistique');
    }
    if (q != null || cat != null || v != null || c != null || st != null || fit != null) {
      setPage(1);
    }
  }, [searchParams]);

  const onOpen = (opp) => {
    markOpportunityViewed(opp._id);
    setViewedCount(getViewedOpportunityIds().length);
    setModal(opp);
    setSearchParams({ id: opp._id });
  };

  const onQuickApply = async (opp) => {
    try {
      const { data, status } = await api.post('/api/applications', {
        opportunity: opp._id,
        status: 'draft',
        notes: `Candidature brouillon : ${opp.title}`
      });
      setAppliedIds((prev) => new Set([...prev, String(opp._id)]));
      toast.success(
        data?.alreadyExisted || status === 200
          ? t('opportunities.applicationExists')
          : t('opportunities.applicationCreated')
      );
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.applicationError'));
    }
  };

  const untreated = Math.max(0, total - appliedIds.size);

  const hasFilters = Boolean(category || search || source || country || ville || status);
  const resetFilters = () => {
    setCategory('');
    setSearch('');
    setSource('');
    setCountry('');
    setVille('');
    setStatus('');
    setPage(1);
    if (searchParams.get('search') || searchParams.get('category') || searchParams.get('status') || searchParams.get('ville') || searchParams.get('country') || searchParams.get('fit')) {
      setSearchParams({});
    }
  };
  const goToPage = (n) => {
    setPage(n);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onClose = () => {
    setModal(null);
    setSearchParams({});
  };

  const kpis = [
    { key: 'active', value: total, icon: Layers, tile: 'bg-emerald-100 text-emerald-700' },
    { key: 'applied', value: appliedIds.size, icon: ClipboardCheck, tile: 'bg-violet-100 text-violet-700' },
    { key: 'viewed', value: viewedCount, icon: Eye, tile: 'bg-sky-100 text-sky-700' },
    { key: 'untreated', value: untreated, icon: Hourglass, tile: 'bg-amber-100 text-amber-700' }
  ];

  return (
    <div className="page-shell space-y-6">
      <section>
        <div className="rounded-3xl bg-[#24478a] px-6 pb-16 pt-7 text-white shadow-lg md:px-8">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
              <Briefcase className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t('opportunities.title')}</h1>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-blue-100 md:text-[15px]">
                {t('opportunities.subtitle')}
              </p>
            </div>
          </div>
        </div>
        <dl className="relative -mt-10 mx-3 grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 md:mx-6 md:grid-cols-4 md:divide-y-0 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-700">
          {kpis.map(({ key, value, icon: Icon, tile }) => (
            <div key={key} className="flex items-center gap-3.5 px-4 py-4 md:px-6">
              <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${tile}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <dd className="text-2xl font-bold leading-none tabular-nums text-slate-900 dark:text-white">{value}</dd>
                <dt className="mt-1 text-xs font-semibold leading-tight text-slate-500 dark:text-slate-400">
                  {t(`opportunities.kpi.${key}`)}
                </dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <FilterBar
        category={category}
        onCategory={(c) => {
          setCategory(c);
          setPage(1);
        }}
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        sort={sort}
        onSort={(v) => {
          setSort(v);
          setPage(1);
        }}
        source={source}
        sources={sources}
        onSource={(v) => {
          setSource(v);
          setPage(1);
        }}
        country={country}
        onCountry={(v) => {
          setCountry(v);
          setPage(1);
        }}
        ville={ville}
        onVille={(v) => {
          setVille(v);
          setPage(1);
        }}
        status={status}
        onStatus={(v) => {
          setStatus(v);
          setPage(1);
        }}
        viewMode={viewMode}
        onViewMode={setViewMode}
        hasFilters={hasFilters}
        onReset={resetFilters}
      />

      {!loading && total > 0 ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{t('opportunities.resultsCount', { count: total })}</p>
          {pages > 1 ? (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('opportunities.pageOf', { page, pages })}</p>
          ) : null}
        </div>
      ) : null}

      <OpportunityList
        items={items}
        onOpen={onOpen}
        onQuickApply={onQuickApply}
        appliedIds={appliedIds}
        viewMode={viewMode}
        loading={loading}
        hasFilters={hasFilters}
        onReset={resetFilters}
      />

      {!loading ? <Pagination page={page} pages={pages} total={total} onPage={goToPage} /> : null}

      {modal && (
        <OpportunityModal
          opp={modal}
          onClose={onClose}
          onCreated={() => {
            reload();
            api.get('/api/applications').then(({ data }) => {
              setAppliedIds(
                new Set(
                  (data || []).map((a) => String(a.opportunity?._id || a.opportunity)).filter(Boolean)
                )
              );
            });
          }}
        />
      )}
    </div>
  );
}
