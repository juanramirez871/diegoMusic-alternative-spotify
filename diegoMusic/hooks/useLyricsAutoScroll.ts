import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScrollView } from 'react-native';

const STORAGE_KEY = '@lyrics_auto_scroll';

let cachedEnabled: boolean | null = null;
export function useLyricsAutoScrollPreference() {
  const [enabled, setEnabled] = useState(cachedEnabled ?? true);

  useEffect(() => {
    if (cachedEnabled !== null) return;
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      const resolved = value === null ? true : value === '1';
      cachedEnabled = resolved;
      setEnabled(resolved);
    });
  }, []);

  const toggle = () => {
    setEnabled((prev) => {
      const next = !prev;
      cachedEnabled = next;
      AsyncStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return { autoScrollEnabled: enabled, toggleAutoScroll: toggle };
}

export function useLyricsLineScroller(scrollRef: React.RefObject<ScrollView | null>, enabled: boolean) {
  const offsets = useRef<Record<number, number>>({});
  const viewportHeight = useRef(0);
  const lastScrolledIndex = useRef<number | null>(null);

  const onLineLayout = (index: number, y: number, height: number) => {
    offsets.current[index] = y + height / 2;
  };

  const onViewportLayout = (height: number) => {
    viewportHeight.current = height;
  };

  const scrollToLine = (index: number) => {
    if (!enabled || index < 0) return;
    if (lastScrolledIndex.current === index) return;
    const centerY = offsets.current[index];
    if (centerY === undefined) return;
    lastScrolledIndex.current = index;
    const targetY = Math.max(0, centerY - viewportHeight.current / 2);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  };

  const resetMeasurements = () => {
    offsets.current = {};
    lastScrolledIndex.current = null;
  };

  return { onLineLayout, onViewportLayout, scrollToLine, resetMeasurements };
}
