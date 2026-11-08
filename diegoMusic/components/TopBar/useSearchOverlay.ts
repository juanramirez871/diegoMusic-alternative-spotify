import { useCallback, useState } from 'react';
import { useFadeToggle } from '@/hooks/useFadeToggle';
import { storage } from '@/services/storage';
import type { HistoryItem } from '@/interfaces/ui';

const RECENT_SEARCHES_KEY = '@recent_searches';

/** State of the web search overlay: visibility, query and persisted recent searches. */
export function useSearchOverlay() {
  const { visible, anim, show, hide } = useFadeToggle();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);

  const open = async () => {
    try {
      const saved = await storage.getItem(RECENT_SEARCHES_KEY);
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
    show();
  };

  const close = useCallback(() => hide(() => setQuery('')), [hide]);

  const updateRecentSearches = async (history: HistoryItem[]) => {
    setRecentSearches(history);
    try {
      await storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(history));
    } catch {}
  };

  return {
    isOpen: visible,
    fadeAnim: anim,
    query,
    setQuery,
    recentSearches,
    updateRecentSearches,
    open,
    close,
  };
}
