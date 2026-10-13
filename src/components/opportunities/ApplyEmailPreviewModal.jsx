import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Send, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { stripMarkdown } from '../../utils/stripMarkdown.js';

export default function ApplyEmailPreviewModal({ opportunityId, onClose, onSent }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post('/api/applications/preview-email', { opportunityId });
        if (cancelled) return;
        setPreview(data);
        setTo(data.to || '');
        setSubject(data.subject || '');
        setBody(stripMarkdown(data.body || ''));
      } catch (e) {
        toast.error(e.response?.data?.message || t('opportunities.aiGenerateError'));
        onClose();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opportunityId, onClose, t]);

  const canSend =
    Boolean(to.includes('@')) &&
    Boolean(body.trim()) &&
    preview?.hasCv &&
    preview?.gmailConnected &&
    !sending;

  const confirmSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      await api.post('/api/applications/send-email', {
        opportunityId,
        confirmed: true,
        to,
        subject,
        body
      });
      toast.success(t('applications.sentOk'));
      onSent?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || t('applications.statusError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between bg-[#24478a] px-5 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">
              {t('applications.emailPreviewTitle')}
            </p>
            <p className="mt-1 text-xs text-blue-100/80">{t('applications.manualSendHint')}</p>
            <h2 className="mt-1 text-lg font-bold">{preview?.title || '…'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-slate-500">{t('common.loading')}</p>
          ) : (
            <>
              {!preview?.to ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  {t('applications.emailNoContact')}
                </p>
              ) : null}
              {!preview?.hasCv ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t('applications.emailNoCv')}</p>
              ) : null}
              {!preview?.gmailConnected ? (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t('applications.emailGmailOff')}</p>
              ) : (
                <p className="text-xs text-slate-500">Gmail : {preview.gmailUser}</p>
              )}

              <label className="block text-xs font-semibold uppercase text-slate-500">
                {t('applications.emailTo')}
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                {t('applications.emailSubject')}
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </label>
              <p className="text-xs text-slate-500">
                {t('applications.emailAttachment')}: <strong>{preview?.attachmentName || t('dashboard.marketNoData')}</strong>
              </p>
              <label className="block text-xs font-semibold uppercase text-slate-500">
                {t('applications.emailBody')}
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={14}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-sans text-sm leading-relaxed dark:border-slate-600 dark:bg-slate-950"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={confirmSend}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {sending ? t('applications.sending') : t('applications.confirmSend')}
          </button>
        </div>
      </div>
    </div>
  );
}
