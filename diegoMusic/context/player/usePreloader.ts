import { SongData } from '@/interfaces/Song';
import { youtubeService } from '@/services/youtubeService';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import * as FileSystem from '@/utils/fileSystem';
import { audioUri } from './downloadFiles';
import { useRef } from 'react';
import { Platform } from 'react-native';


export const usePreloader = () => {

  const preloadedSoundsRef = useRef<Map<string, AudioPlayer>>(new Map());
  const preloadNextSongs = async (currentQueue: SongData[], currentIndex: number, isOnline: boolean = true) => {

    if (Platform.OS === 'web') return;
    const currentSong = currentQueue[currentIndex];
    const nextSongs = currentQueue.slice(currentIndex + 1, currentIndex + 2);
    const idsToKeep = new Set([currentSong.id, ...nextSongs.map(s => s.id)]);

    for (const [id, player] of preloadedSoundsRef.current.entries())
    {
      if (!idsToKeep.has(id)) {
        player.remove();
        preloadedSoundsRef.current.delete(id);
        const cacheUri = `${FileSystem.cacheDirectory}${id}.mp3`;
        const cacheInfo = await FileSystem.getInfoAsync(cacheUri);
        console.log(`[PRELOADER_CLEANUP] Eliminando preloaded id=${id} cacheExists=${cacheInfo.exists}`);
        if (cacheInfo.exists)
        {
          await FileSystem.deleteAsync(cacheUri, { idempotent: true }).catch(() => {});
          console.log(`[PRELOADER_CLEANUP] Cache eliminado: ${cacheUri}`);
        }
      }
    }

    for (const song of nextSongs) {
      const persistentUri = audioUri(song.id);
      let fileInfo = await FileSystem.getInfoAsync(persistentUri);
      let localUri = persistentUri;

      if (!fileInfo.exists) {
        localUri = `${FileSystem.cacheDirectory}${song.id}.mp3`;
        fileInfo = await FileSystem.getInfoAsync(localUri);
      }

      if (!preloadedSoundsRef.current.has(song.id)) {
        try {
          if (fileInfo.exists && (fileInfo.size === undefined || fileInfo.size >= 100 * 1024)) {
            console.log(`[PRELOADED] Cargando player para ${song.id} desde archivo local`);
            const player = createAudioPlayer({ uri: localUri });
            preloadedSoundsRef.current.set(song.id, player);
          }
          else if (isOnline) {
            console.log(`[PRELOADED] Cargando player para ${song.id} desde URL directa`);
            const { url: directUrl } = await youtubeService.getAudioDirectUrl(song.url);
            const player = createAudioPlayer({ uri: directUrl });
            preloadedSoundsRef.current.set(song.id, player);
          }
        }
        catch (error) {
          console.warn(`[PRELOADED] Error al crear player para ${song.id}:`, error);
        }
      }
    }
  };

  const clearPreloaded = () => {
    for (const player of preloadedSoundsRef.current.values()) {
      player.remove();
    }
    preloadedSoundsRef.current.clear();
  };

  return {
    preloadedSoundsRef,
    preloadNextSongs,
    clearPreloaded
  };
};
