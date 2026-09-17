import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  AlertCircle,
  CheckCircle2,
  CirclePause,
  ExternalLink,
  Globe2,
  MapPin,
  Play,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { platformPillClass, CATEGORY_BADGE } from '../utils/opportunityUi.js';
import { scorePercent } from '../utils/opportunityUrgency.js';

const GROUPS = [
  {
    id: 'rdc',
    title: 'Marchés publics RDC',
    keys: ['ARSP', 'SIGMAP', 'AchatPublicRDC', 'ProfilRDC']
  },
  {
    id: 'intl',
    title: 'Organisations internationales',
    keys: ['UNGM', 'UNGMVeille', 'ReliefWeb', 'AfDB', 'AfDBVeille']
  }
];

function groupSources(sources) {
  const used = new Set();
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: sources.filter((s) => {
      const key = s.scraperKey || s.key;
      const hit = g.keys.includes(key) || g.keys.includes(s.key);
      if (hit) used.add(s._id);
      return hit;
    })
  }));
  grouped.push({
    id: 'other',
    title: 'Autres',
    items: sources.filter((s) => !used.has(s._id))
  });
  return grouped.filter((g) => g.items.length);
}

function HealthBadge({ health }) {
  if (health === 'healthy') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-3 w-3" /> Pertinent
      </span>
    );
  }
  if (health === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 ring-1 ring-red-500/30">
        <XCircle className="h-3 w-3" /> Erreur
      </span>
    );
  }
  if (health === 'inactive') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
        <CirclePause className="h-3 w-3" /> Inactif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800 ring-1 ring-amber-500/30">
      <AlertCircle className="h-3 w-3" /> 0 pertinent
    </span>
  );
}

function statusLabel(source) {
  if (source.lastStatus === 'error') return 'error';
  if (source.lastStatus === 'idle') return 'idle';
  if (source.lastStatus === 'success') return 'success';
  return 'idle';
}

function SourceOpportunityLine({ opp }) {
  const pill = platformPillClass(opp.platform);
  const cat = CATEGORY_BADGE[opp.category] || CATEGORY_BADGE.assistance;
  const pct = scorePercent(opp);

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
          <span className="font-semibold text-blue-800 dark:text-blue-200">
            {pct}% M-ECAL
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

function SourceCard({ source, expanded, onToggleOpen, onToggleEnabled, onScan, scanning, isAdmin }) {
  const sourceOpps = source.sampleOffers || [];
  const isOpen = expanded === source._id;
  const count = source.relevantCount ?? source.opportunitiesCount ?? 0;
  const scanned = source.lastScrapedAt ? format(new Date(source.lastScrapedAt), 'dd MMM yyyy HH:mm', { locale: fr }) : 'Jamais';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white">{source.name}</h2>
              <HealthBadge health={source.health} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{source.description}</p>
            {source.url ? (
              <a
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onToggleEnabled(source)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              source.enabled
                ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {source.enabled ? 'Actif' : 'Inactif'}
          </button>
        </div>

        {source.enabled === false && source.inactiveReason ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
            <p>{source.inactiveReason}</p>
            <button
              type="button"
              onClick={() => onToggleEnabled(source)}
              className="mt-2 font-bold text-blue-700 hover:underline dark:text-blue-300"
            >
              Réactiver cette source
            </button>
          </div>
        ) : null}

        {source.lastStatus === 'error' && source.lastErrorMessage ? (
          <p className="mt-3 text-xs font-medium text-red-700 dark:text-red-300">{source.lastErrorMessage}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <b className="text-slate-900 dark:text-white">{source.frequencyHours}h</b>
            <br />
            <span className="text-xs text-slate-500">Fréquence</span>
          </span>
          <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <b className="text-slate-900 dark:text-white">{count}</b>
            <br />
            <span className="text-xs text-slate-500">En ligne RDC</span>
          </span>
          <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <b className="truncate text-slate-900 dark:text-white">{statusLabel(source)}</b>
            <br />
            <span className="text-xs text-slate-500">Statut scan</span>
          </span>
          <span className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <b className="text-xs font-semibold text-slate-900 dark:text-white">{scanned}</b>
            <br />
            <span className="text-xs text-slate-500">Dernier scan</span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isAdmin && source.scraperKey ? (
            <button
              type="button"
              disabled={scanning}
              onClick={() => onScan(source)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Play className={`h-3 w-3 ${scanning ? 'animate-pulse' : ''}`} />
              {scanning ? 'Scan…' : 'Scanner cette source maintenant'}
            </button>
          ) : null}
          {count > 0 ? (
            <button
              type="button"
              onClick={() => onToggleOpen(source._id)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              {isOpen ? 'Masquer' : 'Voir'} {count} offre(s) logistique RDC →
            </button>
          ) : (
            <p className="text-xs text-slate-400">
              {source.lastStatus === 'idle'
                ? 'Scan OK mais 0 résultat brut, ou aucun avis pertinent après filtres.'
                : 'Aucune offre pertinente (filtres M-ECAL / RDC) pour cette source.'}
            </p>
          )}
        </div>
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
}

export default function Sources() {
  const { t } = useI18n();
  const { user } = useApp();
  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const [sources, setSources] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [scanningId, setScanningId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/sources');
      const list = Array.isArray(data) ? data : data.sources || [];
      setSources(list);
      setOpportunities(Array.isArray(data?.opportunities) ? data.opportunities : []);
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

  const scanOne = async (source) => {
    if (!isAdmin) return;
    setScanningId(source._id);
    try {
      await api.post(`/api/sources/${source._id}/scrape`);
      toast.success(`Scan ${source.name} lancé`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    } finally {
      setScanningId(null);
    }
  };

  const groups = useMemo(() => groupSources(sources), [sources]);
  const relevantTotal = opportunities.length;

  return (
    <div className="page-shell space-y-8">
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
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{relevantTotal}</p>
          <p className="text-xs font-semibold uppercase text-emerald-600">Offres RDC logistique (filtrées)</p>
        </div>
        <div className="rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-950/40">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{sources.filter((s) => s.enabled).length}</p>
          <p className="text-xs font-semibold uppercase text-blue-600">Sources actives</p>
        </div>
        <div className="rounded-xl bg-violet-50 px-4 py-2 dark:bg-violet-950/40">
          <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
            {sources.filter((s) => (s.relevantCount || 0) > 0).length}
          </p>
          <p className="text-xs font-semibold uppercase text-violet-600">Sources avec offres pertinentes</p>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{group.title}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.items.map((source) => (
              <SourceCard
                key={source._id}
                source={source}
                expanded={expanded}
                onToggleOpen={(id) => setExpanded((cur) => (cur === id ? null : id))}
                onToggleEnabled={toggle}
                onScan={scanOne}
                scanning={scanningId === source._id}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </section>
      ))}

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
            Aucune opportunité RDC indexée après filtres. Lancez une collecte via l&apos;Agent IA.
          </p>
        ) : (
          <div className="space-y-2">
            {opportunities.slice(0, 20).map((opp) => (
              <SourceOpportunityLine key={opp._id} opp={opp} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
