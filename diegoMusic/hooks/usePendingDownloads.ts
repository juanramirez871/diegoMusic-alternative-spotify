import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';
import { audioUri, MIN_AUDIO_BYTES } from '@/context/player/downloadFiles';

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
            const info = await FileSystem.getInfoAsync(audioUri(song.id));
            return info.exists && (info as any).size > MIN_AUDIO_BYTES;
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
