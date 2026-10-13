import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  BellRing,
  Bot,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Eye,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  Route,
  Boxes,
  BarChart3,
  Globe,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Warehouse,
  X
} from 'lucide-react';
import { api } from '../../api/client.js';
import Dropdown from '../ui/Dropdown.jsx';
import ScoreRing from '../ui/ScoreRing.jsx';
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
import { deadlineUrgency } from '../../utils/opportunityUrgency.js';
import { useUiLocale } from '../../hooks/useUiLocale.js';

const LAST_VISIT_KEY = 'mecal_linkedin_last_visit';
const CATEGORY_VISIT_PREFIX = 'mecal_linkedin_cat_';
const TIP_KEY = 'mecal_linkedin_tip_hidden';
const FOLLOW_KEY = 'mecal_linkedin_followed';
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 12;

const SOURCE_FILTERS = [
  { id: 'all' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reliefweb', label: 'ReliefWeb' },
  { id: 'unjobs', label: 'UNjobs' },
  { id: 'profilrdc', label: 'ProfilRDC' }
];

const TRADE_ICONS = {
  logisticien: Truck,
  'supply-chain': Boxes,
  transport: Route,
  warehouse: Warehouse,
  humanitaire: Globe,
  consultant: BarChart3,
  procurement: ShoppingCart,
  assistant: ClipboardList
};

const LINKEDIN_BLUE = 'bg-[#0A66C2] text-white hover:bg-[#004182]';
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';

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

/** Short mark and colour of the platform an offer comes from. */
function platformMark(opp) {
  const blob = `${opp.platform || ''} ${opp.sourceUrl || ''}`.toLowerCase();
  if (blob.includes('linkedin')) return { text: 'in', tone: 'bg-[#0A66C2] text-white' };
  if (blob.includes('reliefweb')) return { text: 'RW', tone: 'bg-teal-700 text-white' };
  if (/unjobs|unjobnet/.test(blob)) return { text: 'UN', tone: 'bg-indigo-700 text-white' };
  if (blob.includes('profilrdc')) return { text: 'PR', tone: 'bg-orange-600 text-white' };
  const initials = String(opp.platform || opp.organization || '?')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase();
  return { text: initials || '?', tone: 'bg-slate-600 text-white' };
}

const DEADLINE_TONE = {
  critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
  passed: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
  soon: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:ring-orange-900',
  ok: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900',
  none: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
};

function Chip({ tone, icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone}`}>
      {Icon ? <Icon className="h-3 w-3 flex-none" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function Eyebrow({ children }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{children}</p>;
}

function LinkedInMark({ className = '' }) {
  return (
    <span
      className={`grid flex-none place-items-center rounded-xl bg-[#0A66C2] font-black leading-none tracking-tight text-white ${className}`}
      aria-hidden="true"
    >
      in
    </span>
  );
}

/** Deadline, publication date and urgency of one offer, as coloured chips. */
function OfferMeta({ opp, t, dateLocale }) {
  const urgency = deadlineUrgency(opp.deadline);
  const showUrgent = opp.isUrgent || urgency.level === 'critical' || urgency.level === 'soon';
  const raw = opp.postedDate || opp.firstSeenAt || opp.scrapedAt || opp.createdAt;
  const posted = raw && !Number.isNaN(new Date(raw).getTime()) ? new Date(raw).toLocaleDateString(dateLocale) : null;
  const deadlineText = opp.deadline
    ? t('linkedin.deadline', { date: new Date(opp.deadline).toLocaleDateString(dateLocale) })
    : t('linkedin.deadlineUnknown');

  return (
    <>
      {showUrgent ? (
        <span className="inline-flex items-center rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {t('linkedin.urgent')}
        </span>
      ) : null}
      {posted ? (
        <Chip tone="bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          {t('linkedin.published', { date: posted })}
        </Chip>
      ) : null}
      <Chip tone={DEADLINE_TONE[urgency.level] || DEADLINE_TONE.none} icon={CalendarClock}>
        {deadlineText}
      </Chip>
    </>
  );
}

function OfferRow({ opp, aiPick, followed, t, dateLocale, onAskAi, onDetails, onFollow, onLinkedIn }) {
  const isJob = isEmploymentOpportunity(opp);
  const mark = platformMark(opp);
  const score = aiPick?.score;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#24478a]/40 hover:shadow-md md:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex gap-3.5">
        <span
          className={`grid h-11 w-11 flex-none place-items-center rounded-xl text-[13px] font-black tracking-tight ${mark.tone}`}
          aria-hidden="true"
        >
          {mark.text}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{opp.title}</h3>
              <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">{opp.organization || opp.platform}</p>
            </div>
            {score != null ? (
              <span className="flex-none" title={t('linkedin.aiScore', { score })}>
                <ScoreRing value={score} size={40} stroke={4} />
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Chip tone="bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" icon={ShieldCheck}>
              {t('linkedin.verified')}
            </Chip>
            {opp.ville && opp.ville !== 'Non précisé' ? (
              <Chip tone="bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900" icon={MapPin}>
                {opp.ville}
              </Chip>
            ) : null}
            <Chip tone={isJob ? 'bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1] dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-700' : 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'}>
              {isJob ? t('linkedin.jobType') : t('linkedin.missionType')}
            </Chip>
            <OfferMeta opp={opp} t={t} dateLocale={dateLocale} />
          </div>

          {aiPick?.reason ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {aiPick.reason}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAskAi(opp)}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-800 ${FOCUS}`}
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              {t('linkedin.askAi')}
            </button>
            <button
              type="button"
              onClick={() => onDetails(opp)}
              className={`inline-flex items-center rounded-lg border border-[#24478a] bg-white px-3 py-2 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
            >
              {t('linkedin.details')}
            </button>
            <button
              type="button"
              onClick={() => onFollow(opp)}
              aria-pressed={followed}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${FOCUS} ${
                followed
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {followed ? t('linkedin.followed') : t('linkedin.follow')}
            </button>
            {opp.sourceUrl ? (
              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-bold text-[#24478a] hover:underline dark:text-blue-300"
              >
                {t('linkedin.sourceOffer')}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => onLinkedIn(opp.title)}
              className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-bold text-[#0A66C2] hover:underline"
            >
              <Search className="h-3 w-3" aria-hidden="true" />
              {t('linkedin.onLinkedIn')}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function OfferDetailModal({ opp, followed, t, dateLocale, onClose, onAskAi, onFollow }) {
  useEffect(() => {
    if (!opp) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opp, onClose]);

  if (!opp) return null;
  const description = opp.description ? String(opp.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  const mark = platformMark(opp);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label={t('linkedin.close')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="linkedin-detail-title"
        className="relative flex max-h-[min(88vh,680px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 p-5 dark:border-slate-700">
          <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl text-[13px] font-black ${mark.tone}`} aria-hidden="true">
            {mark.text}
          </span>
          <div className="min-w-0 flex-1">
            <Eyebrow>{t('linkedin.detailsTitle')}</Eyebrow>
            <h2 id="linkedin-detail-title" className="mt-1 break-words text-base font-bold leading-snug text-slate-900 dark:text-white">
              {opp.title}
            </h2>
            <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">
              {opp.organization || opp.platform}
              {opp.ville ? ` · ${opp.ville}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('linkedin.close')}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-red-50 text-red-600 transition hover:rotate-90 hover:bg-red-600 hover:text-white dark:bg-red-950/40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <OfferMeta opp={opp} t={t} dateLocale={dateLocale} />
          </div>
          {description ? (
            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300">{description}</p>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
              {t('linkedin.noDescription')}
            </p>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          {opp.sourceUrl ? (
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#24478a] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#1c3a72]"
            >
              {t('linkedin.sourceOffer')}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => onAskAi(opp)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-800"
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            {t('linkedin.askAi')}
          </button>
          <button
            type="button"
            onClick={() => onFollow(opp)}
            aria-pressed={followed}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              followed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            {followed ? t('linkedin.followed') : t('linkedin.follow')}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function LinkedInLogistiqueRDC() {
  const { t, dateLocale } = useUiLocale();
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const didAutoSearch = useRef(false);

  const geoLabel = (key) => (key === 'rdc' ? t('linkedin.geoAll') : LINKEDIN_GEO[key]?.label || key);
  const timeLabel = (key) => t(`linkedin.time.${key}`);
  const sourceLabel = (src) => (src.id === 'all' ? t('linkedin.sourceAll') : src.label);

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
    setVisibleCount(PAGE_SIZE);
  }, [keyword, timeKey, geoKey, sourceKey]);

  const mergedOffers = useMemo(() => {
    const merged = [];
    const seen = new Set();
    for (const opp of [...searchJobs, ...verifiedOffers]) {
      const key = offerId(opp);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(opp);
    }
    return merged;
  }, [verifiedOffers, searchJobs]);

  const filteredOffers = useMemo(
    () =>
      mergedOffers.filter(
        (opp) =>
          offerMatchesKeyword(opp, keyword) &&
          offerMatchesPeriod(opp, timeKey) &&
          offerMatchesCity(opp, geoKey) &&
          offerMatchesSource(opp, sourceKey)
      ),
    [mergedOffers, keyword, timeKey, geoKey, sourceKey]
  );

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
        setAiSummary(data.aiUnavailable ? t('linkedin.aiUnavailable') : data.summary || rankOffersLocally(pool).summary);
      }
    } catch {
      const localRank = rankOffersLocally(filteredOffers);
      setAiSummary(t('linkedin.aiUnavailable'));
      setAiPicks(localRank.picks);
      setAiProvider('local');
      setCloudLocked(false);
    } finally {
      setLoadingAi(false);
    }
  };

  const openAiChat = (offer = null) => {
    setDetailOffer(null);
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
  const visibleOffers = filteredOffers.slice(0, visibleCount);
  const remaining = Math.max(0, filteredOffers.length - visibleCount);
  const jobPct = stats.total ? Math.round((stats.jobs / stats.total) * 100) : 0;
  const currentSource = SOURCE_FILTERS.find((s) => s.id === sourceKey);
  const topPicks = aiPicks.slice(0, 3);
  const cardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';

  return (
    <div className="space-y-6">
      <LinkedInOfferChatModal
        open={chatOpen}
        offer={chatOffer}
        offers={filteredOffers}
        onClose={() => {
          setChatOpen(false);
          setChatOffer(null);
        }}
      />
      <OfferDetailModal
        opp={detailOffer}
        followed={detailOffer ? followed.has(offerId(detailOffer)) : false}
        t={t}
        dateLocale={dateLocale}
        onClose={() => setDetailOffer(null)}
        onAskAi={openAiChat}
        onFollow={toggleFollow}
      />

      {/* Command centre: identity and live overview on top, search and filters below */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="p-5 md:p-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f1fa] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A66C2] dark:bg-slate-800 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0A66C2]" aria-hidden="true" />
              {t('linkedin.eyebrow')}
            </span>
            <div className="mt-4 flex items-start gap-4">
              <LinkedInMark className="h-14 w-14 text-2xl shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-3xl dark:text-white">
                  {t('linkedin.title')}
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t('linkedin.subtitle')}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openAiChat(null)}
                className={`inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-800 ${FOCUS}`}
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                {t('linkedin.aiAdvisor')}
              </button>
              <button
                type="button"
                onClick={() => openUrl(allUrl)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${LINKEDIN_BLUE} ${FOCUS}`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('linkedin.openLinkedIn')}
              </button>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Eyebrow>{t('linkedin.sourcesTracked')}</Eyebrow>
              <ul className="mt-2.5 flex flex-wrap gap-2">
                {[
                  ['in', 'LinkedIn', 'bg-[#0A66C2]'],
                  ['RW', 'ReliefWeb', 'bg-teal-700'],
                  ['UN', 'UNjobs', 'bg-indigo-700'],
                  ['PR', 'ProfilRDC', 'bg-orange-600']
                ].map(([mark, name, tone]) => (
                  <li
                    key={name}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-3 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-lg text-[10px] font-black text-white ${tone}`} aria-hidden="true">
                      {mark}
                    </span>
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="relative overflow-hidden bg-[#24478a] p-5 text-white md:p-7">
            <span className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[28px] border-white/5" aria-hidden="true" />
            <span className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full border-[22px] border-white/5" aria-hidden="true" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">{t('linkedin.overview')}</p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  { icon: ShieldCheck, value: stats.total, label: t('linkedin.statVerified') },
                  { icon: Briefcase, value: stats.jobs, label: t('linkedin.statJobs') },
                  { icon: ClipboardList, value: stats.missions, label: t('linkedin.statMissions') }
                ].map(({ icon: StatIcon, value, label }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-white/10 px-3.5 py-3">
                    <span className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-white text-[#24478a]">
                      <StatIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-extrabold leading-none tabular-nums">{value}</p>
                      <p className="mt-1 text-xs leading-snug text-blue-100">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-3 text-sm font-semibold">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${jobWatch ? 'bg-emerald-300' : 'bg-slate-400'}`} aria-hidden="true" />
                {jobWatch ? t('linkedin.alertsActive') : t('linkedin.alertsInactive')}
              </div>
            </div>
          </aside>
        </div>

        <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-4 md:p-6 dark:border-slate-700 dark:bg-slate-800/40">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              runKeywordSearch();
            }}
          >
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t('linkedin.searchLabel')}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder={t('linkedin.searchPlaceholder')}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <button
              type="submit"
              disabled={searching}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#24478a] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t('linkedin.search')}
            </button>
          </form>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              <Eyebrow>{t('linkedin.period')}</Eyebrow>
              <div className="mt-1.5 flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60">
                {Object.keys(LINKEDIN_TIME).map((key) => (
                  <button
                    key={key}
                    type="button"
                    title={t(`linkedin.timeHint.${key}`)}
                    aria-pressed={timeKey === key}
                    onClick={() => setTimeKey(key)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${FOCUS} ${
                      timeKey === key
                        ? 'bg-[#24478a] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {timeLabel(key)}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-full sm:w-60">
              <Eyebrow>{t('linkedin.city')}</Eyebrow>
              <Dropdown
                className="mt-1.5"
                label={t('linkedin.city')}
                icon={MapPin}
                value={geoKey}
                defaultValue="rdc"
                onChange={setGeoKey}
                options={Object.keys(LINKEDIN_GEO).map((key) => ({ value: key, label: geoLabel(key) }))}
              />
            </div>
            <div>
              <Eyebrow>{t('linkedin.source')}</Eyebrow>
              <div className="mt-1.5 flex flex-wrap gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-700/60">
                {SOURCE_FILTERS.map((src) => (
                  <button
                    key={src.id}
                    type="button"
                    aria-pressed={sourceKey === src.id}
                    onClick={() => setSourceKey(src.id)}
                    className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${FOCUS} ${
                      sourceKey === src.id
                        ? 'bg-[#24478a] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {sourceLabel(src)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Feed of offers */}
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                {t('linkedin.offersTitle')}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {filteredOffers.length}
                </span>
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {keyword ? (
                  <Chip tone="bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    {t('linkedin.keywordChip', { keyword })}
                  </Chip>
                ) : null}
                <Chip tone="bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900" icon={MapPin}>
                  {geoLabel(geoKey)}
                </Chip>
                <Chip tone="bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900" icon={CalendarClock}>
                  {timeLabel(timeKey)}
                </Chip>
                <Chip tone="bg-[#eaf0fb] text-[#1b3a72] ring-[#c9d8f1] dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-700">
                  {sourceLabel(currentSource)}
                </Chip>
              </div>
            </div>
            <Link
              to="/opportunities"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#24478a] hover:underline dark:text-blue-300"
            >
              {t('linkedin.seeAll')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {loadingVerified || searching ? (
            <div className="space-y-3" role="status">
              <p className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {searching ? t('linkedin.searching') : t('linkedin.loadingOffers')}
              </p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
              ))}
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-600 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('linkedin.noResult')}</p>
              <button
                type="button"
                onClick={() => {
                  setGeoKey('rdc');
                  setTimeKey('all');
                  setSourceKey('all');
                  runKeywordSearch('logistique');
                }}
                className="mt-3 rounded-lg border border-[#24478a] px-4 py-2 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:text-blue-200"
              >
                {t('linkedin.reset')}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {visibleOffers.map((opp) => (
                  <OfferRow
                    key={offerId(opp)}
                    opp={opp}
                    aiPick={aiPickById[opp._id]}
                    followed={followed.has(offerId(opp))}
                    t={t}
                    dateLocale={dateLocale}
                    onAskAi={openAiChat}
                    onDetails={setDetailOffer}
                    onFollow={toggleFollow}
                    onLinkedIn={(title) => openLinkedInSearch(title.split(' ').slice(0, 4).join(' '))}
                  />
                ))}
              </div>
              {remaining > 0 ? (
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold text-slate-700 transition hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  {t('linkedin.showMore', { count: Math.min(PAGE_SIZE, remaining) })}
                </button>
              ) : null}
            </>
          )}
        </section>

        {/* Side rail: advice, alerts, tip */}
        <aside className="historique-scroll grid gap-4 md:grid-cols-2 xl:sticky xl:top-2 xl:block xl:max-h-[calc(100vh-7rem)] xl:space-y-4 xl:pr-1">
          <section className={`${cardClass} md:col-span-2 xl:col-span-1`}>
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-violet-700 text-white">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{t('linkedin.adviceTitle')}</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('linkedin.adviceSubtitle')}</p>
              </div>
            </div>

            <p
              className={`mt-3 rounded-xl px-3 py-2 text-xs leading-relaxed ${
                aiProvider === 'local'
                  ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
                  : 'bg-violet-50 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200'
              }`}
            >
              {aiProvider === 'local' ? t('linkedin.degraded') : t('linkedin.rankedVia', { provider: aiProvider })}
            </p>
            {aiSummary ? <p className="mt-3 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300">{aiSummary}</p> : null}

            <button
              type="button"
              onClick={refreshAiRank}
              disabled={loadingAi}
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-700 bg-white px-3 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-700 hover:text-white disabled:opacity-50 dark:bg-slate-900 dark:text-violet-300 ${FOCUS}`}
            >
              {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('linkedin.refreshAi')}
            </button>

            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  {t('linkedin.statsVerified', { count: stats.total })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-[#24478a]" aria-hidden="true" />
                  {t('linkedin.statsJobs', { count: stats.jobs })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                  {t('linkedin.statsMissions', { count: stats.missions })}
                </span>
              </div>
              {stats.total > 0 ? (
                <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                  <div className="bg-[#24478a]" style={{ width: `${jobPct}%` }} />
                  <div className="bg-slate-400" style={{ width: `${100 - jobPct}%` }} />
                </div>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              {topPicks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500 dark:border-slate-600 dark:text-slate-400">
                  {t('linkedin.noPicks')}
                </p>
              ) : null}
              {topPicks.map((pick, i) => {
                const opp = pick.offer;
                const id = offerId(opp || pick);
                const isFollowed = followed.has(id);
                return (
                  <article
                    key={pick.id || i}
                    className="rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/60 dark:bg-slate-800/60"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-violet-700 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[13px] font-bold leading-snug text-slate-900 dark:text-white">{opp?.title || pick.reason}</p>
                        <p className="mt-0.5 break-words text-[11px] text-slate-500 dark:text-slate-400">{opp?.organization || opp?.platform}</p>
                      </div>
                      {pick.score != null ? (
                        <span className="flex-none rounded-md bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {t('linkedin.aiScore', { score: pick.score })}
                        </span>
                      ) : null}
                    </div>
                    {opp && pick.reason && opp.title ? (
                      <p className="mt-2 break-words text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">{pick.reason}</p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <button
                        type="button"
                        onClick={() => opp && toggleFollow(opp)}
                        aria-pressed={isFollowed}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${isFollowed ? 'text-emerald-700 dark:text-emerald-300' : 'text-violet-700 hover:underline dark:text-violet-300'}`}
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        {isFollowed ? t('linkedin.followed') : t('linkedin.follow')}
                      </button>
                      <button
                        type="button"
                        onClick={() => opp && setDetailOffer(opp)}
                        className="text-[11px] font-bold text-[#24478a] hover:underline dark:text-blue-300"
                      >
                        {t('linkedin.details')}
                      </button>
                      {opp?.sourceUrl ? (
                        <a
                          href={opp.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#24478a] hover:underline dark:text-blue-300"
                        >
                          {t('linkedin.sourceOffer')}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className={cardClass}>
            <div className="flex items-start gap-3">
              <span
                className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${
                  jobWatch ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {jobWatch ? <BellRing className="h-5 w-5" aria-hidden="true" /> : <Bell className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold leading-tight text-slate-900 dark:text-white">{t('linkedin.alertsTitle')}</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('linkedin.alertsHint')}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={jobWatch}
              onClick={toggleJobWatch}
              className={`mt-4 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${FOCUS} ${
                jobWatch
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
              }`}
            >
              <span>{jobWatch ? t('linkedin.alertsOn') : t('linkedin.alertsOff')}</span>
              <span
                className={`relative h-6 w-11 flex-none rounded-full transition ${jobWatch ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                aria-hidden="true"
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${jobWatch ? 'left-[1.375rem]' : 'left-0.5'}`} />
              </span>
            </button>
          </section>

          {!tipHidden ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 flex-none text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{t('linkedin.tipTitle')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200">{t('linkedin.tipText')}</p>
                </div>
                <button
                  type="button"
                  onClick={hideTip}
                  className="grid h-7 w-7 flex-none place-items-center rounded-lg text-amber-800 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
                  aria-label={t('linkedin.tipClose')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </section>
          ) : null}
        </aside>
      </div>

      {/* One ready-made LinkedIn search per trade */}
      <section>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <LinkedInMark className="h-6 w-6 rounded-md text-xs" />
            {t('linkedin.tradesTitle')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('linkedin.tradesHint', { city: geoLabel(geoKey), period: timeLabel(timeKey) })}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {grid.map((cat) => {
            const TradeIcon = TRADE_ICONS[cat.id] || Truck;
            return (
              <article
                key={cat.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#0A66C2]/50 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-[#e8f1fa] text-[#0A66C2] dark:bg-slate-800 dark:text-blue-300">
                    <TradeIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {cat.isNew ? (
                    <span className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      {t('linkedin.isNew')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('linkedin.visited')}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 break-words text-sm font-bold leading-snug text-slate-900 dark:text-white">
                  {t(`linkedin.trades.${cat.id}`)}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('linkedin.keywordIs')} : <span className="font-semibold text-slate-700 dark:text-slate-200">{cat.keywords}</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {cat.lastVisit
                    ? t('linkedin.lastVisit', { date: new Date(cat.lastVisit).toLocaleString(dateLocale) })
                    : t('linkedin.neverVisited')}
                </p>

                <button
                  type="button"
                  onClick={() => openUrl(cat.primaryUrl, cat.id)}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${LINKEDIN_BLUE} ${FOCUS}`}
                >
                  {t('linkedin.viewOnLinkedIn')}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </button>

                {cat.altUrls.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cat.altUrls.map((alt) => (
                      <button
                        key={alt.label}
                        type="button"
                        onClick={() => openUrl(alt.url, cat.id)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-[#0A66C2] hover:text-[#0A66C2] dark:border-slate-600 dark:text-slate-300"
                      >
                        {alt.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
