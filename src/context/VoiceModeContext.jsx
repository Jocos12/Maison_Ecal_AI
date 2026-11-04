import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import { announceAgentConfirmation } from '../utils/businessNotifications.js';

const LS_KEY = 'mecal-voice-mode-enabled';

const VoiceModeContext = createContext({
  enabled: false,
  setEnabled: () => {},
  pendingApply: null,
  setPendingApply: () => {},
  clearPendingApply: () => {},
  lastTranscript: '',
  setLastTranscript: () => {},
  status: 'idle',
  setStatus: () => {}
});

function readEnabled() {
  try {
    return localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false;
  }
}

export function VoiceModeProvider({ children }) {
  const [enabled, setEnabledState] = useState(readEnabled);
  const [pendingApply, setPendingApplyState] = useState(null);
  const [lastTranscript, setLastTranscript] = useState('');
  /** idle | listening | processing | speaking */
  const [status, setStatus] = useState('idle');

  const setEnabled = useCallback((value) => {
    const next = Boolean(value);
    setEnabledState(next);
    try {
      localStorage.setItem(LS_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!next) {
      setStatus('idle');
      setPendingApplyState(null);
      setLastTranscript('');
      try {
        window.dispatchEvent(new CustomEvent('mecal:voice-listen-stop'));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const setPendingApply = useCallback((payload) => {
    setPendingApplyState(payload);
    if (payload?.offreId && !payload.silent) announceAgentConfirmation(payload);
  }, []);

  const clearPendingApply = useCallback(() => {
    setPendingApplyState(null);
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      setEnabled,
      pendingApply,
      setPendingApply,
      clearPendingApply,
      lastTranscript,
      setLastTranscript,
      status,
      setStatus
    }),
    [
      enabled,
      setEnabled,
      pendingApply,
      setPendingApply,
      clearPendingApply,
      lastTranscript,
      status
    ]
  );

  return <VoiceModeContext.Provider value={value}>{children}</VoiceModeContext.Provider>;
}

export function useVoiceMode() {
  return useContext(VoiceModeContext);
}
