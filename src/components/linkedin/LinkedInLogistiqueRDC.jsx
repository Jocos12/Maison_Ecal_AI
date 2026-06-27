import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star
} from 'lucide-react';
import { api } from '../../api/client.js';
import LinkedInOfferChatModal from './LinkedInOfferChatModal.jsx';
import { isJobWatchEnabled, setJobWatchEnabled } from '../../utils/jobWatchStore.js';
import {
  buildAllLogisticsUrl,
  buildLinkedInJobUrl,
  LINKEDIN_CATEGORIES,
  LINKEDIN_GEO,
  LINKEDIN_TIME
} from '../../utils/linkedinSearchUtils.js';
import { rankOffersLocally } from '../../utils/localOfferRank.js';

const LAST_VISIT_KEY = 'mecal_linkedin_last_visit';
const CATEGORY_VISIT_PREFIX = 'mecal_linkedin_cat_';
const DAY_MS = 24 * 60 * 60 * 1000;

function formatTs(iso) {
  if (!iso) return 'Jamais consulté';
  return new Date(iso).toLocaleString('fr-FR');
}

function isStale(iso) {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > DAY_MS;
}

export function isLinkedInPanelStale() {
  return isStale(localStorage.getItem(LAST_VISIT_KEY));
}

export function touchLinkedInPanelVisit() {
  const now = new Date().toISOString();
  localStorage.setItem(LAST_VISIT_KEY, now);
  window.dispatchEvent(new CustomEvent('mecal:linkedin-visit'));
  return now;
}

function touchCategoryVisit(id) {
  const now = new Date().toISOString();
  localStorage.setItem(`${CATEGORY_VISIT_PREFIX}${id}`, now);
  return now;
}

function isVerifiedOpportunity(opp) {
  return (
    opp.locationStatus === 'rdc_confirme' ||
    opp.aiAnalysis?.pays_confirme_rdc === 'true'
  );
}

function isEmploymentOpportunity(opp) {
  return (
    opp.aiAnalysis?.type === 'offre_emploi' ||
    opp.aiAnalysis?.est_emploi === true ||
    /recrut|emploi|consultant|offre|poste|vacance/i.test(opp.title || '')
  );
}

