import { useCallback, useEffect, useRef, useState } from 'react';
import { speechRecognitionLocale } from '../utils/detectSpeechLanguage.js';

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Browser Web Speech API (STT).
 * Click-to-talk friendly: stop() flushes the last interim transcript as final.
 */
export function useSpeechRecognition({ lang = 'fr', onResult, onError } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const lastTextRef = useRef('');
  const emittedFinalRef = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognitionCtor()));
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      onErrorRef.current?.('unsupported');
      return;
    }

    // Stop previous session cleanly
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }

    lastTextRef.current = '';
    emittedFinalRef.current = false;

    const recognition = new Ctor();
    recognition.lang = speechRecognitionLocale(lang);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      console.info('[voice:stt] onstart', { lang: recognition.lang });
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      const text = (finalText || interim).trim();
      if (!text) return;
      lastTextRef.current = text;
      console.info('[voice:stt] onresult', { text, isFinal: Boolean(finalText) });
      if (finalText) {
        emittedFinalRef.current = true;
        onResultRef.current?.(finalText.trim(), true);
      } else {
        onResultRef.current?.(text, false);
      }
    };

    recognition.onerror = (event) => {
      const code = event?.error || 'unknown';
      console.warn('[voice:stt] onerror', code);
      // aborted is normal when user clicks stop — flush handled in onend
      if (code === 'aborted') return;
      onErrorRef.current?.(code);
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      console.info('[voice:stt] onend', {
        last: lastTextRef.current,
        emittedFinal: emittedFinalRef.current
      });
      setListening(false);
      recognitionRef.current = null;
      // If user stopped before a final chunk, still send last interim as final
      if (!emittedFinalRef.current && lastTextRef.current) {
        emittedFinalRef.current = true;
        onResultRef.current?.(lastTextRef.current, true);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[voice:stt] start_failed', e);
      onErrorRef.current?.('start_failed');
      setListening(false);
      recognitionRef.current = null;
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening || recognitionRef.current) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
  }, []);

  return { supported, listening, start, stop, toggle };
}
