import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';

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
  const [pendingApply, setPendingApply] = useState(null);
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
      setPendingApply(null);
      setLastTranscript('');
      try {
        window.dispatchEvent(new CustomEvent('mecal:voice-listen-stop'));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const clearPendingApply = useCallback(() => setPendingApply(null), []);

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
