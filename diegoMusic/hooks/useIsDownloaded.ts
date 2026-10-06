import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';
import { webDownload } from '@/services/webDownload';
import {
  audioUri,
  MIN_AUDIO_BYTES,
  DOWNLOADS_DIR,
  ensureDownloadsDir,
} from '@/context/player/downloadFiles';

type DlCache = {
  map: Map<string, boolean>;
  primedVersion: number;
  primePromise: Promise<void> | null;
};
const g = globalThis as unknown as { __diegoDlCache?: DlCache };
const store: DlCache =
  g.__diegoDlCache ??
  (g.__diegoDlCache = { map: new Map(), primedVersion: -1, primePromise: null });

const primeFromDirectory = (version: number): Promise<void> => {
  if (Platform.OS === 'web') return Promise.resolve();
  if (store.primedVersion === version && store.primePromise) return store.primePromise;
  store.primedVersion = version;
  store.primePromise = (async () => {
    try {
      await ensureDownloadsDir();
      const dir = DOWNLOADS_DIR();
      const names = await FileSystem.readDirectoryAsync(dir);
      const present = new Set<string>();
      for (const name of names) {
        if (!name.endsWith('.mp3')) continue;
        const songId = name.slice(0, -4);
        present.add(songId);
        try {
          const info = await FileSystem.getInfoAsync(`${dir}${name}`);
          store.map.set(songId, info.exists && (info as any).size > MIN_AUDIO_BYTES);
        }
        catch {
          store.map.set(songId, false);
        }
      }
      // Any id we previously thought was downloaded but is no longer on disk.
      for (const [id, was] of store.map) {
        if (was && !present.has(id)) store.map.set(id, false);
      }
    }
    catch {
      /* directory may not exist yet — per-song checks fill the map */
    }
  })();
  return store.primePromise;
};

const checkOne = async (songId: string, title?: string): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return await webDownload.isDownloaded(songId, title || songId);
    }
    const info = await FileSystem.getInfoAsync(audioUri(songId));
    return info.exists && (info as any).size > MIN_AUDIO_BYTES;
  }
  catch {
    return false;
  }
};

export const resolveDownloadedMap = async (
  songs: { id: string; title?: string }[],
  downloadVersion: number,
): Promise<Map<string, boolean>> => {
  await primeFromDirectory(downloadVersion);
  const out = new Map<string, boolean>();
  for (const s of songs) {
    let v = store.map.get(s.id);
    if (v === undefined) {
      v = await checkOne(s.id, s.title);
      store.map.set(s.id, v);
    }
    out.set(s.id, v);
  }
  return out;
};

export const peekDownloaded = (songId: string): boolean | undefined => store.map.get(songId);

export const markDownloaded = (songId: string, downloaded: boolean): void => {
  store.map.set(songId, downloaded);
};
export function useIsDownloaded(songId?: string, title?: string): boolean {

  const { downloadVersion } = useLibrary();
  const [downloaded, setDownloaded] = useState<boolean>(
    () => (songId ? store.map.get(songId) ?? false : false),
  );

  useEffect(() => {
    if (!songId) {
      setDownloaded(false);
      return;
    }

    const cached = store.map.get(songId);
    if (cached !== undefined) setDownloaded(cached);

    let cancelled = false;
    primeFromDirectory(downloadVersion).then(() => {
      if (cancelled) return;
      const fromPrime = store.map.get(songId);
      if (fromPrime !== undefined) {
        setDownloaded(fromPrime);
        return;
      }
      return checkOne(songId, title).then((ok) => {
        store.map.set(songId, ok);
        if (!cancelled) setDownloaded(ok);
      });
    });

    return () => { cancelled = true; };
  }, [songId, title, downloadVersion]);

  return downloaded;
}
