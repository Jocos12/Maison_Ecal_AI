import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ExternalLink, Globe2, MapPin, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { isRdcOpportunity, platformPillClass, CATEGORY_BADGE } from '../utils/opportunityUi.js';

function matchSourceToPlatform(source, platform) {
  const key = (source.scraperKey || source.key || source.name || '').toLowerCase();
  const p = (platform || '').toLowerCase();
  if (key.includes(p) || p.includes(key.replace(/[^a-z]/g, ''))) return true;
  const map = {
    profilrdc: 'profilrdc',
    reliefweb: 'reliefweb',
    unjobs: 'unjobs',
    ungm: 'ungm',
    devex: 'devex',
    achatpublic: 'achatpublicrdc',
    hdx: 'hdx',
    worldbank: 'worldbank',
    afdb: 'afdb'
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k) && p.includes(v)) return true;
  }
  return source.name?.toLowerCase() === p;
}

function SourceOpportunityLine({ opp }) {
  const pill = platformPillClass(opp.platform);
  const cat = CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance;

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-3 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/50 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{opp.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {opp.ville && opp.ville !== 'Non précisé' ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {opp.ville}
            </span>
          ) : null}
          <span>{opp.organization || '—'}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat}`}>
            {opp.category?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${pill}`}>
          {opp.platform}
        </span>
        {opp.sourceUrl ? (
          <a
            href={opp.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Voir en ligne
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function Sources() {
  const { t } = useI18n();
  const [sources, setSources] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [srcRes, oppRes] = await Promise.all([
        api.get('/api/sources'),
        api.get('/api/opportunities', { params: { limit: 80, page: 1 } })
      ]);
      setSources(srcRes.data);
      const rdc = (oppRes.data?.data || []).filter(
        (o) => isRdcOpportunity(o) && o.locationStatus !== 'hors_rdc'
      );
      setOpportunities(rdc);
    } catch {
      toast.error('Impossible de charger les sources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (source) => {
    await api.put(`/api/sources/${source._id}`, { enabled: !source.enabled });
    load();
  };

  const byPlatform = useMemo(() => {
    const map = {};
    for (const opp of opportunities) {
      const key = opp.platform || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(opp);
    }
    return map;
  }, [opportunities]);

  const getSourceOpps = (source) =>
    opportunities.filter((o) => matchSourceToPlatform(source, o.platform)).slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="mecal-hero-dashboard relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl md:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200">
              <Globe2 className="h-4 w-4" />
              Veille multi-plateformes
            </p>
            <h1 className="mecal-title-shine mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {t('pages.sources.title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/90">{t('pages.sources.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="rounded-xl bg-emerald-50 px-4 py-2 dark:bg-emerald-950/40">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{opportunities.length}</p>
          <p className="text-xs font-semibold uppercase text-emerald-600">Offres RDC logistique</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-950/40">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{sources.filter((s) => s.enabled).length}</p>
          <p className="text-xs font-semibold uppercase text-blue-600">Sources actives</p>
        </div>
        <div className="rounded-xl bg-violet-50 px-4 py-2 dark:bg-violet-950/40">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {Object.keys(byPlatform).length}
          </p>
          <p className="text-xs font-semibold uppercase text-violet-600">Plateformes avec offres</p>
        </div>
      </div>

      <p className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
        🤖 Utilisez l&apos;icône <strong>Agent IA</strong> en bas à droite pour rechercher des offres, générer un CV ou postuler.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => {
          const sourceOpps = getSourceOpps(source);
          const isOpen = expanded === source._id;
          return (
            <div
              key={source._id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white">{source.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{source.description}</p>
                    <a
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(source)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      source.enabled
                        ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {source.enabled ? 'Actif' : 'Inactif'}
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <b className="text-slate-900 dark:text-white">{source.frequencyHours}h</b>
                    <br />
                    <span className="text-xs text-slate-500">Fréquence</span>
                  </span>
                  <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <b className="text-slate-900 dark:text-white">{sourceOpps.length || source.opportunitiesCount}</b>
                    <br />
                    <span className="text-xs text-slate-500">En ligne RDC</span>
                  </span>
                  <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <b className="truncate text-slate-900 dark:text-white">{source.lastStatus}</b>
                    <br />
                    <span className="text-xs text-slate-500">Statut</span>
                  </span>
                </div>
                {sourceOpps.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : source._id)}
                    className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    {isOpen ? 'Masquer' : 'Voir'} {sourceOpps.length} offre(s) logistique RDC →
                  </button>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">Aucune offre récente indexée pour cette source.</p>
                )}
              </div>
              {isOpen && sourceOpps.length > 0 ? (
                <div className="space-y-2 border-t border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  {sourceOpps.map((opp) => (
                    <SourceOpportunityLine key={opp._id} opp={opp} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Toutes les opportunités logistique RDC en ligne
          </h2>
          <Link to="/opportunities" className="text-xs font-semibold text-blue-600 hover:underline">
            Voir dans Opportunités →
          </Link>
        </div>
        {loading ? (
          <p className="text-slate-500">Chargement…</p>
        ) : opportunities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-slate-500">
            Aucune opportunité RDC indexée. Lancez une collecte via l&apos;Agent IA.
          </p>
        ) : (
          <div className="space-y-2">
            {opportunities.slice(0, 20).map((opp) => (
              <SourceOpportunityLine key={opp._id} opp={opp} />
            ))}
          </div>
        )}
        {opportunities[0]?.scrapedAt ? (
          <p className="mt-3 text-xs text-slate-400">
            Dernière indexation :{' '}
            {format(new Date(opportunities[0].scrapedAt), 'PPpp', { locale: fr })}
          </p>
        ) : null}
      </section>
    </div>
  );
}
