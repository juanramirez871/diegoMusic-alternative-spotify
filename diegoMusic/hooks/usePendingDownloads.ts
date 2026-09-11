import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';
import { resolveDownloadedMap, peekDownloaded } from './useIsDownloaded';

export function usePendingDownloads(): number {

  const { wantedSongs: favorites, downloadVersion } = useLibrary();
  const [pending, setPending] = useState<number>(() => {
    if (Platform.OS === 'web') return 0;
    let n = 0;
    for (const s of favorites) {
      if (peekDownloaded(s.id) === false) n += 1;
      else if (peekDownloaded(s.id) === undefined) return 0; // not primed yet
    }
    return n;
  });

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS === 'web') {
      (async () => {
        if (!(await webDownload.hasFolder())) {
          if (!cancelled) setPending(favorites.length);
          return;
        }
        const checks = await Promise.all(
          favorites.map((s) => webDownload.isDownloaded(s.id, s.title)),
        );
        if (!cancelled) setPending(checks.filter((ok) => !ok).length);
      })();
      return () => { cancelled = true; };
    }

    resolveDownloadedMap(favorites, downloadVersion).then((map) => {
      if (cancelled) return;
      let n = 0;
      for (const s of favorites) if (!map.get(s.id)) n += 1;
      setPending(n);
    });

    return () => { cancelled = true; };
  }, [favorites, downloadVersion]);

  return pending;
}
