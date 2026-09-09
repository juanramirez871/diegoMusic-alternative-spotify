import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';
import { audioUri, MIN_AUDIO_BYTES } from '@/context/player/downloadFiles';

export function useIsDownloaded(songId?: string, title?: string): boolean {
  
  const { wantedSongs, downloadVersion } = useLibrary();
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!songId) {
      setDownloaded(false);
      return;
    }

    let cancelled = false;

    if (Platform.OS === 'web') {
      webDownload.isDownloaded(songId, title || songId)
        .then((ok) => !cancelled && setDownloaded(ok))
        .catch(() => !cancelled && setDownloaded(false));
      return () => { cancelled = true; };
    }

    FileSystem.getInfoAsync(audioUri(songId))
      .then((info) => {
        if (cancelled) return;
        setDownloaded(info.exists && (info as any).size > MIN_AUDIO_BYTES);
      })
      .catch(() => !cancelled && setDownloaded(false));

    return () => { cancelled = true; };
  }, [songId, title, wantedSongs, downloadVersion]);

  return downloaded;
}
