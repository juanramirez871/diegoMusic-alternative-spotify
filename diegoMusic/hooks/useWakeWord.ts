import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useLanguage } from '@/context/LanguageContext';
import {
  detectWakeWord,
  localeToSpeechLang,
  parseVoiceInput,
  type VoiceParseResult,
} from '@/services/voiceCommands';
import {
  getVoiceSessionOwner,
  setVoiceSessionOwner,
  markVoiceSessionStarted,
  isStaleSessionEvent,
  VOICE_IOS_CATEGORY,
} from '@/services/voiceSession';

type WakeMode = 'off' | 'idle' | 'capturing';
interface UseWakeWordOptions {
  enabled: boolean;
  onResult: (result: VoiceParseResult) => void;
  onWake?: () => void;
}

interface UseWakeWordReturn {
  isCapturing: boolean;
  isArmed: boolean;
}

const CAPTURE_TIMEOUT_MS = 6000;
const RESTART_DELAY_MS = 400;

export const useWakeWord = ({ enabled, onResult, onWake }: UseWakeWordOptions): UseWakeWordReturn => {
  const { locale } = useLanguage();
  const [mode, setMode] = useState<WakeMode>('off');

  const modeRef = useRef<WakeMode>('off');
  modeRef.current = mode;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const localeRef = useRef(locale);
  localeRef.current = locale;

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const onWakeRef = useRef(onWake);
  onWakeRef.current = onWake;

  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeHandledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (restartTimer.current) clearTimeout(restartTimer.current);
    if (captureTimer.current) clearTimeout(captureTimer.current);
    restartTimer.current = null;
    captureTimer.current = null;
  }, []);

  const startRecognition = useCallback((nextMode: 'idle' | 'capturing') => {
    wakeHandledRef.current = false;
    markVoiceSessionStarted();
    try {
      setVoiceSessionOwner('wake');
      ExpoSpeechRecognitionModule.start({
        lang: localeToSpeechLang[localeRef.current] ?? 'en-US',
        interimResults: true,
        continuous: nextMode === 'idle',
        requiresOnDeviceRecognition: false,
        iosCategory: VOICE_IOS_CATEGORY,
      } as any);
      setMode(nextMode);
    }
    catch (error) {
      console.warn('[useWakeWord] no se pudo iniciar:', error);
      setMode('off');
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearTimers();
    try {
      if (getVoiceSessionOwner() === 'wake') setVoiceSessionOwner(null);
      ExpoSpeechRecognitionModule.abort?.();
    }
    catch {
      // ignore
    }
  }, [clearTimers]);

  const scheduleRestart = useCallback(
    (nextMode: 'idle') => {
      if (restartTimer.current) clearTimeout(restartTimer.current);
      restartTimer.current = setTimeout(() => {
        if (enabledRef.current && AppState.currentState === 'active' && getVoiceSessionOwner() !== 'manual') {
          startRecognition(nextMode);
        }
        else if (getVoiceSessionOwner() !== 'manual') {
          setMode('off');
        }
      }, RESTART_DELAY_MS);
    },
    [startRecognition],
  );

  useSpeechRecognitionEvent('result', (event) => {

    if (getVoiceSessionOwner() !== 'wake') return;
    const text = event.results[0]?.transcript ?? '';
    if (!text) return;

    if (modeRef.current === 'idle')
    {
      let wake: ReturnType<typeof detectWakeWord> = null;
      for (const alternative of event.results) {
        wake = detectWakeWord(alternative?.transcript ?? '');
        if (wake) break;
      }

      if (wake && !wakeHandledRef.current)
      {
        wakeHandledRef.current = true;
        onWakeRef.current?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

        if (wake.rest) {
          onResultRef.current(parseVoiceInput(wake.rest, localeRef.current));
          stopRecognition();
          scheduleRestart('idle');
        }
        else {
          stopRecognition();
          startRecognition('capturing');
          captureTimer.current = setTimeout(() => {
            stopRecognition();
            scheduleRestart('idle');
          }, CAPTURE_TIMEOUT_MS);
        }
      }
    }
    else if (modeRef.current === 'capturing') {
      if (event.isFinal && text.trim()) {
        if (captureTimer.current) clearTimeout(captureTimer.current);
        onResultRef.current(parseVoiceInput(text, localeRef.current));
        stopRecognition();
        scheduleRestart('idle');
      }
    }
  });

  useSpeechRecognitionEvent('end', () => {
    if (!enabledRef.current) return;
    // Evento rezagado de la sesión que acabamos de abortar al cambiar de modo
    // (o de la que abortó el mic manual al arrancar): ignorarlo.
    if (isStaleSessionEvent()) return;

    if (modeRef.current === 'capturing' && captureTimer.current) {
      // La captura terminó sola (silencio) antes del timeout: limpiamos el
      // timer para que no aborte la sesión idle que vamos a rearmar.
      clearTimeout(captureTimer.current);
      captureTimer.current = null;
    }
    // Rearmamos la escucha del wake word. (También cubre el fin del mic
    // manual: al quedar la sesión libre, el timer la retoma.)
    scheduleRestart('idle');
  });

  useSpeechRecognitionEvent('error', (event) => {
    // Errores transitorios (no-speech, aborted) son normales en escucha
    // continua: simplemente rearmamos. Solo logueamos los relevantes.
    if (getVoiceSessionOwner() === 'wake' && event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('[useWakeWord] error:', event.error, event.message);
    }
    // "aborted" dentro de la ventana de transición = cambio de sesión nuestro
    // o del mic manual: no rearmar (mataríamos la sesión recién iniciada).
    if (event.error === 'aborted' && isStaleSessionEvent()) return;
    if (enabledRef.current) {
      scheduleRestart('idle');
    }
  });

  // --- Ciclo de vida: enabled + AppState ---

  useEffect(() => {
    if (!enabled) {
      stopRecognition();
      setMode('off');
      return;
    }

    // Pedir permisos una vez y arrancar en idle.
    let cancelled = false;
    (async () => {
      try {
        const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (cancelled || !perm.granted) {
          if (!perm.granted) console.warn('[useWakeWord] permisos denegados');
          return;
        }
        if (AppState.currentState === 'active') startRecognition('idle');
      } catch (error) {
        console.warn('[useWakeWord] error al pedir permisos:', error);
      }
    })();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (!enabledRef.current) return;
      if (state === 'active') {
        if (modeRef.current === 'off') startRecognition('idle');
      } else {
        // background/inactive: iOS no permite mic; paramos para ahorrar batería.
        stopRecognition();
        setMode('off');
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
      stopRecognition();
      setMode('off');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    isCapturing: mode === 'capturing',
    isArmed: mode === 'idle',
  };
};