function VerifiedOfferCard({ opp, onLinkedIn, onAskAi, aiPick }) {
  const isJob = isEmploymentOpportunity(opp);
  const score = aiPick?.score;
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
          {opp.title}
        </h3>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <ShieldCheck className="h-3 w-3" />
            Vérifié RDC
          </span>
          {score != null ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              IA {score}%
            </span>
          ) : null}
        </div>
      </div>
      {aiPick?.reason ? (
        <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
          <Sparkles className="mr-1 inline h-3 w-3" />
          {aiPick.reason}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">{opp.organization || opp.platform}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {opp.ville && opp.ville !== 'Non précisé' ? (
          <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
            {opp.ville}
          </span>
        ) : null}
        {isJob ? (
          <span className="rounded-full bg-blue-600/15 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
            Emploi / recrutement
          </span>
        ) : (
          <span className="rounded-full bg-violet-600/15 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
            Mission logistique
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAskAi(opp)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600 px-2.5 py-2 text-xs font-bold text-white transition hover:bg-violet-700"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Discuter avec l&apos;IA
        </button>
        {opp.sourceUrl ? (
          <a
            href={opp.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
          >
            Source
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onLinkedIn(opp.title)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#0A66C2]/30 bg-[#0A66C2]/5 px-2.5 py-2 text-xs font-semibold text-[#0A66C2] hover:bg-[#0A66C2]/10"
        >
          LinkedIn
          <Search className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}

function FilterPill({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-[#0A66C2] text-white shadow-md'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-[#0A66C2]/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function LinkedInLogistiqueRDC() {
  const [visits, setVisits] = useState({});
  const [geoKey, setGeoKey] = useState('rdc');
  const [timeKey, setTimeKey] = useState('week');
  const [verifiedOffers, setVerifiedOffers] = useState([]);
  const [loadingVerified, setLoadingVerified] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [aiPicks, setAiPicks] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiProvider, setAiProvider] = useState('local');
  const [chatOffer, setChatOffer] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [jobWatch, setJobWatch] = useState(() => isJobWatchEnabled());

  useEffect(() => {
    touchLinkedInPanelVisit();
    const load = () => {
      const map = {};
      for (const cat of LINKEDIN_CATEGORIES) {
        map[cat.id] = localStorage.getItem(`${CATEGORY_VISIT_PREFIX}${cat.id}`);
      }
      setVisits(map);
    };
    load();
    window.addEventListener('mecal:linkedin-visit', load);
    return () => window.removeEventListener('mecal:linkedin-visit', load);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/api/opportunities', {
          params: { limit: 50, page: 1 }
        });
        if (cancelled) return;
        const list = (data?.data || []).filter(isVerifiedOpportunity).slice(0, 12);
        setVerifiedOffers(list);
        const localRank = rankOffersLocally(list);
        setAiSummary(localRank.summary);
        setAiPicks(localRank.picks);
        setAiProvider('local');
      } catch {
        if (!cancelled) setVerifiedOffers([]);
      } finally {
        if (!cancelled) setLoadingVerified(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const aiPickById = useMemo(() => {
    const map = {};
    for (const p of aiPicks) {
      if (p.id) map[p.id] = p;
      if (p.offer?._id) map[p.offer._id] = p;
    }
    return map;
  }, [aiPicks]);

  const refreshAiRank = async () => {
    if (!verifiedOffers.length) return;
    setLoadingAi(true);
    try {
      const { data } = await api.post('/api/job-assistant/rdc-offers/rank', {
        offers: verifiedOffers,
        forceAi: true
      });
      setAiSummary(data.summary || '');
      setAiPicks(data.picks || []);
      setAiProvider(data.provider || 'ai');
    } catch {
      const localRank = rankOffersLocally(verifiedOffers);
      setAiSummary(localRank.summary);
      setAiPicks(localRank.picks);
      setAiProvider('local');
    } finally {
      setLoadingAi(false);
    }
  };

  const openAiChat = (offer = null) => {
    setChatOffer(offer);
    setChatOpen(true);
  };

  const toggleJobWatch = () => {
    const next = !jobWatch;
    setJobWatch(next);
    setJobWatchEnabled(next);
  };

  const openUrl = (url, categoryId) => {
    if (categoryId) {
      const ts = touchCategoryVisit(categoryId);
      setVisits((prev) => ({ ...prev, [categoryId]: ts }));
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openLinkedInSearch = (keywords, categoryId) => {
    openUrl(buildLinkedInJobUrl({ keywords, geoKey, timeKey }), categoryId);
  };

  const grid = useMemo(
    () =>
      LINKEDIN_CATEGORIES.map((cat) => ({
        ...cat,
        primaryUrl: buildLinkedInJobUrl({ keywords: cat.keywords, geoKey, timeKey }),
        altUrls: (cat.altSearches || []).map((kw) => ({
          label: kw,
          url: buildLinkedInJobUrl({ keywords: kw, geoKey, timeKey })
        })),
        lastVisit: visits[cat.id],
        isNew: isStale(visits[cat.id])
      })),
    [visits, geoKey, timeKey]
  );

  const allUrl = buildAllLogisticsUrl(geoKey, timeKey);

  return (
    <div className="space-y-8">
      <LinkedInOfferChatModal
        open={chatOpen}
        offer={chatOffer}
        offers={verifiedOffers}
        onClose={() => {
          setChatOpen(false);
          setChatOffer(null);
        }}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0A66C2]/10 via-white to-indigo-50 p-6 shadow-sm dark:border-slate-800 dark:from-[#0A66C2]/20 dark:via-slate-950 dark:to-indigo-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0A66C2]">Emploi · Veille RDC</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              LinkedIn — Logistique RDC
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Recherches optimisées + conseiller IA M-ECAL + alertes emplois logistique publiés en ligne
              (LinkedIn, ReliefWeb, UNjobs, ProfilRDC…).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openAiChat(null)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-700"
            >
              <Bot className="h-4 w-4" />
              Conseiller IA
            </button>
            <button
              type="button"
              onClick={() => openUrl(allUrl)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0A66C2] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#004182]"
            >
              <Search className="h-4 w-4" />
              LinkedIn
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            {jobWatch ? (
              <BellRing className="h-5 w-5 text-red-500" />
            ) : (
              <Bell className="h-5 w-5 text-slate-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Alertes emplois logistique RDC
              </p>
              <p className="text-xs text-slate-500">
                Notification à chaque nouvelle offre détectée en ligne (veille M-ECAL)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleJobWatch}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              jobWatch
                ? 'bg-red-500 text-white'
                : 'border border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800'
            }`}
          >
            {jobWatch ? 'Activées' : 'Activer'}
          </button>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <strong>Astuce :</strong> évitez les guillemets et le « OR » dans les mots-clés LinkedIn — ils
            donnent souvent 0 résultat. Utilisez des termes courts (« logistique », « supply chain ») et
            élargissez la période à 7 ou 30 jours si besoin.
          </p>
        </div>
      </section>

      {(aiSummary || aiPicks.length > 0) && (
        <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Bot className="h-5 w-5 text-violet-600" />
              Conseils — Meilleures offres pour M-ECAL
            </h2>
            <button
              type="button"
              onClick={refreshAiRank}
              disabled={loadingAi}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-800 dark:bg-slate-900 dark:text-violet-300"
            >
              {loadingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Actualiser avec IA cloud
            </button>
          </div>
          {aiProvider === 'local' ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Mode local (sans quota IA) — le classement utilise le score de veille M-ECAL.
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{aiSummary}</p>
          {aiPicks.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {aiPicks.slice(0, 3).map((pick, i) => (
                <button
                  key={pick.id || i}
                  type="button"
                  onClick={() => pick.offer && openAiChat(pick.offer)}
                  className="rounded-xl border border-violet-200 bg-white p-3 text-left transition hover:border-violet-400 hover:shadow-md dark:border-violet-800 dark:bg-slate-900"
                >
                  <p className="text-[10px] font-bold uppercase text-violet-600">Top {i + 1}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {pick.offer?.title || pick.reason}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">{pick.action}</p>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Période
          </span>
          {Object.entries(LINKEDIN_TIME).map(([key, { label, hint }]) => (
            <FilterPill
              key={key}
              active={timeKey === key}
              title={hint}
              onClick={() => setTimeKey(key)}
            >
              {label}
            </FilterPill>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            Zone
          </span>
          {Object.entries(LINKEDIN_GEO).map(([key, { label }]) => (
            <FilterPill key={key} active={geoKey === key} onClick={() => setGeoKey(key)}>
              {label}
            </FilterPill>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Offres vérifiées M-ECAL
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Opportunités confirmées en RDC par notre veille — sources officielles fiables.
            </p>
          </div>
          <Link
            to="/opportunities"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            Voir toutes les opportunités →
          </Link>
        </div>

        {loadingVerified ? (
          <p className="py-8 text-center text-sm text-slate-500">Chargement des offres vérifiées…</p>
        ) : verifiedOffers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500">Aucune offre vérifiée récente en base.</p>
            <Link to="/opportunities" className="mt-2 inline-block text-sm font-semibold text-indigo-600">
              Consulter la veille complète
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {verifiedOffers.map((opp) => (
              <VerifiedOfferCard
                key={opp._id}
                opp={opp}
                aiPick={aiPickById[opp._id]}
                onAskAi={openAiChat}
                onLinkedIn={(title) =>
                  openLinkedInSearch(title.split(' ').slice(0, 4).join(' '))
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-[#0A66C2]" />
            Recherches LinkedIn par métier
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {LINKEDIN_GEO[geoKey]?.label} · {LINKEDIN_TIME[timeKey]?.label} · tri par date
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {grid.map((cat) => (
            <article
              key={cat.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#0A66C2]/40 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A66C2]/10 text-xl"
                    aria-hidden
                  >
                    {cat.emoji}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                      {cat.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Mot-clé : <span className="font-medium text-slate-600 dark:text-slate-300">{cat.keywords}</span>
                    </p>
                  </div>
                </div>
                {cat.isNew ? (
                  <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    NOUVEAU
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Consulté
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-400">Dernière visite : {formatTs(cat.lastVisit)}</p>

              <button
                type="button"
                onClick={() => openUrl(cat.primaryUrl, cat.id)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A66C2] px-3 py-2.5 text-xs font-bold text-white transition group-hover:shadow-md hover:bg-[#004182]"
              >
                Voir sur LinkedIn
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {cat.altUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {cat.altUrls.map((alt) => (
                    <button
                      key={alt.label}
                      type="button"
                      onClick={() => openUrl(alt.url, cat.id)}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-[#0A66C2]/40 hover:text-[#0A66C2] dark:border-slate-600 dark:text-slate-400"
                    >
                      {alt.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
