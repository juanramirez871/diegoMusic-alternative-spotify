import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { webDownload } from '@/services/webDownload';
import { sendDownloadCompleteNotification } from '@/services/notifications';
import { useLanguage } from '@/context/LanguageContext';
import { useNetwork } from '@/context/NetworkContext';
import type { SongData } from '@/interfaces/Song';
import {
  audioUri,
  thumbUri,
  hasAudioFile,
  downloadSongAudio,
  downloadSongThumb,
  deleteSongFiles,
  ensureDownloadsDir,
  DOWNLOADS_DIR,
  MIN_THUMB_BYTES,
  THUMB_SUFFIX,
} from './downloadFiles';

const DOWNLOAD_CONCURRENCY = 2;

interface Params {
  wantedSongs: SongData[];
  allPlaylistSongs: SongData[];
  hydrated: boolean;
  /** True once every playlist's songs have been read back from storage. */
  songsHydrated: boolean;
}

export const usePlaylistDownloads = ({
  wantedSongs,
  allPlaylistSongs,
  hydrated,
  songsHydrated,
}: Params) => {
  const { t } = useLanguage();
  const { isOnline } = useNetwork();

  const [downloadVersion, setDownloadVersion] = useState(0);
  const bump = useCallback(() => setDownloadVersion((v) => v + 1), []);
  const [showDownloadBanner, setShowDownloadBanner] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ done: number; total: number } | null>(null);

  const triggerBanner = useCallback(() => {
    setShowDownloadBanner(true);
    setTimeout(() => setShowDownloadBanner(false), 2000);
  }, []);

  const wantedRef = useRef<SongData[]>([]);
  wantedRef.current = wantedSongs;
  const allSongsRef = useRef<SongData[]>([]);
  allSongsRef.current = allPlaylistSongs;
  const songsHydratedRef = useRef(false);
  songsHydratedRef.current = songsHydrated;
  const syncingRef = useRef(false);
  const rerunRef = useRef(false);

  const syncDownloads = useCallback(async () => {
    if (syncingRef.current) { rerunRef.current = true; return; }
    syncingRef.current = true;
    try {
      const wanted = wantedRef.current;
      const wantedIds = new Set(wanted.map((s) => s.id));
      const safeToPrune =
        songsHydratedRef.current &&
        (wanted.length > 0 || allSongsRef.current.length === 0);

      if (Platform.OS !== 'web')
      {
        try {
          await ensureDownloadsDir();
          const dir = DOWNLOADS_DIR();
          const files = await FileSystem.readDirectoryAsync(dir);
          if (safeToPrune) {
            for (const name of files)
            {
              const mp3 = name.endsWith('.mp3') ? name.slice(0, -4) : null;
              const thumb = name.endsWith(THUMB_SUFFIX)
                ? name.slice(0, -THUMB_SUFFIX.length)
                : null;
              const songId = mp3 ?? thumb;
              if (!songId) continue;
              const inAnyPlaylist = allSongsRef.current.some((s) => s.id === songId);
              if (mp3 && !wantedIds.has(songId)) {
                await FileSystem.deleteAsync(audioUri(songId), { idempotent: true }).catch(() => {});
              }

              if (thumb && !inAnyPlaylist) {
                await FileSystem.deleteAsync(thumbUri(songId), { idempotent: true }).catch(() => {});
              }
            }
          }
          else {
            console.warn('[PlaylistDownloads] prune skipped: state not settled yet');
          }
        }
        catch (err) {
          console.warn('[PlaylistDownloads] prune failed:', err);
        }
      }
      else {
        if (await webDownload.hasFolder()) {
          // We can only act on wanted songs here; orphan web files are left alone
          // (the File System Access API has no cheap enumerate for our layout).
        }
      }

      const missing: SongData[] = [];
      for (const song of wanted)
      {
        if (Platform.OS === 'web') {
          const ok = await webDownload.isDownloaded(song.id, song.title).catch(() => false);
          if (!ok) missing.push(song);
        }
        else if (!(await hasAudioFile(song.id))) {
          missing.push(song);
        }
      }

      if (missing.length === 0) {
        setSyncProgress(null);
        bump();
        return;
      }

      if (!isOnline) {
        setSyncProgress(null);
        return;
      }

      if (Platform.OS === 'web') {
        const folderOk = (await webDownload.hasFolder()) || (await webDownload.pickFolder());
        if (!folderOk && webDownload.isSupported()) {
          setSyncProgress(null);
          return;
        }
      }

      setSyncProgress({ done: 0, total: missing.length });
      let done = 0;
      let anyDownloaded = false;
      const queue = [...missing];

      const worker = async () => {
        while (queue.length > 0) {
          const song = queue.shift();
          if (!song) break;
          const result = await downloadSongAudio(song);
          if (result === 'downloaded') {
            anyDownloaded = true;
            await downloadSongThumb(song);
            if (AppState.currentState !== 'active') {
              sendDownloadCompleteNotification(
                t('download.notificationTitle'),
                t('download.notificationBody', { title: song.title }),
              );
            }
          }
          done += 1;
          setSyncProgress({ done, total: missing.length });
          bump();
        }
      };

      await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker));
      setSyncProgress(null);
      if (anyDownloaded) triggerBanner();
      bump();
    }
    finally {
      syncingRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        setTimeout(() => { void syncDownloadsRef.current?.(); }, 0);
      }
    }
  }, [bump, t, triggerBanner, isOnline]);

  const syncDownloadsRef = useRef<(() => Promise<void>) | null>(null);
  syncDownloadsRef.current = syncDownloads;
  const thumbSyncingRef = useRef(false);
  const syncAllThumbnails = useCallback(async () => {
    if (Platform.OS === 'web') return;
    if (thumbSyncingRef.current) return;
    thumbSyncingRef.current = true;
    try {
      await ensureDownloadsDir();
      for (const song of allSongsRef.current) {
        if (!song?.id || !song.thumbnail?.url) continue;
        try {
          const info = await FileSystem.getInfoAsync(thumbUri(song.id));
          if (info.exists && (info as any).size > MIN_THUMB_BYTES) continue;
          await downloadSongThumb(song);
        }
        catch (err) {
          console.warn(`[PlaylistDownloads] thumb sync ${song.title}:`, err);
        }
      }
    }
    finally {
      thumbSyncingRef.current = false;
    }
  }, []);

  useEffect(() => { ensureDownloadsDir(); }, []);
  useEffect(() => {
    if (!hydrated || !songsHydrated) return;
    syncAllThumbnails();
    if (isOnline) syncDownloads();
  }, [hydrated, songsHydrated, isOnline, wantedSongs, allPlaylistSongs]);

  const removeSongDownload = useCallback(async (song: { id: string; title?: string }) => {
    await deleteSongFiles(song);
    bump();
  }, [bump]);

  return {
    downloadVersion,
    showDownloadBanner,
    syncProgress,
    syncDownloads,
    syncAllThumbnails,
    removeSongDownload,
    bumpDownloadVersion: bump,
    triggerDownloadBanner: triggerBanner,
  };
};
