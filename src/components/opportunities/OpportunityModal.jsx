import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';
import { api } from '../../api/client.js';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Archive,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardPlus,
  Copy,
  ExternalLink,
  FileText,
  HelpCircle,
  Lightbulb,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  X
} from 'lucide-react';
import { SourceGlyph } from '../../utils/sourceIcons.jsx';
import { platformPillClass } from '../../utils/opportunityUi.js';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDeadlineLong, formatPostedLong } from '../../utils/opportunityDates.js';
import { deadlineUrgency, scorePercent, urgencyBadgeClass } from '../../utils/opportunityUrgency.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';
import DualScorePanel from './DualScorePanel.jsx';
import ApplyEmailPreviewModal from './ApplyEmailPreviewModal.jsx';
import ApplyGuideSection from './ApplyGuideSection.jsx';
import OpportunityAskChat from './OpportunityAskChat.jsx';
import { stripMarkdown } from '../../utils/stripMarkdown.js';

export default function OpportunityModal({ opp, onClose, onCreated }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const [aiDoc, setAiDoc] = useState('');
  const [aiKind, setAiKind] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [appState, setAppState] = useState(null);
  const [showApplyEmail, setShowApplyEmail] = useState(false);
  const [showApplyGuide, setShowApplyGuide] = useState(false);
  const [applyIntel, setApplyIntel] = useState(opp?.applyIntel || null);
  const [showAsk, setShowAsk] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !showApplyEmail && !showAsk) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, showApplyEmail, showAsk]);

  if (!opp) return null;

  const showVerify =
    opp.locationStatus === 'a_verifier' || opp.aiAnalysis?.pays_confirme_rdc === 'a_verifier';
  const urgency = deadlineUrgency(opp.deadline);
  const pct = scorePercent(opp);
  const hasScore = opp.aiAnalysis?.score != null || opp.aiRelevanceScore != null;
  const postedLabel = formatPostedLong(opp, locale, t);
  const deadlineLabel = formatDeadlineLong(opp, locale, t);

  const createApplication = async ({ silent = false } = {}) => {
    try {
      const { data, status } = await api.post('/api/applications', {
        opportunity: opp._id,
        status: 'draft',
        notes: `Candidature brouillon : ${opp.title}`
      });
      const existed = data?.alreadyExisted || status === 200;
      setAppState(existed ? 'exists' : 'created');
      toast.success(
        existed ? t('opportunities.applicationExists') : t('opportunities.applicationCreated')
      );
      onCreated?.();
      if (!silent) return data;
      return data;
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.applicationError'));
      return null;
    }
  };

  const archive = async () => {
    try {
      await api.patch(`/api/opportunities/${opp._id}/archive`);
      toast.success(t('opportunities.archivedOk'));
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const generateDoc = async (type) => {
    setLoadingAi(true);
    setAiKind(type);
    try {
      const { data } = await api.post(`/api/ai/opportunities/${opp._id}/${type}`);
      const raw = data.letter || data.proposal || '';
      setAiDoc(type === 'letter' ? stripMarkdown(raw) : raw);
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.aiGenerateError'));
    } finally {
      setLoadingAi(false);
    }
  };

  const copyAi = async () => {
    try {
      await navigator.clipboard.writeText(aiDoc);
      toast.success(t('opportunities.copied'));
    } catch {
      toast.error(t('opportunities.copyError'));
    }
  };

  const timeTone =
    urgency.level === 'critical' || urgency.level === 'passed'
      ? { box: 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40', tile: 'bg-red-600 text-white', label: 'text-red-700 dark:text-red-300' }
      : urgency.level === 'soon'
        ? { box: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40', tile: 'bg-orange-500 text-white', label: 'text-orange-700 dark:text-orange-300' }
        : urgency.level === 'none'
          ? { box: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60', tile: 'bg-slate-500 text-white', label: 'text-slate-600 dark:text-slate-300' }
          : { box: 'border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40', tile: 'bg-indigo-600 text-white', label: 'text-indigo-700 dark:text-indigo-300' };
  const place = opp.ville && opp.ville !== 'Non précisé' ? opp.ville : '';
  const locationText = [opp.location, place].filter(Boolean).filter((v, i, all) => all.findIndex((x) => x.toLowerCase().includes(v.toLowerCase())) === i).join(', ') || 'RDC';
  const deadlineBadge =
    urgency.level === 'none'
      ? null
      : urgency.level === 'passed'
        ? t('opportunities.deadlinePassed')
        : urgency.level === 'soon'
          ? t('opportunities.closingSoon', { count: urgency.days })
          : t('opportunities.daysLeft', { count: urgency.days });
  const toolButton =
    'inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ring-1 transition focus:outline-none focus-visible:ring-2 disabled:opacity-60';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0e1c33]/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-modal-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
      >
        <header className="relative flex-none bg-[#24478a] px-6 pb-6 pt-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('notifications.close')}
            title={t('notifications.close')}
            className="mecal-x-pop group absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/30 ring-2 ring-white/80 transition duration-300 hover:rotate-90 hover:scale-110 hover:bg-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-95"
          >
            <span className="absolute inset-0 rounded-full bg-red-400 opacity-0 group-hover:animate-ping" aria-hidden="true" />
            <X className="relative h-5 w-5" strokeWidth={2.6} />
          </button>
          <div className="flex items-start gap-4 pr-12">
            <span
              className={`grid h-14 w-14 flex-none place-items-center rounded-2xl shadow-md ring-2 ${platformPillClass(opp.platform)}`}
              title={opp.platform}
            >
              <SourceGlyph source={opp.platform} platform={opp.platform} className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-200">
                {opp.platform} · {t(`opportunities.${opp.category}`)}
              </p>
              <h2 id="opportunity-modal-title" className="mt-1.5 text-xl font-bold leading-snug md:text-2xl">
                {opp.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-blue-100">
                {opp.organization ? (
                  <span className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 flex-none" aria-hidden="true" />
                    {opp.organization}
                  </span>
                ) : null}
                {place || opp.location ? (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 flex-none" aria-hidden="true" />
                    {place || opp.location}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-teal-600 text-white">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">
                  {t('opportunities.filters.city')}
                </p>
              </div>
              <p className="mt-2.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">{locationText}</p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-600 text-white">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                  {t('opportunities.posted')}
                </p>
              </div>
              <p className="mt-2.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">{postedLabel}</p>
            </div>

            <div className={`rounded-2xl border p-4 ${timeTone.box}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${timeTone.tile}`}>
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${timeTone.label}`}>
                  {t('opportunities.deadline')}
                </p>
              </div>
              <p className="mt-2.5 text-sm font-bold leading-snug text-slate-900 dark:text-white">{deadlineLabel}</p>
              {deadlineBadge ? (
                <span className={`mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${urgencyBadgeClass(urgency.level)}`}>
                  {deadlineBadge}
                </span>
              ) : null}
            </div>

          </div>

          <DualScorePanel opp={opp} pct={pct} hasScore={hasScore} />

          {opp.isRecommended || showVerify ? (
            <div className="flex flex-wrap items-center gap-2">
              {opp.isRecommended ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  {t('opportunities.recommended')}
                </span>
              ) : null}
              {showVerify ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  {t('opportunities.locationToVerifyHint')}
                </span>
              ) : null}
            </div>
          ) : null}

          {opp.description ? (
            <section>
              <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <FileText className="h-4 w-4" aria-hidden="true" />
                {t('opportunities.description')}
              </h3>
              <div className="whitespace-pre-line rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[15px] leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                {opp.description.slice(0, 4000)}
              </div>
            </section>
          ) : null}

          {appState ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-5 w-5 flex-none text-emerald-600" aria-hidden="true" />
              <span>
                {appState === 'exists' ? t('opportunities.applicationExists') : t('opportunities.applicationCreated')}{' '}
                <Link to="/applications" className="font-bold underline">
                  {t('opportunities.viewApplications')}
                </Link>
              </span>
            </div>
          ) : null}

          <ApplyGuideSection opportunityId={opp._id} cached={applyIntel} visible={showApplyGuide} onIntel={setApplyIntel} />

          {aiKind === 'proposal' && !aiDoc && !loadingAi ? (
            <p className="text-xs text-slate-500">{t('opportunities.proposalAiHint')}</p>
          ) : null}

          {aiDoc ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {aiKind === 'proposal' ? t('opportunities.proposalAi') : t('opportunities.letterAi')}
                </h3>
                <button
                  type="button"
                  onClick={copyAi}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t('opportunities.copy')}
                </button>
              </div>
              <div className="max-h-[28rem] overflow-y-auto rounded-xl bg-white p-4 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                {aiKind === 'letter' ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{aiDoc}</pre>
                ) : (
                  <AgentMarkdown text={aiDoc} />
                )}
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex-none space-y-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-950/60">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
            <span className="mr-1 hidden flex-none text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:inline">
              {t('opportunities.aiTools')}
            </span>
            <button
              type="button"
              onClick={() => generateDoc('letter')}
              disabled={loadingAi}
              className={`${toolButton} bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900`}
            >
              <FileText className="h-3.5 w-3.5" />
              {loadingAi && aiKind === 'letter' ? t('agent.thinking') : t('opportunities.letterAi')}
            </button>
            <button
              type="button"
              onClick={() => setShowApplyGuide(true)}
              className={`${toolButton} bg-sky-50 text-sky-800 ring-sky-200 hover:bg-sky-100 focus-visible:ring-sky-500 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {t('opportunities.howToApplyButton')}
            </button>
            <button
              type="button"
              onClick={() => setShowAsk(true)}
              className={`${toolButton} bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100 focus-visible:ring-amber-500 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {t('opportunities.askQuestion')}
            </button>
            <button
              type="button"
              onClick={() => generateDoc('proposal')}
              disabled={loadingAi}
              title={t('opportunities.proposalAiHint')}
              className={`${toolButton} bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100 focus-visible:ring-violet-500 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {loadingAi && aiKind === 'proposal' ? t('agent.thinking') : t('opportunities.proposalAi')}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={archive}
              aria-label={t('opportunities.archive')}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:text-slate-400 dark:hover:bg-red-950/40"
            >
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">{t('opportunities.archive')}</span>
            </button>
            <div className="ml-auto flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
              {opp.sourceUrl ? (
                <a
                  href={opp.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 sm:flex-none sm:px-4 transition hover:border-[#24478a] hover:text-[#24478a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('opportunities.external')}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500"
                >
                  {t('opportunities.sourceMissing')}
                </button>
              )}
              <button
                type="button"
                onClick={() => createApplication()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#24478a] bg-white px-3 py-2.5 text-sm font-bold text-[#24478a] sm:flex-none sm:px-4 transition hover:bg-[#e3ebf9] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 dark:bg-slate-800 dark:text-blue-200"
              >
                <ClipboardPlus className="h-4 w-4" />
                {t('opportunities.createApp')}
              </button>
              <button
                type="button"
                onClick={() => setShowApplyEmail(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm sm:w-auto transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30"
              >
                <Send className="h-4 w-4" />
                {t('applications.applyNow')}
              </button>
            </div>
          </div>
        </footer>
      </div>
      {showApplyEmail ? (
        <ApplyEmailPreviewModal
          opportunityId={opp._id}
          onClose={() => setShowApplyEmail(false)}
          onSent={() => {
            setAppState('created');
            onCreated?.();
          }}
        />
      ) : null}
      {showAsk ? (
        <OpportunityAskChat opportunityId={opp._id} title={opp.title} open={showAsk} onClose={() => setShowAsk(false)} />
      ) : null}
    </div>
  );
}
