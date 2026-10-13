import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { useVoiceMode } from '../../context/VoiceModeContext.jsx';
import VoiceApplyConfirmModal from './VoiceApplyConfirmModal.jsx';

/**
 * Global gate for WRITE actions (applications).
 * Nothing is persisted until the admin clicks Confirmer.
 * Mounted always (even when voice mode is off) so the chat widget can stage applies too.
 */
export default function ApplicationConfirmGate() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pendingApply, clearPendingApply } = useVoiceMode();
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    if (!pendingApply?.offreId) return;
    setBusy(true);
    try {
      // After explicit admin confirmation only — create as draft (safe default).
      // Status changes to "submitted" remain a separate admin action in the UI.
      await api.post('/api/applications', {
        opportunity: pendingApply.offreId,
        status: 'draft',
        notes:
          pendingApply.notes ||
          t('voice.applicationNotes')
      });
      toast.success(t('voice.applicationCreated'));
      clearPendingApply();
      navigate('/applications');
      window.dispatchEvent(new CustomEvent('mecal:applications-updated'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('voice.applicationFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (!pendingApply) return null;

  return (
    <VoiceApplyConfirmModal busy={busy} onConfirm={onConfirm} onCancel={clearPendingApply} />
  );
}
