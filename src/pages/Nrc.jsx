import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Briefcase, CalendarClock, ChevronDown, Gavel, Globe2, HeartHandshake, Loader2, MapPin, RefreshCw, Search, Sparkles, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import Dropdown from '../components/ui/Dropdown.jsx';
import NrcNoticeDialog from '../components/nrc/NrcNoticeDialog.jsx';
import NrcNoticeCard from '../components/nrc/NrcNoticeCard.jsx';
import { CountryFlag, FOCUS, countryLabel } from '../components/nrc/nrcUi.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';

const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const PAGE_SIZE = 20;

function relativeTime(iso, lang) {
  if (!iso) return '';
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const abs = Math.abs(diffMin);
  if (abs < 60) return rtf.format(diffMin, 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diffMin / 60), 'hour');
  return rtf.format(Math.round(diffMin / 1440), 'day');
}

export default function Nrc() {
  const { t, lang, dateLocale } = useUiLocale();
  const [kind, setKind] = useState('all');
  const [drcOnly, setDrcOnly] = useState(false);
  const [country, setCountry] = useState('');
  const [status, setStatus] = useState('open');
  const [fit, setFit] = useState(false);
  const [sort, setSort] = useState('score');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [openId, setOpenId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [kind, drcOnly, country, status, fit, sort, search]);

  const loadMeta = useCallback(async () => {
    try {
      const { data } = await api.get('/api/nrc/meta');
      setMeta(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  const loadList = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get('/api/nrc', {
          params: { kind, drc: drcOnly ? 'true' : '', fit: fit ? 'true' : '', country, status, sort, q: search, page: pageToLoad, limit: PAGE_SIZE }
        });
        setItems((prev) => (pageToLoad === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setPages(data.pages);
      } catch {
        toast.error(t('nrcPage.toastLoadError'));
      } finally {
        setLoading(false);
      }
    },
    [kind, drcOnly, country, status, fit, sort, search, t]
  );

  useEffect(() => {
    loadList(page);
  }, [loadList, page]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // While a collection is running, follow it: refresh the counters and the list until it ends
  const syncing = Boolean(meta?.sync?.running);
  useEffect(() => {
    if (!syncing) return undefined;
    pollRef.current = window.setInterval(async () => {
      const data = await loadMeta();
      if (data && !data.sync?.running) {
        window.clearInterval(pollRef.current);
        toast.success(t('nrcPage.toastSyncDone'));
        loadList(1);
      }
    }, 6000);
    return () => window.clearInterval(pollRef.current);
  }, [syncing, loadMeta, loadList, t]);

  const startSync = async () => {
    try {
      const { data } = await api.post('/api/nrc/sync');
      setMeta((m) => ({ ...(m || {}), sync: { ...(m?.sync || {}), ...(data.sync || {}), running: true } }));
      toast.success(data.status === 'already_running' ? t('nrcPage.toastSyncRunning') : t('nrcPage.toastSyncStarted'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('nrcPage.toastSyncFail'));
    }
  };

  const onNoticeChanged = (full) => {
    setItems((list) => list.map((n) => (n._id === full._id ? { ...n, brief: { generatedAt: full.brief?.generatedAt }, draft: { generatedAt: full.draft?.generatedAt } } : n)));
  };

  const filtersActive = Boolean(kind !== 'all' || drcOnly || country || status !== 'open' || fit || search);
  const resetFilters = () => {
    setKind('all');
    setDrcOnly(false);
    setCountry('');
    setStatus('open');
    setFit(false);
    setSearchInput('');
  };

  const countries = useMemo(() => {
    const list = [...(meta?.countries || [])];
    list.sort((a, b) => (a.code === 'CD' ? -1 : b.code === 'CD' ? 1 : b.count - a.count));
    return list;
  }, [meta]);

  const fits = meta?.fits || { tender: 0, job: 0, total: 0 };
  const stats = [
    [t('nrcPage.statTenders'), meta?.tenders ?? 0, Gavel, 'bg-amber-300 text-amber-950'],
    [t('nrcPage.statJobs'), meta?.jobs ?? 0, Briefcase, 'bg-violet-300 text-violet-950'],
    [t('nrcPage.statFits'), fits.total, Target, 'bg-emerald-300 text-emerald-950'],
    [t('nrcPage.statDrc'), meta?.drc ?? 0, MapPin, 'bg-teal-300 text-teal-950'],
    [t('nrcPage.statSoon'), meta?.closingSoon ?? 0, CalendarClock, 'bg-rose-300 text-rose-950']
  ];

  // The tabs count what the current scope shows: all the logistics notices, or only those that fit M-ECAL
  const tenderCount = fit ? fits.tender : meta?.tenders ?? 0;
  const jobCount = fit ? fits.job : meta?.jobs ?? 0;
  const tabs = [
    ['all', t('nrcPage.tabAll'), tenderCount + jobCount],
    ['tender', t('nrcPage.tabTender'), tenderCount],
    ['job', t('nrcPage.tabJob'), jobCount]
  ];

  const sync = meta?.sync || {};
  const empty = !loading && items.length === 0;
  const firstRun = empty && !filtersActive && (syncing || !sync.lastRunAt);

  return (
    <div className="page-shell space-y-6 pb-10">
      {/* Banner: what NRC publishes right now, and where */}
      <section className="relative overflow-hidden rounded-3xl bg-[#24478a] p-6 text-white shadow-sm md:p-8">
        <span className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[32px] border-white/5" aria-hidden="true" />
        <span className="pointer-events-none absolute -bottom-28 left-1/3 h-52 w-52 rounded-full border-[26px] border-white/5" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
                <HeartHandshake className="h-7 w-7" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('nrcPage.pageTag')}</p>
                <h1 className="break-words text-3xl font-extrabold leading-tight tracking-tight">{t('nrcPage.title')}</h1>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <button
                type="button"
                onClick={startSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] shadow-sm transition hover:bg-blue-50 disabled:opacity-70 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {syncing ? t('nrcPage.refreshing') : t('nrcPage.refresh')}
              </button>
              <p className="text-xs font-medium text-blue-100">{sync.lastRunAt ? t('nrcPage.lastUpdate', { when: relativeTime(sync.lastRunAt, lang) }) : t('nrcPage.neverUpdated')}</p>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-blue-100">{t('nrcPage.subtitle')}</p>
          {meta?.hidden > 0 ? <p className="mt-2 max-w-2xl text-xs font-medium text-blue-200">{t('nrcPage.hiddenNote', { count: meta.hidden })}</p> : null}
          {syncing || sync.detailBacklog > 0 ? (
            <p className="mt-3 inline-flex max-w-2xl items-start gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-medium leading-relaxed text-blue-50">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              <span>
                {syncing ? t('nrcPage.syncingHint') : ''} {sync.detailBacklog > 0 ? t('nrcPage.backlog', { count: sync.detailBacklog }) : ''}
              </span>
            </p>
          ) : null}

          <dl className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-5">
            {stats.map(([label, value, StatIcon, chip]) => (
              <div key={label} className="rounded-2xl bg-white/10 px-3 py-3 sm:px-4">
                <span className={`mb-2.5 grid h-8 w-8 place-items-center rounded-lg ${chip}`}>
                  <StatIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <dd className="text-2xl font-extrabold leading-none tabular-nums">{value}</dd>
                <dt className="mt-1.5 break-words text-[11px] font-semibold leading-snug text-blue-100 sm:text-xs">{label}</dt>
              </div>
            ))}
          </dl>

          {countries.length ? (
            <div className="mt-6">
              <p className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-200">
                <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t('nrcPage.whereTitle')}
              </p>
              <ul className="flex flex-wrap gap-2">
                {countries.slice(0, 10).map((c) => {
                  const on = country === c.code;
                  return (
                    <li key={c.code}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCountry(on ? '' : c.code)}
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 ${
                          on ? 'bg-white text-[#24478a]' : c.code === 'CD' ? 'bg-yellow-300 text-yellow-950 hover:bg-yellow-200' : 'bg-white/15 text-white hover:bg-white/25'
                        }`}
                      >
                        <CountryFlag code={c.code} className="h-3.5 w-5" />
                        {countryLabel(c.code, c.name, lang)}
                        <span className={`rounded-full px-1.5 tabular-nums ${on ? 'bg-[#e3ebf9]' : 'bg-black/10'}`}>{c.count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* Filters */}
      <section className={`${CARD} space-y-4 p-4 md:p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="tablist">
            {tabs.map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={kind === id}
                onClick={() => setKind(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${FOCUS} ${kind === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'}`}
              >
                {label}
                <span className={`rounded-full px-2 text-[11px] tabular-nums ${kind === id ? 'bg-white/20' : 'bg-slate-300/70 dark:bg-slate-600'}`}>{count}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={drcOnly}
            onClick={() => setDrcOnly((v) => !v)}
            className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-bold transition ${FOCUS} ${drcOnly ? 'border-yellow-400 bg-yellow-50 text-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            <CountryFlag code="CD" className="h-4 w-6" />
            {t('nrcPage.drcOnly')}
            <span className={`relative h-5 w-9 flex-none rounded-full transition-colors ${drcOnly ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true">
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${drcOnly ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_13rem]">
          <label className="relative block min-w-0">
            <span className="sr-only">{t('nrcPage.searchPlaceholder')}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              name="nrc-search"
              autoComplete="off"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('nrcPage.searchPlaceholder')}
              className="h-[46px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <Dropdown
            label={t('nrcPage.countryLabel')}
            icon={Globe2}
            value={country}
            defaultValue=""
            onChange={setCountry}
            options={[{ value: '', label: t('nrcPage.allCountries') }, ...countries.map((c) => ({ value: c.code, label: countryLabel(c.code, c.name, lang), hint: String(c.count) }))]}
          />
          <Dropdown
            label={t('nrcPage.sortLabel')}
            icon={ArrowUpDown}
            value={sort}
            defaultValue="score"
            onChange={setSort}
            options={[
              { value: 'score', label: t('nrcPage.sortScore') },
              { value: 'deadline', label: t('nrcPage.sortDeadline') },
              { value: 'recent', label: t('nrcPage.sortRecent') }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="group" aria-label={t('nrcPage.scopeLabel')}>
              {[
                [false, t('nrcPage.scopeAll'), (meta?.tenders ?? 0) + (meta?.jobs ?? 0)],
                [true, t('nrcPage.scopeFit'), fits.total]
              ].map(([value, label, count]) => (
                <button
                  key={String(value)}
                  type="button"
                  aria-pressed={fit === value}
                  onClick={() => setFit(value)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${FOCUS} ${
                    fit === value ? (value ? 'bg-emerald-600 text-white shadow-sm' : 'bg-[#24478a] text-white shadow-sm') : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${fit === value ? 'bg-white/20' : 'bg-slate-300/70 dark:bg-slate-600'}`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60" role="group" aria-label={t('nrcPage.statusLabel')}>
              {[
                ['open', t('nrcPage.statusOpen')],
                ['closed', t('nrcPage.statusClosed')]
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={status === id}
                  onClick={() => setStatus(id)}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${FOCUS} ${status === id ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('nrcPage.results', { count: total })}</p>
            {filtersActive ? (
              <button type="button" onClick={resetFilters} className={`rounded-lg px-3 py-2 text-xs font-bold text-[#24478a] underline-offset-2 hover:underline dark:text-blue-200 ${FOCUS}`}>
                {t('nrcPage.reset')}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          {t('nrcPage.loading')}
        </div>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-600 dark:bg-slate-900">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#e3ebf9] text-[#24478a] dark:bg-slate-800">
            {firstRun ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> : <HeartHandshake className="h-8 w-8" aria-hidden="true" />}
          </span>
          <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{firstRun ? t('nrcPage.emptyFirstTitle') : t('nrcPage.emptyTitle')}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{firstRun ? t('nrcPage.emptyFirstText') : fit ? t('nrcPage.emptyFitText') : t('nrcPage.emptyText')}</p>
          {filtersActive ? (
            <button type="button" onClick={resetFilters} className={`mt-4 rounded-xl border border-[#24478a] px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:text-blue-200 ${FOCUS}`}>
              {t('nrcPage.reset')}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3.5">
            {items.map((n) => (
              <NrcNoticeCard key={n._id} n={n} active={openId === n._id} onOpen={(notice) => setOpenId(notice._id)} t={t} lang={lang} dateLocale={dateLocale} />
            ))}
          </ul>
          {page < pages ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setPage((p) => p + 1)}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              {t('nrcPage.showMore', { count: Math.min(PAGE_SIZE, total - items.length) })}
            </button>
          ) : null}
        </div>
      )}

      {openId ? <NrcNoticeDialog noticeId={openId} onClose={() => setOpenId(null)} onChanged={onNoticeChanged} t={t} lang={lang} dateLocale={dateLocale} /> : null}
    </div>
  );
}
