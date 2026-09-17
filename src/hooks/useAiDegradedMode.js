import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const REAL_AI = new Set(['claude', 'gemini', 'groq', 'openai']);

export function useAiDegradedMode() {
  const [degraded, setDegraded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/ai/status');
      setDegraded(Boolean(data.runtime?.degraded));
    } catch {
      /* ignore */
    }
  }, []);

  const noteProvider = useCallback((provider) => {
    if (provider === 'local') setDegraded(true);
    else if (REAL_AI.has(provider)) setDegraded(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 20000);
    return () => clearInterval(id);
  }, [refresh]);

  return { degraded, setDegraded, refresh, noteProvider };
}
