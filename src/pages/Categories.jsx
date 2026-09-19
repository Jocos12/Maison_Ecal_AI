import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Car,
  ChevronDown,
  GraduationCap,
  Info,
  Plus,
  Users,
  Warehouse,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';

// One colour and one icon per category (the same ones as on the other pages).
const LOOK = {
  formation: {
    icon: GraduationCap,
    tile: 'bg-emerald-600',
    bar: 'bg-emerald-500',
    chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900'
  },
  formation_chauffeurs: {
    icon: Car,
    tile: 'bg-lime-600',
    bar: 'bg-lime-500',
    chip: 'bg-lime-50 text-lime-800 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-200 dark:ring-lime-900'
  },
  etude_marche: {
    icon: BarChart3,
    tile: 'bg-violet-600',
    bar: 'bg-violet-500',
    chip: 'bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900'
  },
  inventaire_actifs: {
    icon: Boxes,
    tile: 'bg-orange-500',
    bar: 'bg-orange-500',
    chip: 'bg-orange-50 text-orange-800 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900'
  },
  inventaire_general: {
    icon: Warehouse,
    tile: 'bg-amber-600',
    bar: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900'
  },
  consultance: {
    icon: Users,
    tile: 'bg-[#24478a]',
    bar: 'bg-[#24478a]',
    chip: 'bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1] dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-600'
  }
};
const FALLBACK = LOOK.consultance;

