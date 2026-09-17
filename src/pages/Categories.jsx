import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  FolderOpen,
  GraduationCap,
  Info,
  MessageCircle,
  Package,
  Search,
  Truck,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';

const ICONS = {
  formation: GraduationCap,
  formation_chauffeurs: Truck,
  etude_marche: Search,
  inventaire_actifs: Package,
  inventaire_general: FolderOpen,
  consultance: MessageCircle
};

const COLORS = {
  formation: '#10b981',
  formation_chauffeurs: '#84cc16',
  etude_marche: '#8b5cf6',
  inventaire_actifs: '#f97316',
  inventaire_general: '#eab308',
  consultance: '#2563eb'
};

const ICON_WRAP = {
  formation: 'bg-emerald-500/15 text-emerald-600',
  formation_chauffeurs: 'bg-lime-500/15 text-lime-600',
  etude_marche: 'bg-violet-500/15 text-violet-600',
  inventaire_actifs: 'bg-orange-500/15 text-orange-600',
  inventaire_general: 'bg-amber-500/15 text-amber-600',
  consultance: 'bg-blue-600/15 text-blue-700'
};

function CategoryCard({ item, t, lang, onPatch }) {
  const Icon = ICONS[item.slug] || MessageCircle;
  const hasOffers = (item.count || 0) > 0;
  const [draft, setDraft] = useState(item.description || '');
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(item.description || '');
  }, [item.description]);

  const lastLabel = item.lastFoundAt
    ? t('pages.categories.lastFound', {
        date: format(new Date(item.lastFoundAt), 'd MMM yyyy', { locale: lang === 'fr' ? frLocale : undefined })
      })
    : t('pages.categories.neverFound');

  const saveDescription = async () => {
    if (draft === (item.description || '')) return;
    setSaving(true);
    try {
      await onPatch(item.slug, { description: draft });
      toast.success(t('pages.categories.saved'));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = async () => {
    const value = keyword.trim();
    if (!value) return;
    setKeyword('');
    try {
      await onPatch(item.slug, { addKeyword: value });
      toast.success(t('pages.categories.saved'));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const removeKeyword = async (word) => {
    try {
      await onPatch(item.slug, { removeKeyword: word });
      toast.success(t('pages.categories.saved'));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  return (
    <article
      className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
        hasOffers
          ? 'border-blue-300 bg-white ring-2 ring-blue-500/20 dark:border-blue-700 dark:bg-slate-900/80'
          : 'border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${ICON_WRAP[item.slug]}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold leading-snug text-slate-950 dark:text-white">{item.label}</h2>
            <p className={`mt-1 text-sm font-semibold ${hasOffers ? 'text-blue-700 dark:text-blue-300' : 'text-slate-400'}`}>
              {t('pages.categories.offerCount', { count: item.count || 0 })}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{lastLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" title={t('pages.categories.followHint')}>
          <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
            {t('pages.categories.follow')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={item.enabled}
            aria-label={t('pages.categories.follow')}
            onClick={() => onPatch(item.slug, { enabled: !item.enabled })}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              item.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                item.enabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
          <Info className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>

      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {t('pages.categories.description')}
      </label>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={saveDescription}
        rows={3}
        className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
      {saving ? <p className="mt-1 text-[11px] text-blue-600">{t('pages.categories.saving')}</p> : null}

      <label className="mt-4 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {t('pages.categories.keywords')}
      </label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {(item.keywords || []).map((word) => (
          <button
            key={word}
            type="button"
            onClick={() => removeKeyword(word)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-red-300 hover:text-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            title={t('pages.categories.removeKeyword')}
          >
            {word}
            <X className="h-3 w-3" />
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
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
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
        />
        <button
          type="button"
          onClick={addKeyword}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
        >
          {t('pages.categories.add')}
        </button>
      </div>

      <Link
        to={`/opportunities?category=${encodeURIComponent(item.slug)}`}
        className="mt-4 inline-flex w-fit items-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500"
      >
        {t('pages.categories.seeOffers')}
      </Link>
    </article>
  );
}

export default function Categories() {
  const { t, lang } = useI18n();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/api/category-settings');
    setItems(data.items || []);
  };

  useEffect(() => {
    load()
      .catch(() => toast.error(t('pages.categories.loadError')))
      .finally(() => setLoading(false));
  }, []);

  const onPatch = async (slug, body) => {
    const { data } = await api.patch(`/api/category-settings/${slug}`, body);
    setItems((current) => current.map((row) => (row.slug === slug ? data : row)));
  };

  const chartData = useMemo(
    () =>
      items.map((row) => ({
        name: row.label.replace(/ \/ .*/, '').replace("d'une Organisation", '').trim().slice(0, 18),
        slug: row.slug,
        count: row.count || 0
      })),
    [items]
  );

  const total = items.reduce((sum, row) => sum + (row.count || 0), 0);

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          {t('pages.categories.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('pages.categories.subtitle')}</p>
      </div>

      <section className="mecal-stat-glass rounded-2xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t('pages.categories.overview', { count: total })}
        </h2>
        <div className="mt-3 h-56 w-full">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((row) => (
                    <Cell key={row.slug} fill={COLORS[row.slug] || '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400">{t('common.loading')}</p>
          )}
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <CategoryCard key={item.slug} item={item} t={t} lang={lang} onPatch={onPatch} />
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
        <span>
          {t('pages.categories.strictNote')}{' '}
          <Link to="/strict-mecal" className="font-semibold text-blue-700 hover:underline dark:text-blue-400">
            {t('pages.categories.strictLink')}
          </Link>
        </span>
      </p>
    </div>
  );
}
