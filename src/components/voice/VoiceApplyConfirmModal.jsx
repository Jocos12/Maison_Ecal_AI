import { useI18n } from '../../context/I18nContext.jsx';
import { useVoiceMode } from '../../context/VoiceModeContext.jsx';

/**
 * Mandatory confirmation before any real application submission.
 */
export default function VoiceApplyConfirmModal({ onConfirm, onCancel, busy }) {
  const { t } = useI18n();
  const { pendingApply } = useVoiceMode();
  if (!pendingApply) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-apply-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 id="voice-apply-title" className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('voice.confirmTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('voice.confirmBody')}</p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800">
          <p className="font-medium text-slate-900 dark:text-white">
            {pendingApply.title || t('voice.unknownOffer')}
          </p>
          {pendingApply.organization ? (
            <p className="mt-1 text-slate-500">{pendingApply.organization}</p>
          ) : null}
          {pendingApply.ville ? (
            <p className="text-slate-500">{pendingApply.ville}</p>
          ) : null}
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('voice.confirmSafety')}</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('voice.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !pendingApply.offreId}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? t('voice.sending') : t('voice.confirmSend')}
          </button>
        </div>
      </div>
    </div>
  );
}
