import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellRing,
  Bot,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  X
} from 'lucide-react';
import { api } from '../../api/client.js';
import LinkedInOfferChatModal from './LinkedInOfferChatModal.jsx';
import { isJobWatchEnabled, setJobWatchEnabled } from '../../utils/jobWatchStore.js';
import {
  buildAllLogisticsUrl,
  buildLinkedInJobUrl,
  LINKEDIN_CATEGORIES,
  LINKEDIN_GEO,
  LINKEDIN_TIME,
  sanitizeJobKeywords
} from '../../utils/linkedinSearchUtils.js';
import { rankOffersLocally } from '../../utils/localOfferRank.js';
import { deadlineTextClass, deadlineUrgency, urgencyBadgeClass } from '../../utils/opportunityUrgency.js';

const LAST_VISIT_KEY = 'mecal_linkedin_last_visit';
const CATEGORY_VISIT_PREFIX = 'mecal_linkedin_cat_';
const TIP_KEY = 'mecal_linkedin_tip_hidden';
const FOLLOW_KEY = 'mecal_linkedin_followed';
const DAY_MS = 24 * 60 * 60 * 1000;
const ECAL_NAVY = '#1e3a5f';

const SOURCE_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reliefweb', label: 'ReliefWeb' },
  { id: 'unjobs', label: 'UNjobs' },
  { id: 'profilrdc', label: 'ProfilRDC' }
];

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

function loadFollowed() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveFollowed(set) {
  localStorage.setItem(FOLLOW_KEY, JSON.stringify([...set]));
}

function isVerifiedOpportunity(opp) {
  return opp.locationStatus === 'rdc_confirme' || opp.aiAnalysis?.pays_confirme_rdc === 'true';
}

function isEmploymentOpportunity(opp) {
  return (
    opp.aiAnalysis?.type === 'offre_emploi' ||
    opp.aiAnalysis?.est_emploi === true ||
    /recrut|emploi|consultant|offre|poste|vacance/i.test(opp.title || '')
  );
}

function offerId(opp) {
  return String(opp?._id || opp?.sourceUrl || opp?.title || '');
}

function jobToOpp(job) {
  return {
    _id: job.sourceUrl || job.title,
    title: job.title,
    organization: job.organization,
    platform: job.platform || job.source || 'Job board',
    ville: job.city,
    location: job.city,
    sourceUrl: job.sourceUrl,
    deadline: job.deadline && job.deadline !== 'Non précisé' ? job.deadline : null,
    postedDate: job.postedDate || null,
    locationStatus: job.verified ? 'rdc_confirme' : 'a_verifier',
    aiAnalysis: {}
  };
}

function offerBlob(opp) {
  return `${opp.title || ''} ${opp.organization || ''} ${opp.platform || ''} ${opp.ville || ''} ${opp.location || ''} ${opp.description || ''} ${opp.sourceUrl || ''}`.toLowerCase();
}

function offerMatchesKeyword(opp, kw) {
  if (!kw) return true;
  const blob = offerBlob(opp);
  return kw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => blob.includes(token));
}

function offerMatchesPeriod(opp, timeKey) {
  const days = LINKEDIN_TIME[timeKey]?.days;
  if (days == null) return true;
  const raw = opp.postedDate || opp.firstSeenAt || opp.scrapedAt || opp.createdAt;
  if (!raw) return true;
  return Date.now() - new Date(raw).getTime() <= days * DAY_MS;
}

function offerMatchesCity(opp, geoKey) {
  if (!geoKey || geoKey === 'rdc') return true;
  const label = (LINKEDIN_GEO[geoKey]?.label || '').toLowerCase();
  if (!label) return true;
  return offerBlob(opp).includes(label);
}

