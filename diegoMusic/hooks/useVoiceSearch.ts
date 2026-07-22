import { useCallback, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useLanguage } from '@/context/LanguageContext';
import { usePlayback } from '@/context/PlayerContext';
import { localeToSpeechLang, parseVoiceInput, type VoiceParseResult } from '@/services/voiceCommands';
import {
  getVoiceSessionOwner,
  setVoiceSessionOwner,
  markVoiceSessionStarted,
  isStaleSessionEvent,
  getManualDuckedVolume,
  setManualDuckedVolume,
  VOICE_IOS_CATEGORY,
} from '@/services/voiceSession';

const isModuleAvailable = (): boolean => {
  try {
    return typeof ExpoSpeechRecognitionModule?.isRecognitionAvailable === 'function';
  } catch {
    return false;
  }
};

interface UseVoiceSearchOptions {
  onResult: (result: VoiceParseResult) => void;
  onPartial?: (transcript: string) => void;
}

interface UseVoiceSearchReturn {
  isListening: boolean;
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
  available: boolean;
}

export const useVoiceSearch = ({ onResult, onPartial }: UseVoiceSearchOptions): UseVoiceSearchReturn => {
  const { locale } = useLanguage();
  const { isPlaying, volume, setVolume } = usePlayback();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const setVolumeRef = useRef(setVolume);
  setVolumeRef.current = setVolume;

  const duckMusic = () => {
    if (isPlayingRef.current && getManualDuckedVolume() === null) {
      setManualDuckedVolume(volumeRef.current);
      setVolumeRef.current(0);
    }
  };

  const restoreMusic = () => {
    const prev = getManualDuckedVolume();
    if (prev !== null) {
      setManualDuckedVolume(null);
      setVolumeRef.current(prev || 1);
    }
  };

  const latestTranscriptRef = useRef('');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  useSpeechRecognitionEvent('start', () => {
    if (getVoiceSessionOwner() === 'manual') setIsListening(true);
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (getVoiceSessionOwner() !== 'manual') return;
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    latestTranscriptRef.current = text;

    if (event.isFinal) if (text.trim()) onResultRef.current(parseVoiceInput(text, locale));
    else onPartial?.(text);
  });

  useSpeechRecognitionEvent('end', () => {
    if (getVoiceSessionOwner() === 'manual') {
      if (isStaleSessionEvent()) return;
      restoreMusic();
      setVoiceSessionOwner(null);
    }
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    const isOwn = getVoiceSessionOwner() === 'manual';
    if (isOwn && event.error === 'aborted' && isStaleSessionEvent()) return;
    if (isOwn && event.error !== 'aborted' && event.error !== 'no-speech') {
      console.warn('[useVoiceSearch] error:', event.error, event.message);
    }

    if (isOwn) restoreMusic();
    setIsListening(false);
  });

  const start = useCallback(async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn('[useVoiceSearch] permiso de micrófono/voz denegado');
        return;
      }

      setTranscript('');
      latestTranscriptRef.current = '';
      duckMusic();

      if (getVoiceSessionOwner() === 'wake')
      {
        markVoiceSessionStarted();
        setVoiceSessionOwner('manual');
        try {
          ExpoSpeechRecognitionModule.abort();
        } catch {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      markVoiceSessionStarted();
      setVoiceSessionOwner('manual');
      ExpoSpeechRecognitionModule.start({
        lang: localeToSpeechLang[locale] ?? 'en-US',
        interimResults: true,
        continuous: false,
        requiresOnDeviceRecognition: false,
        iosCategory: VOICE_IOS_CATEGORY,
      } as any);
    }
    catch (error) {
      console.warn('[useVoiceSearch] no se pudo iniciar:', error);
      restoreMusic();
      setIsListening(false);
    }
  }, [locale]);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return {
    isListening,
    transcript,
    start,
    stop,
    available: isModuleAvailable(),
  };
};
