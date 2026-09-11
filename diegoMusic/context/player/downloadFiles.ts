import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { webDownload } from '@/services/webDownload';
import { youtubeService } from '@/services/youtubeService';
import { normalizeThumbnailUrl, youtubeIdFromThumb } from '@/utils/thumbnailUrl';
import type { SongData } from '@/interfaces/Song';

export const MIN_AUDIO_BYTES = 100000;
export const MIN_THUMB_BYTES = 1000;
const DOWNLOADS_DIRNAME = 'downloads';
const downloadsDir = () => `${FileSystem.documentDirectory}${DOWNLOADS_DIRNAME}/`;
export const THUMB_SUFFIX = '_thumb_v3.jpg';
const LEGACY_THUMB_SUFFIXES = ['_thumb.jpg', '_thumb_v2.jpg'];

async function migrateLegacyFiles(): Promise<void> {
  try {
    const root = FileSystem.documentDirectory!;
    const names = await FileSystem.readDirectoryAsync(root);
    for (const name of names) {
      const isThumb = LEGACY_THUMB_SUFFIXES.some((s) => name.endsWith(s)) ||
        name.endsWith(THUMB_SUFFIX);
      if (!name.endsWith('.mp3') && !isThumb) continue;
      const from = `${root}${name}`;
      const to = `${downloadsDir()}${name}`;
      try {
        const dst = await FileSystem.getInfoAsync(to);
        if (dst.exists) { await FileSystem.deleteAsync(from, { idempotent: true }); continue; }
        await FileSystem.moveAsync({ from, to });
      }
      catch { /* leave the file; not fatal */ }
    }
  }
  catch { /* nothing to migrate */ }
}

let purgedLegacyThumbs = false;
async function purgeLegacyThumbs(): Promise<void> {
  if (purgedLegacyThumbs || Platform.OS === 'web') return;
  purgedLegacyThumbs = true;
  const dirs = [downloadsDir(), FileSystem.cacheDirectory ?? ''];
  for (const dir of dirs) {
    if (!dir) continue;
    try {
      const names = await FileSystem.readDirectoryAsync(dir);
      for (const name of names) {
        if (LEGACY_THUMB_SUFFIXES.some((s) => name.endsWith(s))) {
          await FileSystem.deleteAsync(`${dir}${name}`, { idempotent: true }).catch(() => {});
        }
      }
    }
    catch { /* dir may not exist yet */ }
  }
}

let ensureDirPromise: Promise<void> | null = null;
export function ensureDownloadsDir(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (!ensureDirPromise) {
    ensureDirPromise = (async () => {
      try {
        const info = await FileSystem.getInfoAsync(downloadsDir());
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(downloadsDir(), { intermediates: true });
          await migrateLegacyFiles();
        }
        await purgeLegacyThumbs();
      }
      catch (err) {
        console.warn('[Download] ensureDownloadsDir failed:', err);
        // Reset so a later call can retry.
        ensureDirPromise = null;
      }
    })();
  }
  return ensureDirPromise;
}

export const audioUri = (songId: string) => `${downloadsDir()}${songId}.mp3`;
export const thumbUri = (songId: string) => `${downloadsDir()}${songId}${THUMB_SUFFIX}`;
export const DOWNLOADS_DIR = downloadsDir;

async function downloadThumbWithFallback(
  rawUrl: string | undefined | null,
  destUri: string,
): Promise<boolean> {
  const isYt = !!youtubeIdFromThumb(rawUrl);
  const candidates = isYt
    ? [normalizeThumbnailUrl(rawUrl, 'high'), normalizeThumbnailUrl(rawUrl, 'low')]
    : [normalizeThumbnailUrl(rawUrl)];

  for (const src of candidates) {
    if (!src) continue;
    try {
      await FileSystem.deleteAsync(destUri, { idempotent: true }).catch(() => {});
      await FileSystem.deleteAsync(`${destUri}.download`, { idempotent: true }).catch(() => {});
      const res = await FileSystem.createDownloadResumable(src, destUri, {}).downloadAsync();
      const info = await FileSystem.getInfoAsync(res?.uri || destUri);
      if (info.exists && (info as any).size > MIN_THUMB_BYTES) return true;
      await FileSystem.deleteAsync(destUri, { idempotent: true }).catch(() => {});
    }
    catch {
      /* try next candidate */
    }
  }
  return false;
}

export const cachedThumbUri = (songId: string) =>
  `${FileSystem.cacheDirectory}${songId}${THUMB_SUFFIX}`;

