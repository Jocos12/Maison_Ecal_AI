import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { prepareTextForSpeech } from '../utils/prepareTextForSpeech.js';

const LS_ENABLED = 'mecal-agent-widget-tts';
const LS_VOICE = 'mecal-agent-tts-voice';
const LS_MODEL = 'mecal-agent-tts-model';

const VOICES = [
  { id: 'nova', labelKey: 'agent.ttsVoiceNova' },
  { id: 'shimmer', labelKey: 'agent.ttsVoiceShimmer' },
  { id: 'onyx', labelKey: 'agent.ttsVoiceOnyx' }
];

const MODELS = [
  { id: 'tts-1', labelKey: 'agent.ttsModelFast' },
  { id: 'tts-1-hd', labelKey: 'agent.ttsModelHd' }
];

function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true';
  } catch {
    return fallback;
  }
}

function readString(key, fallback, allowed) {
  try {
    const v = localStorage.getItem(key);
    if (v && allowed.includes(v)) return v;
  } catch {
    /* ignore */
  }
  return fallback;
}

function speakWithBrowser(text, lang = 'fr') {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('browser_tts_unavailable'));
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'en' ? 'en-US' : 'fr-FR';
    utter.rate = 1.05;
    utter.onend = () => resolve({ via: 'browser' });
    utter.onerror = (e) => reject(e.error || new Error('browser_tts_failed'));
    window.speechSynthesis.speak(utter);
  });
}

/**
 * OpenAI TTS via backend, with browser SpeechSynthesis fallback.
 */
export function useAgentTts() {
  const [enabled, setEnabledState] = useState(() => readBool(LS_ENABLED, false));
  const enabledRef = useRef(false);
  enabledRef.current = enabled;
  const [voice, setVoiceState] = useState(() =>
    readString(LS_VOICE, 'nova', VOICES.map((v) => v.id))
  );
  const [model, setModelState] = useState(() =>
    readString(LS_MODEL, 'tts-1', MODELS.map((m) => m.id))
  );
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [lastVia, setLastVia] = useState(null);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const abortRef = useRef(null);

  const setEnabled = useCallback((value) => {
    const next = Boolean(value);
    setEnabledState(next);
    try {
      localStorage.setItem(LS_ENABLED, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!next) {
      abortRef.current?.abort();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeaking(false);
    }
  }, []);

  const setVoice = useCallback((value) => {
    if (!VOICES.some((v) => v.id === value)) return;
    setVoiceState(value);
    try {
      localStorage.setItem(LS_VOICE, value);
    } catch {
      /* ignore */
    }
  }, []);

  const setModel = useCallback((value) => {
    if (!MODELS.some((m) => m.id === value)) return;
    setModelState(value);
    try {
      localStorage.setItem(LS_MODEL, value);
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (rawText, { force = false, lang = 'fr' } = {}) => {
      if (!enabledRef.current && !force) return;
      const text = prepareTextForSpeech(rawText);
      if (!text) return;

      stop();
      setError(null);
      setSpeaking(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data, headers } = await api.post(
          '/api/tts',
          { text, voice, model },
          { responseType: 'blob', signal: controller.signal, timeout: 60000 }
        );

        if (controller.signal.aborted) return;

        // Backend may return JSON error as blob
        if (data?.type && String(data.type).includes('json')) {
          const msg = await data.text();
          throw new Error(msg || 'tts_json_error');
        }

        const url = URL.createObjectURL(data);
        objectUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        console.info('[voice:tts] playing openai audio', {
          voice: headers?.['x-tts-voice'],
          chars: headers?.['x-tts-chars']
        });

        await new Promise((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('audio_play_failed'));
          const p = audio.play();
          if (p?.catch) p.catch(reject);
        });
        setLastVia('openai');
      } catch (e) {
        if (controller.signal.aborted || e?.code === 'ERR_CANCELED') return;
        let apiMsg = e?.response?.data?.message || e?.message;
        if (e?.response?.data instanceof Blob) {
          try {
            const raw = await e.response.data.text();
            apiMsg = JSON.parse(raw)?.message || apiMsg;
          } catch {
            /* ignore */
          }
        }
        console.warn('[voice:tts] openai failed, fallback browser', apiMsg);
        try {
          await speakWithBrowser(text, lang);
          setLastVia('browser');
          setError(null);
        } catch (e2) {
          const msg = apiMsg || e2?.message || 'tts_failed';
          setError(msg);
          setLastVia(null);
          throw Object.assign(new Error(msg), { cause: e });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setSpeaking(false);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        audioRef.current = null;
      }
    },
    [voice, model, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return {
    enabled,
    setEnabled,
    voice,
    setVoice,
    model,
    setModel,
    speaking,
    error,
    lastVia,
    speak,
    stop,
    voices: VOICES,
    models: MODELS
  };
}