function offerMatchesSource(opp, sourceKey) {
  if (!sourceKey || sourceKey === 'all') return true;
  const blob = offerBlob(opp);
  if (sourceKey === 'linkedin') return blob.includes('linkedin');
  if (sourceKey === 'reliefweb') return blob.includes('reliefweb');
  if (sourceKey === 'unjobs') return /unjobs|unjobnet|un job/.test(blob);
  if (sourceKey === 'profilrdc') return /profilrdc|profil rdc/.test(blob);
  return true;
}

function DeadlineMeta({ opp }) {
  const urgency = deadlineUrgency(opp.deadline);
  const showUrgent = opp.isUrgent || urgency.level === 'critical' || urgency.level === 'soon';
  let postedLabel = null;
  try {
    const raw = opp.postedDate || opp.firstSeenAt || opp.scrapedAt || opp.createdAt;
    postedLabel = raw ? new Date(raw).toLocaleDateString('fr-FR') : null;
  } catch {
    postedLabel = null;
  }
  const deadlineLabel = opp.deadline
    ? new Date(opp.deadline).toLocaleDateString('fr-FR')
    : 'Clôture non précisée';

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
      {showUrgent ? (
        <span className={`rounded-full px-2 py-0.5 font-bold uppercase ${urgencyBadgeClass(urgency.level)}`}>
          Urgent
        </span>
      ) : null}
      {postedLabel ? <span className="text-slate-400">Publié {postedLabel}</span> : null}
      <span className={deadlineTextClass(urgency.level)}>Clôture : {deadlineLabel}</span>
    </div>
  );
}

