import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';
import { recommendationsService } from '@/services/recommendationsService';
import type { SongData } from '@/interfaces/Song';

const g = globalThis as unknown as { __diegoDiscoveryCache?: SongData[] };
export function useDiscovery(): { songs: SongData[]; loading: boolean } {
  const { token } = useAuth();
  const { isApiReachable } = useNetwork();
  const [songs, setSongs] = useState<SongData[]>(() => g.__diegoDiscoveryCache ?? []);
  const [loading, setLoading] = useState(() => !g.__diegoDiscoveryCache);

  useEffect(() => {
    if (!token || !isApiReachable) return;
    let cancelled = false;

    recommendationsService.fetchDiscovery().then((result) => {
      if (cancelled) return;
      if (result.length > 0) {
        g.__diegoDiscoveryCache = result;
        setSongs(result);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [token, isApiReachable]);

  return { songs, loading };
}
