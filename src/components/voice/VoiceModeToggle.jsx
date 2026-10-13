import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVoiceMode } from '../../context/VoiceModeContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

/**
 * Header voice toggle.
 * OFF → ON (+ start listen)
 * ON + listening → stop listen (mode stays ON)
 * ON + idle/speaking → OFF (stops all listening / clears banner)
 */
export default function VoiceModeToggle() {
  const { t } = useI18n();
  const { enabled, setEnabled, status } = useVoiceMode();

  const onClick = () => {
    if (!enabled) {
      setEnabled(true);
      toast.success(t('voice.modeOnToast'), { duration: 3500 });
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('mecal:voice-listen-start'));
      }, 150);
      return;
    }

    if (status === 'listening' || status === 'processing' || status === 'speaking') {
      window.dispatchEvent(new CustomEvent('mecal:voice-listen-stop'));
      return;
    }

    // Mode on but idle / paused → turn completely OFF
    setEnabled(false);
    toast(t('voice.modeOff'), { icon: '🔇' });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-md p-2 transition ${
        enabled
          ? 'bg-blue-600 text-white hover:bg-blue-500'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
      title={enabled ? t('voice.modeOnTitle') : t('voice.modeOff')}
      aria-pressed={enabled}
      aria-label={enabled ? t('voice.modeOnTitle') : t('voice.modeOff')}
    >
      {enabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      {enabled ? (
        <span
          className={`absolute right-1 top-1 h-2 w-2 rounded-full ${
            status === 'listening' || status === 'processing'
              ? 'bg-rose-400 animate-ping'
              : 'bg-emerald-400'
          }`}
          aria-hidden
        />
      ) : null}
    </button>
  );
}