export async function cacheThumb(song: {
  id: string;
  thumbnail?: { url?: string } | null;
}): Promise<void> {
  if (Platform.OS === 'web' || !song?.id) return;
  const raw = song.thumbnail?.url;
  if (!raw) return;
  try {
    const dl = await FileSystem.getInfoAsync(thumbUri(song.id));
    if (dl.exists && (dl as any).size > MIN_THUMB_BYTES) return;
  }

  catch { /* fall through */ }
  const uri = cachedThumbUri(song.id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_THUMB_BYTES) return;
    await downloadThumbWithFallback(raw, uri);
  }
  catch (err) {
    console.warn(`[Download] cache thumb failed for ${song.id}:`, err);
  }
}

/** Returns a local thumb path for a song if one exists (download or cache). */
export async function localThumbFor(songId: string): Promise<string | null> {
  if (Platform.OS === 'web' || !songId) return null;
  for (const uri of [thumbUri(songId), cachedThumbUri(songId)]) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && (info as any).size > MIN_THUMB_BYTES) return uri;
    }
    catch { /* try next */ }
  }
  return null;
}

const hashKey = (s: string) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const playlistCoverCacheUri = (remoteUrl: string) =>
  `${FileSystem.cacheDirectory}plcover_${hashKey(remoteUrl)}.jpg`;

export async function cachePlaylistCover(remoteUrl?: string | null): Promise<void> {
  if (Platform.OS === 'web' || !remoteUrl || !/^https?:\/\//i.test(remoteUrl)) return;
  const uri = playlistCoverCacheUri(remoteUrl);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_THUMB_BYTES) return;
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    const res = await FileSystem.createDownloadResumable(remoteUrl, uri, {}).downloadAsync();
    const done = await FileSystem.getInfoAsync(res?.uri || uri);
    if (!done.exists || (done as any).size <= MIN_THUMB_BYTES) {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
  }
  catch (err) {
    console.warn('[Download] cache playlist cover failed:', err);
  }
}

export async function localPlaylistCover(remoteUrl?: string | null): Promise<string | null> {
  if (Platform.OS === 'web' || !remoteUrl) return null;
  const uri = playlistCoverCacheUri(remoteUrl);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_THUMB_BYTES) return uri;
  }
  catch { /* none */ }
  return null;
}

export type DownloadResult = 'downloaded' | 'skipped' | 'failed';
export async function hasAudioFile(songId: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(audioUri(songId));
    return info.exists && (info as any).size > MIN_AUDIO_BYTES;
  }
  catch {
    return false;
  }
}

export async function downloadSongAudio(song: SongData): Promise<DownloadResult> {
  if (Platform.OS === 'web') {
    return webDownload.downloadOne({
      songId: song.id,
      title: song.title,
      url: youtubeService.getAudioDownloadUrl(song.url),
    });
  }

  await ensureDownloadsDir();
  const uri = audioUri(song.id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_AUDIO_BYTES) return 'skipped';
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    const res = await FileSystem.createDownloadResumable(
      youtubeService.getAudioDownloadUrl(song.url),
      uri,
    ).downloadAsync();

    const finalInfo = await FileSystem.getInfoAsync(res?.uri || uri);
    if (!finalInfo.exists || (finalInfo as any).size <= MIN_AUDIO_BYTES) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      return 'failed';
    }
    return 'downloaded';
  }
  catch (err) {
    console.warn(`[Download] audio failed for ${song.title}:`, err);
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    return 'failed';
  }
}

export async function downloadSongThumb(song: SongData): Promise<void> {
  if (Platform.OS === 'web' || !song.thumbnail?.url) return;
  await ensureDownloadsDir();
  const uri = thumbUri(song.id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_THUMB_BYTES) return;
    await downloadThumbWithFallback(song.thumbnail.url, uri);
  }
  catch (err) {
    console.warn(`[Download] thumb failed for ${song.title}:`, err);
  }
}

/** Deletes the downloaded audio + thumbnail for a song. */
export async function deleteSongFiles(song: { id: string; title?: string }): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (await webDownload.hasFolder()) {
        await webDownload.deleteOne(song.id, song.title || song.id);
      }
    }
    catch (err) {
      console.warn('[Download] web delete failed:', err);
    }
    return;
  }
  try {
    await Promise.all([
      FileSystem.deleteAsync(audioUri(song.id), { idempotent: true }),
      FileSystem.deleteAsync(thumbUri(song.id), { idempotent: true }),
    ]);
  }
  catch (err) {
    console.warn('[Download] delete failed:', err);
  }
}