function VerifiedOfferCard({ opp, onLinkedIn, onAskAi, onDetails, aiPick }) {
  const isJob = isEmploymentOpportunity(opp);
  const score = aiPick?.score;
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400/50 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70">
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
            <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
              <Star className="h-3 w-3 fill-blue-600 text-blue-600" />
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
      <DeadlineMeta opp={opp} />
      <div className="mt-2 flex flex-wrap gap-1">
        {opp.ville && opp.ville !== 'Non précisé' ? (
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">{opp.ville}</span>
        ) : null}
        {isJob ? (
          <span className="rounded-full bg-blue-600/15 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
            Emploi / recrutement
          </span>
        ) : (
          <span className="rounded-full bg-slate-600/15 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
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
        <button
          type="button"
          onClick={() => onDetails(opp)}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
        >
          Voir détails
        </button>
        {opp.sourceUrl ? (
          <a
            href={opp.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
          >
            Voir l&apos;offre source
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
          ? 'bg-blue-600 text-white shadow-md'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-400/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
      }`}
    >
      {children}
    </button>
  );
}

function StatsBreakdown({ total, jobs, missions }) {
  const safeTotal = total || 0;
  const jobPct = safeTotal ? Math.round((jobs / safeTotal) * 100) : 0;
  const missionPct = safeTotal ? 100 - jobPct : 0;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white">
          {safeTotal} vérifiée(s) RDC
        </span>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
          {jobs} emploi / recrutement
        </span>
        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {missions} mission(s)
        </span>
      </div>
      {safeTotal > 0 ? (
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="bg-blue-600" style={{ width: `${jobPct}%` }} title="Emploi" />
          <div className="bg-slate-400" style={{ width: `${missionPct}%` }} title="Missions" />
        </div>
      ) : null}
    </div>
  );
}

export default function LinkedInLogistiqueRDC() {
  const [visits, setVisits] = useState({});
  const [geoKey, setGeoKey] = useState('rdc');
  const [timeKey, setTimeKey] = useState('week');
  const [sourceKey, setSourceKey] = useState('all');
  const [keywordInput, setKeywordInput] = useState('logistique');
  const [keyword, setKeyword] = useState('logistique');
  const [verifiedOffers, setVerifiedOffers] = useState([]);
  const [searchJobs, setSearchJobs] = useState([]);
  const [loadingVerified, setLoadingVerified] = useState(true);
  const [searching, setSearching] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiPicks, setAiPicks] = useState([]);
  const [cloudLocked, setCloudLocked] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiProvider, setAiProvider] = useState('local');
  const [chatOffer, setChatOffer] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [detailOffer, setDetailOffer] = useState(null);
  const [jobWatch, setJobWatch] = useState(() => isJobWatchEnabled());
  const [tipHidden, setTipHidden] = useState(() => localStorage.getItem(TIP_KEY) === '1');
  const [followed, setFollowed] = useState(() => loadFollowed());
  const didAutoSearch = useRef(false);

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
          params: { limit: 80, page: 1, sort: 'recent' }
        });
        if (cancelled) return;
        const list = (data?.data || []).filter(isVerifiedOpportunity);
        setVerifiedOffers(list);
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

  const runKeywordSearch = useCallback(
    async (rawKw = keywordInput) => {
      const kw = sanitizeJobKeywords(rawKw);
      setKeywordInput(kw);
      setKeyword(kw);
      if (sourceKey === 'linkedin') {
        setSearchJobs([]);
        return;
      }
      setSearching(true);
      try {
        const city = geoKey === 'rdc' ? undefined : LINKEDIN_GEO[geoKey]?.label;
        const sources =
          sourceKey === 'reliefweb' ? 'reliefweb' : sourceKey === 'unjobs' ? 'unjobnet' : undefined;
        const { data } = await api.post('/api/job-assistant/search', {
          query: kw || 'logistique',
          city,
          role: kw || 'logistique',
          sources
        });
        setSearchJobs((data.jobs || []).map(jobToOpp));
      } catch {
        setSearchJobs([]);
      } finally {
        setSearching(false);
      }
    },
    [geoKey, sourceKey]
  );

  useEffect(() => {
    if (loadingVerified || didAutoSearch.current) return;
    didAutoSearch.current = true;
    runKeywordSearch('logistique');
  }, [loadingVerified, runKeywordSearch]);

  useEffect(() => {
    setCloudLocked(false);
  }, [keyword, timeKey, geoKey, sourceKey]);

  const filteredOffers = useMemo(() => {
    const merged = [];
    const seen = new Set();
    for (const opp of [...searchJobs, ...verifiedOffers]) {
      const key = offerId(opp);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(opp);
    }
    return merged.filter(
      (opp) =>
        offerMatchesKeyword(opp, keyword) &&
        offerMatchesPeriod(opp, timeKey) &&
        offerMatchesCity(opp, geoKey) &&
        offerMatchesSource(opp, sourceKey)
    );
  }, [verifiedOffers, searchJobs, keyword, timeKey, geoKey, sourceKey]);

  const stats = useMemo(() => {
    const jobs = filteredOffers.filter(isEmploymentOpportunity).length;
    return { total: filteredOffers.length, jobs, missions: Math.max(0, filteredOffers.length - jobs) };
  }, [filteredOffers]);

  useEffect(() => {
    if (cloudLocked) return;
    const localRank = rankOffersLocally(filteredOffers);
    setAiSummary(localRank.summary);
    setAiPicks(localRank.picks);
    setAiProvider('local');
  }, [filteredOffers, cloudLocked]);

  const aiPickById = useMemo(() => {
    const map = {};
    for (const p of aiPicks) {
      if (p.id) map[p.id] = p;
      if (p.offer?._id) map[p.offer._id] = p;
    }
    return map;
  }, [aiPicks]);

  const refreshAiRank = async () => {
    setLoadingAi(true);
    try {
      await runKeywordSearch(keyword || 'logistique');
      const pool = filteredOffers.length ? filteredOffers : verifiedOffers;
      const { data } = await api.post('/api/job-assistant/rdc-offers/rank', {
        offers: pool.slice(0, 20),
        forceAi: true
      });
      setAiSummary(data.summary || '');
      setAiPicks(data.picks || []);
      setAiProvider(data.provider || 'local');
      setCloudLocked(data.provider && data.provider !== 'local');
      if (!data.provider || data.provider === 'local') {
        setAiSummary(
          data.aiUnavailable
            ? 'Nos assistants IA sont temporairement indisponibles. Classement local d’après le score de veille M-ECAL.'
            : data.summary || rankOffersLocally(pool).summary
        );
      }
    } catch {
      const localRank = rankOffersLocally(filteredOffers);
      setAiSummary(
        'Nos assistants IA sont temporairement indisponibles. Classement local d’après le score de veille M-ECAL.'
      );
      setAiPicks(localRank.picks);
      setAiProvider('local');
      setCloudLocked(false);
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

  const toggleFollow = (opp) => {
    const id = offerId(opp);
    if (!id) return;
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveFollowed(next);
      return next;
    });
  };

  const hideTip = () => {
    localStorage.setItem(TIP_KEY, '1');
    setTipHidden(true);
  };

  const openUrl = (url, categoryId) => {
    if (categoryId) {
      const ts = touchCategoryVisit(categoryId);
      setVisits((prev) => ({ ...prev, [categoryId]: ts }));
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openLinkedInSearch = (keywords, categoryId) => {
    openUrl(buildLinkedInJobUrl({ keywords: sanitizeJobKeywords(keywords), geoKey, timeKey }), categoryId);
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
        offers={filteredOffers}
        onClose={() => {
          setChatOpen(false);
          setChatOffer(null);
        }}
      />

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 shadow-md dark:border-slate-800 dark:from-[#1e3a5f]/40 dark:via-slate-950 dark:to-slate-900"
        style={{ boxShadow: '0 8px 24px rgba(30, 58, 95, 0.08)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 px-6 py-5" style={{ borderColor: ECAL_NAVY }}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Emploi · Veille RDC</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">LinkedIn — Logistique RDC</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Recherches logistique Maison ECAL : base interne + LinkedIn, ReliefWeb, UNjobs, ProfilRDC.
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

        <div className="space-y-4 px-6 py-5">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              runKeywordSearch();
            }}
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Recherche mots-clés</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="Ex. logistique, supply chain, magasinier…"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none ring-blue-600/20 focus:border-blue-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Rechercher
            </button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              {jobWatch ? (
                <BellRing className="h-5 w-5 text-emerald-600" />
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
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800'
              }`}
            >
              {jobWatch ? 'Activées' : 'Activer'}
            </button>
          </div>

          {!tipHidden ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1">
                <strong>Astuce :</strong> les guillemets et le « OR » sont retirés automatiquement. Des termes
                courts (« logistique », « supply chain ») et une période 7 ou 30 jours donnent plus de résultats.
              </p>
              <button
                type="button"
                onClick={hideTip}
                className="rounded-md p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
                aria-label="Fermer l'astuce"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            Période
          </span>
          {Object.entries(LINKEDIN_TIME).map(([key, { label, hint }]) => (
            <FilterPill key={key} active={timeKey === key} title={hint} onClick={() => setTimeKey(key)}>
              {label}
            </FilterPill>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            Ville
          </span>
          {Object.entries(LINKEDIN_GEO).map(([key, { label }]) => (
            <FilterPill key={key} active={geoKey === key} onClick={() => setGeoKey(key)}>
              {label}
            </FilterPill>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Radio className="h-3.5 w-3.5" />
            Source
          </span>
          {SOURCE_FILTERS.map((src) => (
            <FilterPill key={src.id} active={sourceKey === src.id} onClick={() => setSourceKey(src.id)}>
              {src.label}
            </FilterPill>
          ))}
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {loadingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Actualiser avec IA cloud
            </button>
          </div>
          {aiProvider === 'local' ? (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Mode simplifié — IA temporairement indisponible. Classement d’après le score de veille déjà en
              base.
            </p>
          ) : (
            <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">Classement via {aiProvider}.</p>
          )}
          <StatsBreakdown total={stats.total} jobs={stats.jobs} missions={stats.missions} />
          {aiPicks.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {aiPicks.slice(0, 3).map((pick, i) => {
                const opp = pick.offer;
                const id = offerId(opp || pick);
                const isFollowed = followed.has(id);
                return (
                  <article
                    key={pick.id || i}
                    className="flex flex-col rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-800 dark:bg-slate-900"
                  >
                    <p className="text-[10px] font-bold uppercase text-violet-600">Top {i + 1}</p>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {opp?.title || pick.reason}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{opp?.organization || opp?.platform}</p>
                    {opp ? <DeadlineMeta opp={opp} /> : null}
                    <p className="mt-2 line-clamp-2 text-[11px] text-slate-500">{pick.reason}</p>
                    <div className="mt-3 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => opp && toggleFollow(opp)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold ${
                          isFollowed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isFollowed ? 'Offre suivie' : 'Suivre cette offre'}
                      </button>
                      <button
                        type="button"
                        onClick={() => opp && setDetailOffer(opp)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200"
                      >
                        Voir détails
                      </button>
                      {opp?.sourceUrl ? (
                        <a
                          href={opp.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-slate-600 dark:text-blue-300"
                        >
                          Voir l&apos;offre source
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {detailOffer ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-blue-700">Détails — sans quitter la page</p>
                  <h3 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{detailOffer.title}</h3>
                  <p className="text-xs text-slate-500">
                    {detailOffer.organization || detailOffer.platform} · {detailOffer.ville || 'RDC'}
                  </p>
                </div>
                <button type="button" onClick={() => setDetailOffer(null)} className="rounded-md p-1 text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DeadlineMeta opp={detailOffer} />
              {detailOffer.description ? (
                <p className="mt-2 line-clamp-6 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {String(detailOffer.description).replace(/<[^>]+>/g, ' ')}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Pas de descriptif stocké. Ouvrez la source officielle pour le détail.
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {detailOffer.sourceUrl ? (
                  <a
                    href={detailOffer.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    Voir l&apos;offre source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => openAiChat(detailOffer)}
                  className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Discuter avec l&apos;IA
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Offres filtrées
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {keyword ? `Mot-clé : ${keyword} · ` : ''}
              {LINKEDIN_GEO[geoKey]?.label} · {LINKEDIN_TIME[timeKey]?.label} ·{' '}
              {SOURCE_FILTERS.find((s) => s.id === sourceKey)?.label}
            </p>
          </div>
          <Link to="/opportunities" className="text-xs font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-400">
            Voir toutes les opportunités →
          </Link>
        </div>

        {loadingVerified || searching ? (
          <p className="flex items-center justify-center gap-2 py-8 text-center text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {searching ? 'Recherche en cours…' : 'Chargement des offres vérifiées…'}
          </p>
        ) : filteredOffers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-700">
            <p className="text-sm text-slate-500">Aucun résultat pour ces filtres.</p>
            <button
              type="button"
              onClick={() => {
                setGeoKey('rdc');
                setTimeKey('all');
                setSourceKey('all');
                runKeywordSearch('logistique');
              }}
              className="mt-2 text-sm font-semibold text-blue-700"
            >
              Réinitialiser (logistique · toute la RDC)
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredOffers.slice(0, 18).map((opp) => (
              <VerifiedOfferCard
                key={offerId(opp)}
                opp={opp}
                aiPick={aiPickById[opp._id]}
                onAskAi={openAiChat}
                onDetails={setDetailOffer}
                onLinkedIn={(title) => openLinkedInSearch(title.split(' ').slice(0, 4).join(' '))}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-blue-700" />
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
              className="group flex flex-col rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400/40 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-xl"
                    aria-hidden
                  >
                    {cat.emoji}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">{cat.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Mot-clé : <span className="font-medium text-slate-600 dark:text-slate-300">{cat.keywords}</span>
                    </p>
                  </div>
                </div>
                {cat.isNew ? (
                  <span className="shrink-0 rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
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
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:text-slate-400"
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
