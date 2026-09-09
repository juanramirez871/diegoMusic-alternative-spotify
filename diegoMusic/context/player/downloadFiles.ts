import { Platform } from 'react-native';
import * as FileSystem from '@/utils/fileSystem';
import { webDownload } from '@/services/webDownload';
import { youtubeService } from '@/services/youtubeService';
import type { SongData } from '@/interfaces/Song';

export const MIN_AUDIO_BYTES = 100000;
export const MIN_THUMB_BYTES = 1000;
export const audioUri = (songId: string) => `${FileSystem.documentDirectory}${songId}.mp3`;
export const thumbUri = (songId: string) => `${FileSystem.documentDirectory}${songId}_thumb.jpg`;
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

  const uri = audioUri(song.id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_AUDIO_BYTES) return 'skipped';
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });

    const res = await FileSystem.createDownloadResumable(
      youtubeService.getAudioDownloadUrl(song.url),
      uri,
      { sessionType: FileSystem.FileSystemSessionType.BACKGROUND },
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
  const uri = thumbUri(song.id);
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && (info as any).size > MIN_THUMB_BYTES) return;
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
    await FileSystem.deleteAsync(`${uri}.download`, { idempotent: true }).catch(() => {});

    const res = await FileSystem.createDownloadResumable(song.thumbnail.url, uri, {}).downloadAsync();
    const finalInfo = await FileSystem.getInfoAsync(res?.uri || uri);
    if (!finalInfo.exists || (finalInfo as any).size <= MIN_THUMB_BYTES) {
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    }
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
