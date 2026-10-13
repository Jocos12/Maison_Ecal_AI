import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { useVoiceMode } from '../../context/VoiceModeContext.jsx';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { useAgentTts } from '../../hooks/useAgentTts.js';
import { detectSpeechLanguage } from '../../utils/detectSpeechLanguage.js';
import { planVoiceToolExecution } from '../../utils/voiceToolExecutor.js';
import { filterSourcesOpportunities, isDeadlineActive } from '../../utils/sourcesFilterUtils.js';

/**
 * Global voice controller — continuous conversation while mode is ON.
 * After each agent reply, listening restarts automatically until the user pauses (FAB)
 * or turns voice mode off (header toggle).
 */
export default function VoiceModeListener() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const {
    enabled,
    status,
    setStatus,
    setLastTranscript,
    lastTranscript,
    pendingApply,
    setPendingApply
  } = useVoiceMode();

  const [speechLang, setSpeechLang] = useState(lang === 'en' ? 'en' : 'fr');
  const [replyText, setReplyText] = useState('');
  const [paused, setPaused] = useState(false);
  const [showStatusChip, setShowStatusChip] = useState(false);
  const processingRef = useRef(false);
  const enabledRef = useRef(enabled);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const startListenRef = useRef(() => {});
  const tts = useAgentTts();

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!enabled) {
      setShowStatusChip(false);
      setReplyText('');
      return undefined;
    }
    const live = ['listening', 'processing', 'speaking'].includes(status);
    if (live) {
      setShowStatusChip(true);
      return undefined;
    }
    if (!showStatusChip) return undefined;
    const timer = window.setTimeout(() => setShowStatusChip(false), 2800);
    return () => window.clearTimeout(timer);
  }, [enabled, status, showStatusChip]);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      window.clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  /** Re-open the mic after a turn so the user can keep talking. */
  const scheduleResumeListen = useCallback(
    (delayMs = 450) => {
      clearResumeTimer();
      if (!enabledRef.current || pausedRef.current) return;
      resumeTimerRef.current = window.setTimeout(() => {
        resumeTimerRef.current = null;
        if (!enabledRef.current || pausedRef.current || processingRef.current) return;
        startListenRef.current({ silent: true });
      }, delayMs);
    },
    [clearResumeTimer]
  );

  const resolveOfferForApply = useCallback(async (effect) => {
    const { data } = await api.get('/api/opportunities', { params: { limit: 200 } });
    const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    if (effect.offreId) {
      const found = items.find((o) => String(o._id) === String(effect.offreId));
      if (found) return found;
      try {
        const one = await api.get(`/api/opportunities/${effect.offreId}`);
        return one.data;
      } catch {
        return null;
      }
    }
    const active = items.filter(isDeadlineActive);
    const ranked = filterSourcesOpportunities(active.length ? active : items, {
      mecalFitOnly: true,
      deadlineActive: true
    });
    const list = ranked.length ? ranked : items;
    if (effect.offerIndex != null && list[effect.offerIndex]) return list[effect.offerIndex];
    return list[0] || null;
  }, []);

  const runEffects = useCallback(
    async (effects, meta = {}) => {
      for (const effect of effects) {
        if (effect.type === 'navigate') {
          console.info('[voice:tool] navigate', effect.path);
          navigate(effect.path);
          continue;
        }
        if (effect.type === 'prepare_application') {
          if (meta?.createdApplication) {
            toast.success(
              meta.createdApplication.alreadyExisted
                ? t('opportunities.applicationExists')
                : t('opportunities.applicationCreated')
            );
            navigate('/applications');
            window.dispatchEvent(new CustomEvent('mecal:applications-updated'));
            continue;
          }
          const offer = await resolveOfferForApply(effect);
          if (!offer) {
            toast.error(t('voice.offerNotFound'));
            continue;
          }
          console.info('[voice:tool] preparerCandidature', offer._id);
          setPendingApply({
            offreId: offer._id,
            title: offer.title,
            organization: offer.organization || offer.platform,
            ville: offer.ville || offer.city || 'RDC',
            awaitConfirmation: true
          });
          navigate(`/opportunities?id=${offer._id}`);
        }
      }
    },
    [navigate, resolveOfferForApply, setPendingApply, t]
  );

  const handleCommand = useCallback(
    async (transcript) => {
      const text = String(transcript || '').trim();
      if (!text || processingRef.current) return;
      processingRef.current = true;
      clearResumeTimer();
      setStatus('processing');
      setLastTranscript(text);
      setReplyText('');

      const locale = detectSpeechLanguage(text, lang);
      setSpeechLang(locale);
      console.info('[voice:cmd] sending', { text, locale });

      const yes = /^(oui|ok|yes|yep|je confirme|confirm(e|er)?|go)$/i.test(text);
      if (pendingApply?.offreId && yes) {
        const msg = t('voice.sayClickConfirm');
        setReplyText(msg);
        try {
          await tts.speak(msg, { force: true, lang: locale });
        } catch {
          /* fallback handled inside speak */
        }
        setStatus('idle');
        processingRef.current = false;
        scheduleResumeListen();
        return;
      }

      try {
        const { data } = await api.post('/api/voice/command', { text, locale });
        console.info('[voice:cmd] response', data);
        const effects = planVoiceToolExecution(data.actions || []);
        await runEffects(effects, data);
        const reply = data.reply || t('voice.commandDone');
        setReplyText(reply);
        setStatus('speaking');
        try {
          await tts.speak(reply, { force: true, lang: locale });
        } catch (e) {
          toast.error(t('voice.ttsFailed'));
          console.warn('[voice:tts] speak failed', e);
        }
      } catch (e) {
        console.error('[voice:cmd] error', e);
        const msg = e.response?.data?.message || t('voice.commandError');
        setReplyText(msg);
        toast.error(msg);
      } finally {
        setStatus('idle');
        processingRef.current = false;
        // Keep the conversation open — reopen mic for the next turn
        scheduleResumeListen();
      }
    },
    [
      clearResumeTimer,
      lang,
      pendingApply,
      runEffects,
      scheduleResumeListen,
      setLastTranscript,
      setStatus,
      t,
      tts
    ]
  );

  const onResult = useCallback(
    (text, isFinal) => {
      setLastTranscript(text);
      if (isFinal) {
        setStatus('processing');
        handleCommand(text);
      }
    },
    [handleCommand, setLastTranscript, setStatus]
  );

  const onError = useCallback(
    (code) => {
      console.warn('[voice] mic error', code);
      if (code === 'not-allowed' || code === 'audio-capture') {
        setStatus('idle');
        toast.error(t('voice.micDenied'));
        return;
      }
      if (code === 'unsupported' || code === 'start_failed') {
        setStatus('idle');
        toast.error(t('voice.micUnsupported'));
        return;
      }
      // no-speech / network / etc. — keep conversation alive
      setStatus('idle');
      if (code === 'no-speech' && enabledRef.current && !pausedRef.current) {
        scheduleResumeListen(600);
        return;
      }
      if (enabledRef.current && !pausedRef.current) {
        scheduleResumeListen(800);
      }
    },
    [scheduleResumeListen, setStatus, t]
  );

  const speech = useSpeechRecognition({
    lang: speechLang,
    onResult,
    onError
  });

  const startListen = useCallback(
    ({ silent = false } = {}) => {
      if (!enabledRef.current || pausedRef.current) return;
      if (!speech.supported) {
        toast.error(t('voice.micUnsupported'));
        return;
      }
      if (processingRef.current) return;
      clearResumeTimer();
      tts.stop();
      setStatus('listening');
      speech.start();
      if (!silent) {
        toast(t('voice.listeningHint'), { icon: '🎙️', duration: 1800 });
      }
    },
    [clearResumeTimer, speech, setStatus, t, tts]
  );

  startListenRef.current = startListen;

  const pauseConversation = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
    clearResumeTimer();
    speech.stop();
    tts.stop();
    setStatus('idle');
  }, [clearResumeTimer, speech, setStatus, tts]);

  const resumeConversation = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    startListen({ silent: false });
  }, [startListen]);

  // Header can request start/stop listen
  useEffect(() => {
    if (!enabled) return undefined;
    const onStart = () => {
      pausedRef.current = false;
      setPaused(false);
      startListen({ silent: false });
    };
    const onStop = () => {
      // Soft pause from header while mode stays on (toggle click while listening)
      pauseConversation();
    };
    window.addEventListener('mecal:voice-listen-start', onStart);
    window.addEventListener('mecal:voice-listen-stop', onStop);
    return () => {
      window.removeEventListener('mecal:voice-listen-start', onStart);
      window.removeEventListener('mecal:voice-listen-stop', onStop);
    };
  }, [enabled, pauseConversation, startListen]);

  // Cleanup when voice mode turns off
  useEffect(() => {
    if (enabled) return undefined;
    clearResumeTimer();
    pausedRef.current = false;
    setPaused(false);
    speech.stop();
    tts.stop();
    setStatus('idle');
    setReplyText('');
    setLastTranscript('');
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(
    () => () => {
      clearResumeTimer();
    },
    [clearResumeTimer]
  );

  if (!enabled) return null;

  const listening = speech.listening || status === 'listening';
  const chipLabel = paused
    ? t('voice.statusPaused')
    : listening
      ? t('voice.statusListening')
      : status === 'processing'
        ? t('voice.statusProcessing')
        : status === 'speaking'
          ? t('voice.statusSpeaking')
          : t('voice.statusReady');

  return (
    <>
      {showStatusChip ? (
        <div className="pointer-events-none fixed bottom-24 right-6 z-40 max-w-xs md:right-8">
          <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{chipLabel}</p>
            {lastTranscript ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                <span className="font-medium text-slate-600 dark:text-slate-300">{t('voice.youSaid')} </span>
                {lastTranscript}
              </p>
            ) : null}
            {replyText ? (
              <p className="mt-1 line-clamp-3 text-xs text-blue-700 dark:text-blue-300">
                <span className="font-medium">{t('voice.agentSaid')} </span>
                {replyText}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (listening || status === 'listening' || status === 'speaking' || status === 'processing') {
            pauseConversation();
            return;
          }
          if (paused) {
            resumeConversation();
            return;
          }
          startListen({ silent: false });
        }}
        className={`fixed bottom-6 right-[5.75rem] z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all ${
          listening
            ? 'animate-pulse bg-rose-500 text-white'
            : status === 'processing' || status === 'speaking'
              ? 'bg-amber-500 text-white'
              : paused
                ? 'bg-slate-500 text-white hover:bg-slate-400'
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:scale-105'
        }`}
        title={
          listening || status === 'speaking' || status === 'processing'
            ? t('voice.clickToPause')
            : paused
              ? t('voice.clickToResume')
              : t('voice.clickToTalk')
        }
        aria-label={
          listening || status === 'speaking' || status === 'processing'
            ? t('voice.clickToPause')
            : paused
              ? t('voice.clickToResume')
              : t('voice.clickToTalk')
        }
      >
        {listening || status === 'speaking' || status === 'processing' ? (
          <Square className="h-5 w-5 fill-current" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
        {!paused ? (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
        ) : null}
      </button>
    </>
  );
}
