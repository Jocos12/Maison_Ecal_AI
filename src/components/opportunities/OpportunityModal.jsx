import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';
import { api } from '../../api/client.js';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, FileText, HelpCircle, Lightbulb, MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDeadlineLong, formatPostedLong } from '../../utils/opportunityDates.js';
import { deadlineUrgency, scorePercent, urgencyBadgeClass } from '../../utils/opportunityUrgency.js';
import { isGenericKeywordJustification } from '../../utils/scanRelevanceDisplay.js';
import { AgentMarkdown } from '../../utils/agentMarkdown.jsx';
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

  if (!opp) return null;

  const showVerify =
    opp.locationStatus === 'a_verifier' || opp.aiAnalysis?.pays_confirme_rdc === 'a_verifier';
  const urgency = deadlineUrgency(opp.deadline);
  const pct = scorePercent(opp);
  const hasScore = opp.aiAnalysis?.score != null || opp.aiRelevanceScore != null;
  const justification = opp.aiAnalysis?.justification;
  const showJustification = justification && !isGenericKeywordJustification(justification);
  const postedLabel = formatPostedLong(opp, locale, t);
  const deadlineLabel = formatDeadlineLong(opp, locale, t);

  const createApplication = async ({ silent = false } = {}) => {
    try {
      const { data, status } = await api.post('/api/applications', {
        opportunity: opp._id,
        status: 'draft',
        notes: `Candidature brouillon — ${opp.title}`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-slate-100 bg-gradient-to-r from-[#1e3a5f] to-blue-700 px-6 py-5 pr-14 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
            {opp.platform} · {t(`opportunities.${opp.category}`)}
          </p>
          <h2 className="mt-1 text-xl font-bold leading-snug md:text-2xl">{opp.title}</h2>
          {opp.organization ? (
            <p className="mt-2 text-sm text-blue-100/90">{opp.organization}</p>
          ) : null}
        </div>

        <div className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {opp.ville || opp.location || 'RDC'}
            </span>
            {hasScore ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
                {t('opportunities.relevanceForMecal', { pct })}
              </span>
            ) : null}
            {opp.isRecommended ? (
              <span className="rounded-full bg-emerald-600 px-2.5 py-1 font-bold uppercase text-white">
                {t('opportunities.recommended')}
              </span>
            ) : null}
            {showVerify ? (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 font-bold uppercase text-slate-950">
                {t('opportunities.locationToVerify')}
              </span>
            ) : null}
          </div>

          {showJustification ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/30">
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                {t('opportunities.relevanceReason')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {justification}
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {t('opportunities.posted')}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{postedLabel}</p>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                urgency.level === 'critical' || urgency.level === 'passed'
                  ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
                  : urgency.level === 'soon'
                    ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40'
                    : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
              }`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {t('opportunities.deadline')}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{deadlineLabel}</p>
              {urgency.level !== 'none' ? (
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyBadgeClass(urgency.level)}`}>
                  {urgency.level === 'passed'
                    ? t('opportunities.deadlinePassed')
                    : urgency.level === 'critical'
                      ? t('opportunities.daysLeft', { count: urgency.days })
                      : urgency.level === 'soon'
                        ? t('opportunities.closingSoon', { count: urgency.days })
                        : t('opportunities.daysLeft', { count: urgency.days })}
                </span>
              ) : null}
            </div>
          </div>

          {opp.description ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                {t('opportunities.description')}
              </h3>
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                {opp.description.slice(0, 4000)}
              </div>
            </div>
          ) : null}

          {appState ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              {appState === 'exists'
                ? t('opportunities.applicationExists')
                : t('opportunities.applicationCreated')}{' '}
              <Link to="/applications" className="font-semibold underline">
                {t('opportunities.viewApplications')}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            {opp.sourceUrl ? (
              <a
                href={opp.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <ExternalLink className="h-4 w-4" />
                {t('opportunities.external')}
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-2 rounded-lg bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                {t('opportunities.sourceMissing')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowApplyEmail(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {t('applications.applyNow')}
            </button>
            <button
              type="button"
              onClick={() => createApplication()}
              className="rounded-lg border border-blue-400/50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/30"
            >
              {t('opportunities.createApp')}
            </button>
            <button
              type="button"
              onClick={() => generateDoc('letter')}
              disabled={loadingAi}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
            >
              <FileText className="h-4 w-4" />
              {loadingAi && aiKind === 'letter' ? t('agent.thinking') : t('opportunities.letterAi')}
            </button>
            <button
              type="button"
              onClick={() => setShowApplyGuide(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/50 px-4 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50 dark:text-sky-200 dark:hover:bg-sky-900/30"
            >
              <HelpCircle className="h-4 w-4" />
              {t('opportunities.howToApplyButton')}
            </button>
            <button
              type="button"
              onClick={() => setShowAsk(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-900/30"
            >
              <MessageCircle className="h-4 w-4" />
              {t('opportunities.askQuestion')}
            </button>
            <button
              type="button"
              onClick={() => generateDoc('proposal')}
              disabled={loadingAi}
              title={t('opportunities.proposalAiHint')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:text-violet-200 dark:hover:bg-violet-900/30"
            >
              <Lightbulb className="h-4 w-4" />
              {loadingAi && aiKind === 'proposal' ? t('agent.thinking') : t('opportunities.proposalAi')}
            </button>
            <button
              type="button"
              onClick={archive}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('opportunities.archive')}
            </button>
          </div>

          <ApplyGuideSection
            opportunityId={opp._id}
            cached={applyIntel}
            visible={showApplyGuide}
            onIntel={setApplyIntel}
          />

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
        <OpportunityAskChat
          opportunityId={opp._id}
          title={opp.title}
          open={showAsk}
          onClose={() => setShowAsk(false)}
        />
      ) : null}
    </div>
  );
}
