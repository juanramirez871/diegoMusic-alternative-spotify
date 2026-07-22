import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useWakeWord } from '@/hooks/useWakeWord';
import { useVoiceCommandActions } from '@/hooks/useVoiceCommandActions';
import { useWakeWordSettings } from '@/context/WakeWordContext';
import { usePlayback } from '@/context/PlayerContext';

export const WakeWordListener: React.FC = () => {
  const { enabled, hydrated, setCapturing } = useWakeWordSettings();
  const runCommand = useVoiceCommandActions();
  const { isPlaying, volume, setVolume } = usePlayback();

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const setVolumeRef = useRef(setVolume);
  setVolumeRef.current = setVolume;
  const duckedVolumeRef = useRef<number | null>(null);

  const { isCapturing } = useWakeWord({
    enabled: hydrated && enabled,
    onResult: (result) => {
      if (result.command) {
        runCommand(result.command);
      } else if (result.query) {
        router.push({
          pathname: '/(tabs)/search',
          params: { q: result.query, voiceTs: String(Date.now()) },
        });
      }
    },
  });

  useEffect(() => {
    if (isCapturing) {
      if (isPlayingRef.current && duckedVolumeRef.current === null) {
        duckedVolumeRef.current = volumeRef.current;
        setVolumeRef.current(0);
      }
    } else if (duckedVolumeRef.current !== null) {
      setVolumeRef.current(duckedVolumeRef.current || 1);
      duckedVolumeRef.current = null;
    }
  }, [isCapturing]);

  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setCapturing(isCapturing);
  }, [isCapturing, setCapturing]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isCapturing ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isCapturing, opacity]);

  if (!enabled) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
      <View style={styles.pill}>
        <IconSymbol name="mic" size={20} color="#2c5af3" />
        <Text style={styles.text}>Escuchando…</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2c5af3',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
