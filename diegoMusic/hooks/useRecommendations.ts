import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';
import { recommendationsService } from '@/services/recommendationsService';
import type { SongData } from '@/interfaces/Song';

// Session-lived cache so switching tabs doesn't re-fetch/re-flash the section.
const g = globalThis as unknown as { __diegoRecsCache?: SongData[] };

export function useRecommendations(limit = 12): { songs: SongData[]; loading: boolean } {
  const { token } = useAuth();
  const { isApiReachable } = useNetwork();
  const [songs, setSongs] = useState<SongData[]>(() => g.__diegoRecsCache ?? []);
  const [loading, setLoading] = useState(() => !g.__diegoRecsCache);

  useEffect(() => {
    if (!token || !isApiReachable) return;
    let cancelled = false;

    recommendationsService.fetchRecommendations(limit).then((result) => {
      if (cancelled) return;
      if (result.length > 0) {
        g.__diegoRecsCache = result;
        setSongs(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [token, isApiReachable, limit]);

  return { songs, loading };
}