// Columns of the table (from the "md" size up); on phones only the name, the switch and the arrow remain.
const ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 md:grid-cols-[minmax(0,1fr)_4rem_9rem_8.5rem_3.5rem_2rem] md:gap-x-4';

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={onChange}
      className={`relative h-5 w-9 flex-none rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 ${
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

/** The editor that opens under a row: the team's note, the keywords and the link to the offers. */
function Editor({ item, t, look, onPatch }) {
  const [draft, setDraft] = useState(item.description || '');
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const keywords = item.keywords || [];

  useEffect(() => {
    setDraft(item.description || '');
  }, [item.description]);

  const run = async (body) => {
    try {
      await onPatch(item.slug, body);
      toast.success(t('pages.categories.saved'));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const saveDescription = async () => {
    if (draft === (item.description || '')) return;
    setSaving(true);
    await run({ description: draft });
    setSaving(false);
  };

  const addKeyword = () => {
    const value = keyword.trim();
    if (!value) return;
    setKeyword('');
    run({ addKeyword: value });
  };

  return (
    <div className="grid gap-5 border-t border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-2 md:px-5 dark:border-slate-800 dark:bg-slate-800/40">
      <div>
        <label
          htmlFor={`desc-${item.slug}`}
          className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"
        >
          {t('pages.categories.description')}
        </label>
        <textarea
          id={`desc-${item.slug}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveDescription}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-800 transition focus:border-[#24478a] focus:outline-none focus:ring-4 focus:ring-[#24478a]/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <p className="mt-1 text-[11px] text-slate-400">{saving ? t('pages.categories.saving') : t('pages.categories.descriptionHint')}</p>
      </div>

      <div>
        <p className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {t('pages.categories.keywords')}
          <span className="font-semibold normal-case tracking-normal text-slate-400">
            {t('pages.categories.keywordsCount', { count: keywords.length })}
          </span>
        </p>
        <div className="mt-1.5 flex min-h-[1.75rem] flex-wrap gap-1.5">
          {keywords.length ? (
            keywords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => run({ removeKeyword: word })}
                title={t('pages.categories.removeKeyword')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 transition hover:bg-red-50 hover:text-red-700 hover:ring-red-200 ${look.chip}`}
              >
                {word}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))
          ) : (
            <p className="text-xs text-slate-400">{t('pages.categories.noKeywords')}</p>
          )}
        </div>
        <div className="mt-2.5 flex overflow-hidden rounded-lg border border-slate-200 bg-white transition focus-within:border-[#24478a] focus-within:ring-4 focus-within:ring-[#24478a]/10 dark:border-slate-600 dark:bg-slate-800">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder={t('pages.categories.addKeyword')}
            aria-label={t('pages.categories.addKeyword')}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={!keyword.trim()}
            className="inline-flex items-center gap-1 border-l border-slate-200 bg-slate-50 px-3 text-[13px] font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-slate-50 disabled:hover:text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-blue-200"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {t('pages.categories.add')}
          </button>
        </div>
      </div>

      <div className="flex justify-end md:col-span-2">
        <Link
          to={`/opportunities?category=${encodeURIComponent(item.slug)}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#24478a] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#1c3a72] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25"
        >
          {t('pages.categories.seeOffers')}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function Row({ item, total, open, onToggle, onPatch, t, lang }) {
  const look = LOOK[item.slug] || FALLBACK;
  const Icon = look.icon;
  const count = item.count || 0;
  const share = total ? Math.round((count / total) * 100) : 0;
  const last = item.lastFoundAt
    ? format(new Date(item.lastFoundAt), 'd MMM yyyy', { locale: lang === 'fr' ? frLocale : undefined })
    : t('pages.categories.noneYet');

  return (
    <li className={open ? 'bg-white dark:bg-slate-900' : ''}>
      <div className={`${ROW_GRID} px-4 py-3 transition hover:bg-slate-50 md:px-5 dark:hover:bg-slate-800/40 ${item.enabled ? '' : 'opacity-70'}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${t('pages.categories.edit')} : ${item.label}`}
          className="flex min-w-0 items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20"
        >
          <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg text-white shadow-sm ${look.tile}`}>
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{item.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500 md:hidden dark:text-slate-400">
              {t('pages.categories.offerCount', { count })}
            </span>
            <span className="mt-0.5 hidden text-xs text-slate-400 md:block">
              {t('pages.categories.keywordsCount', { count: (item.keywords || []).length })}
            </span>
          </span>
        </button>

        <span className="hidden text-right text-base font-extrabold tabular-nums text-slate-900 md:block dark:text-white">{count}</span>

        <span className="hidden items-center gap-2 md:flex">
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" aria-hidden="true">
            <span className={`block h-full rounded-full ${look.bar}`} style={{ width: `${share}%` }} />
          </span>
          <span className="w-9 text-right text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">{share} %</span>
        </span>

        <span className="hidden text-xs text-slate-500 md:block dark:text-slate-400">{last}</span>

        <span className="flex justify-center">
          <Switch
            checked={item.enabled}
            onChange={() => onPatch(item.slug, { enabled: !item.enabled })}
            label={`${t('pages.categories.follow')} : ${item.enabled ? t('pages.categories.following') : t('pages.categories.notFollowed')}`}
          />
        </span>

        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          aria-hidden="true"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open ? <Editor item={item} t={t} look={look} onPatch={onPatch} /> : null}
    </li>
  );
}

export default function Categories() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSlug, setOpenSlug] = useState(null);

  const load = async () => {
    const { data } = await api.get('/api/category-settings');
    setItems(data.items || []);
  };

  useEffect(() => {
    load()
      .catch(() => toast.error(t('pages.categories.loadError')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPatch = async (slug, body) => {
    const { data } = await api.patch(`/api/category-settings/${slug}`, body);
    setItems((current) => current.map((row) => (row.slug === slug ? data : row)));
  };

  const total = useMemo(() => items.reduce((sum, row) => sum + (row.count || 0), 0), [items]);
  const followed = items.filter((row) => row.enabled).length;

  return (
    <div className="page-shell space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t('pages.categories.title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t('pages.categories.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3ebf9] px-3 py-1.5 text-[#24478a] dark:bg-slate-800 dark:text-blue-200">
            <span className="text-sm font-extrabold tabular-nums">{total}</span>
            {t('pages.categories.activeOffers')}
          </span>
          {items.length ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {t('pages.categories.followedCount', { followed, total: items.length })}
            </span>
          ) : null}
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-3 md:px-5 dark:border-slate-800">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {t('pages.categories.overview', { count: total })}
            </p>
          </div>
          <div
            className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="img"
            aria-label={t('pages.categories.overview', { count: total })}
          >
            {total > 0
              ? items.map((item) =>
                  item.count ? (
                    <span
                      key={item.slug}
                      className={`${(LOOK[item.slug] || FALLBACK).bar} first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${(item.count / total) * 100}%` }}
                      title={`${item.label} : ${item.count}`}
                    />
                  ) : null
                )
              : null}
          </div>
        </div>

        <div className={`${ROW_GRID} hidden border-b border-slate-100 bg-slate-50 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400`}>
          <span>{t('pages.categories.colCategory')}</span>
          <span className="text-right">{t('pages.categories.colOffers')}</span>
          <span>{t('pages.categories.colShare')}</span>
          <span>{t('pages.categories.colLast')}</span>
          <span className="text-center">{t('pages.categories.colFollow')}</span>
          <span />
        </div>

        {loading ? (
          <div className="space-y-px" aria-busy="true">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-slate-100/70 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <Row
                key={item.slug}
                item={item}
                total={total}
                open={openSlug === item.slug}
                onToggle={() => setOpenSlug((cur) => (cur === item.slug ? null : item.slug))}
                onPatch={onPatch}
                t={t}
                lang={lang}
              />
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-[#24478a] dark:text-blue-300" aria-hidden="true" />
        <span>
          {t('pages.categories.strictNote')}{' '}
          <Link to="/strict-mecal" className="font-bold text-[#24478a] underline underline-offset-2 hover:no-underline dark:text-blue-300">
            {t('pages.categories.strictLink')}
          </Link>
        </span>
      </p>
    </div>
  );
}
