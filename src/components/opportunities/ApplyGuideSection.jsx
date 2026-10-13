import { useEffect, useState } from 'react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';

function methodLabel(method, t) {
  if (method === 'email') return t('opportunities.applyMethodEmail');
  if (method === 'portal') return t('opportunities.applyMethodPortal');
  if (method === 'pdf') return t('opportunities.applyMethodPdf');
  return t('opportunities.applyMethodUnknown');
}

function hasGuide(intel) {
  return Boolean(intel && (intel.analyzedAt || intel.instructions || intel.method));
}

export default function ApplyGuideSection({ opportunityId, cached, visible, onIntel }) {
  const { t } = useI18n();
  const [intel, setIntel] = useState(hasGuide(cached) ? cached : null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (refresh = false) => {
    if (!opportunityId) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await api.get(`/api/opportunities/${opportunityId}/apply-guide`, {
        params: refresh ? { refresh: '1' } : {}
      });
      setIntel(data);
      onIntel?.(data);
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.applyGuideError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!visible || !opportunityId) return;
    if (hasGuide(intel)) return;
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, opportunityId]);

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('opportunities.howToApply')}
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t('opportunities.howToApplyHint')}</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1 text-[11px] font-semibold text-blue-800 disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {t('opportunities.refreshApplyGuide')}
        </button>
      </div>

      {loading && !intel ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('opportunities.applyGuideLoading')}
        </p>
      ) : intel ? (
        <div className="space-y-3 text-sm text-slate-800 dark:text-slate-100">
          <p className="rounded-lg bg-white/80 px-3 py-2 text-xs font-medium dark:bg-slate-900/70">
            {intel.sourceLabel}
          </p>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {methodLabel(intel.method, t)}
          </p>
          {intel.emails?.length ? (
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500">{t('opportunities.applyEmails')}</p>
              <ul className="mt-1 space-y-0.5">
                {intel.emails.map((email) => (
                  <li key={email} className="font-medium">
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-200">{t('opportunities.applyNoEmail')}</p>
          )}
          {intel.contactName ? (
            <p className="text-xs">
              {t('opportunities.applyContact')}: <strong>{intel.contactName}</strong>
            </p>
          ) : null}
          {intel.suggestedSubject && intel.method === 'email' ? (
            <p className="text-xs">
              {t('opportunities.applySubject')}: <strong>{intel.suggestedSubject}</strong>
            </p>
          ) : null}
          {intel.requiredDocuments?.length ? (
            <p className="text-xs">
              {t('opportunities.applyDocs')}: {intel.requiredDocuments.join(', ')}
            </p>
          ) : null}
          {intel.portalUrl ? (
            <a
              href={intel.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('opportunities.applyPortalLink')}
            </a>
          ) : null}
          {intel.pdfLinks?.length ? (
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-500">{t('opportunities.applyPdfs')}</p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{t('opportunities.applyPdfHint')}</p>
              <ul className="mt-1 space-y-1">
                {intel.pdfLinks.map((p) => (
                  <li key={p.url}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 underline">
                      {p.label || p.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {intel.refetchError ? (
            <p className="text-xs text-rose-700">
              {t('opportunities.applyRefetchError')}: {intel.refetchError}
            </p>
          ) : null}
          {intel.instructions ? (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t('opportunities.applySteps')}
              </h4>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{intel.instructions}</p>
            </div>
          ) : null}
          {intel.strategy ? (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t('opportunities.applyStrategy')}
              </h4>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{intel.strategy}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
