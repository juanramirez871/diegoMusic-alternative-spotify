import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import storage from '@/services/storage';

const WAKE_WORD_KEY = '@wake_word_enabled';

interface WakeWordContextValue {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  hydrated: boolean;
  capturing: boolean;
  setCapturing: (value: boolean) => void;
}

const WakeWordContext = createContext<WakeWordContextValue | undefined>(undefined);

export const WakeWordProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.getItem(WAKE_WORD_KEY);
        if (saved === 'true') setEnabledState(true);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    storage.setItem(WAKE_WORD_KEY, value ? 'true' : 'false').catch(() => {});
  }, []);

  const value = useMemo<WakeWordContextValue>(
    () => ({ enabled, setEnabled, hydrated, capturing, setCapturing }),
    [enabled, setEnabled, hydrated, capturing],
  );

  return <WakeWordContext.Provider value={value}>{children}</WakeWordContext.Provider>;
};

export const useWakeWordSettings = (): WakeWordContextValue => {
  const ctx = useContext(WakeWordContext);
  if (!ctx) throw new Error('useWakeWordSettings must be used within a WakeWordProvider');
  return ctx;
};
