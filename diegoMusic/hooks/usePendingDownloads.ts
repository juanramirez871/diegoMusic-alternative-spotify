import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';

export function usePendingDownloads(): number {

  const { wantedSongs: favorites, downloadVersion } = useLibrary();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      let cancelledWeb = false;
      (async () => {
        if (!(await webDownload.hasFolder())) {
          if (!cancelledWeb) setPending(favorites.length);
          return;
        }
        const checks = await Promise.all(
          favorites.map((s) => webDownload.isDownloaded(s.id, s.title)),
        );
        if (!cancelledWeb) setPending(checks.filter((ok) => !ok).length);
      })();
      return () => { cancelledWeb = true; };
    }

    let cancelled = false;
    (async () => {
      const checks = await Promise.all(
        favorites.map(async (song) => {
          try {
            const info = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${song.id}.mp3`);
            return info.exists && (info as any).size > 100000;
          }
          catch {
            return false;
          }
        }),
      );
      if (!cancelled) setPending(checks.filter((ok) => !ok).length);
    })();

    return () => { cancelled = true; };
  }, [favorites, downloadVersion]);

  return pending;
}
