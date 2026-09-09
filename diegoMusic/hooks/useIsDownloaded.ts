import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';

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

    const uri = `${FileSystem.documentDirectory}${songId}.mp3`;
    FileSystem.getInfoAsync(uri)
      .then((info) => {
        if (cancelled) return;
        setDownloaded(info.exists && (info as any).size > 100000);
      })
      .catch(() => !cancelled && setDownloaded(false));

    return () => { cancelled = true; };
  }, [songId, title, wantedSongs, downloadVersion]);

  return downloaded;
}
