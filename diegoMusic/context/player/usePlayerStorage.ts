import { youtubeService } from '@/services/youtubeService';
import storage from '@/services/storage';
import { sendDownloadCompleteNotification } from '@/services/notifications';
import * as FileSystem from '@/utils/fileSystem';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { webDownload } from '@/services/webDownload';
import {
    FAVORITES_KEY,
    FAVORITE_ARTISTS_KEY,
    MOST_PLAYED_KEY,
    RECENT_PLAYED_KEY,
    ACTIVE_DAYS_KEY,
    ARTIST_PLAYS_KEY,
    SONG_PLAYS_KEY,
    VIDEO_QUALITY_KEY,
    ArtistPlayData,
    SongPlayData,
    VideoQuality,
} from './types';
import { ArtistData, SongData } from '@/interfaces/Song';
import { useLanguage } from '@/context/LanguageContext';
import { favoriteArtistsService } from '@/services/favoriteArtistsService';
import { favoriteSongsService } from '@/services/favoriteSongsService';
import { songsPlayedService } from '@/services/songsPlayedService';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';

export const usePlayerStorage = () => {

  const { t } = useLanguage();
  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const [favorites, setFavorites] = useState<SongData[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<ArtistData[]>([]);
  const [recentPlayed, setRecentPlayed] = useState<SongData[]>([]);
  const [mostPlayed, setMostPlayed] = useState<SongData[]>([]);
  const [artistPlays, setArtistPlays] = useState<Record<string, ArtistPlayData>>({});
  const [songPlays, setSongPlays] = useState<Record<string, SongPlayData>>({});
  const [showDownloadBanner, setShowDownloadBanner] = useState(false);
  const [downloadVersion, setDownloadVersion] = useState(0);
  const bumpDownloadVersion = () => setDownloadVersion((v) => v + 1);
  const [streak, setStreak] = useState(0);
  const [videoQuality, setVideoQualityState] = useState<VideoQuality>('low');

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const computeStreak = (days: string[]): number => {
    if (days.length === 0) return 0;
    const sorted = [...new Set(days)].sort().reverse();
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
    let count = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff === 1) count++;
      else break;
    }

    return count;
  };

  const triggerDownloadBanner = () => {
    setShowDownloadBanner(true);
    setTimeout(() => setShowDownloadBanner(false), 2000);
  };

  const syncingThumbnailsRef = useRef(false);

  const syncThumbnails = async (favoritesList: SongData[]) => {
    if (Platform.OS === 'web') return;
    if (syncingThumbnailsRef.current) return;
    syncingThumbnailsRef.current = true;
    try {
      console.log(`[SYNC] Revisando ${favoritesList.length} favoritos para portadas faltantes...`);
      for (const song of favoritesList)
      {
        if (!song?.id || !song.thumbnail?.url) continue;
        const thumbnailUri = `${FileSystem.documentDirectory}${song.id}_thumb.jpg`;
        try
        {
          const info = await FileSystem.getInfoAsync(thumbnailUri);
          if (info.exists && (info as any).size > 1000) continue;
          if (info.exists) await FileSystem.deleteAsync(thumbnailUri, { idempotent: true });

          console.log(`[SYNC] Descargando portada faltante para: ${song.title}`);
          const tmpUri = `${thumbnailUri}.download`;
          await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {});
          const result = await FileSystem.createDownloadResumable(
            song.thumbnail.url,
            thumbnailUri,
            {}
          ).downloadAsync();

          const finalInfo = await FileSystem.getInfoAsync(result?.uri || thumbnailUri);
          if (!finalInfo.exists || (finalInfo as any).size <= 1000) {
            await FileSystem.deleteAsync(thumbnailUri, { idempotent: true }).catch(() => {});
            console.warn(`[SYNC] Portada inválida, descartada: ${song.title}`);
          }
        }
        catch (e) {
          console.warn(`[SYNC] Error sincronizando portada de ${song.title}:`, e);
        }
      }
    }
    finally {
      syncingThumbnailsRef.current = false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedFavorites,
          savedArtists,
          savedRecent,
          savedMostPlayed,
          savedActiveDays,
          savedArtistPlays,
          savedSongPlays,
          savedVideoQuality
        ] = await Promise.all([
          storage.getItem(FAVORITES_KEY),
          storage.getItem(FAVORITE_ARTISTS_KEY),
          storage.getItem(RECENT_PLAYED_KEY),
          storage.getItem(MOST_PLAYED_KEY),
          storage.getItem(ACTIVE_DAYS_KEY),
          storage.getItem(ARTIST_PLAYS_KEY),
          storage.getItem(SONG_PLAYS_KEY),
          storage.getItem(VIDEO_QUALITY_KEY),
        ]);

        if (savedFavorites) {
          const parsedFavorites = JSON.parse(savedFavorites);
          setFavorites(parsedFavorites);
          syncThumbnails(parsedFavorites);
        }

        if (savedArtists) setFavoriteArtists(JSON.parse(savedArtists));
        if (savedRecent) setRecentPlayed(JSON.parse(savedRecent));

        if (savedMostPlayed) setMostPlayed(JSON.parse(savedMostPlayed));
        if (savedArtistPlays) setArtistPlays(JSON.parse(savedArtistPlays));
        if (savedSongPlays) setSongPlays(JSON.parse(savedSongPlays));
        if (savedActiveDays) {
          const days: string[] = JSON.parse(savedActiveDays);
          setStreak(computeStreak(days));
        }
        if (savedVideoQuality && ['low', 'medium', 'high'].includes(savedVideoQuality)) {
          setVideoQualityState(savedVideoQuality as VideoQuality);
        }
      }
      catch (error) {
        console.error('Error loading persisted storage data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!token || !isOnline) return;

    favoriteArtistsService.fetchAll().then((artists) => {
      if (!artists) return;
      setFavoriteArtists(artists);
      storage.setItem(FAVORITE_ARTISTS_KEY, JSON.stringify(artists)).catch(() => {});
    });

    favoriteSongsService.fetchAll().then((songs) => {
      if (!songs) return;
      setFavorites(songs);
      storage.setItem(FAVORITES_KEY, JSON.stringify(songs)).catch(() => {});
      if (songs.length > 0) syncThumbnails(songs);
    });

    songsPlayedService.fetchStats().then((stats) => {
      if (!stats) return;

      setRecentPlayed(stats.recentPlayed);
      storage.setItem(RECENT_PLAYED_KEY, JSON.stringify(stats.recentPlayed)).catch(() => {});

      setMostPlayed(stats.mostPlayed);
      storage.setItem(MOST_PLAYED_KEY, JSON.stringify(stats.mostPlayed)).catch(() => {});

      setArtistPlays(stats.artistPlays);
      storage.setItem(ARTIST_PLAYS_KEY, JSON.stringify(stats.artistPlays)).catch(() => {});

      setSongPlays(stats.songPlays);
      storage.setItem(SONG_PLAYS_KEY, JSON.stringify(stats.songPlays)).catch(() => {});

      setStreak(computeStreak(stats.activeDays));
      storage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(stats.activeDays)).catch(() => {});

      if (stats.lyricsQueries) {
        storage.setItem('@lyrics_custom_queries', JSON.stringify(stats.lyricsQueries)).catch(() => {});
      }
    });
  }, [token, isOnline]);

  // Whenever we come back online (or the favorites list changes) make sure every
  // favorite has its cover cached locally, so it still shows up offline.
  useEffect(() => {
    if (!isOnline || favorites.length === 0) return;
    syncThumbnails(favorites);
  }, [isOnline, favorites]);

  const toggleFavorite = async (song: SongData) => {

    const isFav = favorites.some(f => f.id === song.id);
    const persistentUri = `${FileSystem.documentDirectory}${song.id}.mp3`;
    const thumbnailUri = `${FileSystem.documentDirectory}${song.id}_thumb.jpg`;
    
    let newFavorites;
    if (isFav) newFavorites = favorites.filter(f => f.id !== song.id);
    else newFavorites = [...favorites, song];
    
    setFavorites(newFavorites);

    try {

      await storage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      if (isFav) {
        if (Platform.OS === 'web') {
          if (await webDownload.hasFolder()) {
            webDownload.deleteOne(song.id, song.title).then((ok) => {
              if (ok) bumpDownloadVersion();
            });
          }
        }
        else {
          try {
            await Promise.all([
              FileSystem.deleteAsync(persistentUri, { idempotent: true }),
              FileSystem.deleteAsync(thumbnailUri, { idempotent: true })
            ]);
            bumpDownloadVersion();
          }
          catch (e) {
            console.warn('Error deleting favorite files:', e);
          }
        }
      }
      else {
        if (Platform.OS === 'web') {
          let folderReady = await webDownload.hasFolder();
          if (!folderReady && webDownload.isSupported()) {
            folderReady = await webDownload.pickFolder();
          }
          if (folderReady || !webDownload.isSupported()) {
            console.log(`[FAVORITE] (web) Iniciando descarga: ${song.title}`);
            webDownload.downloadOne({
              songId: song.id,
              title: song.title,
              url: youtubeService.getAudioDownloadUrl(song.url),
            }).then((result) => {
              if (result === 'downloaded') {
                triggerDownloadBanner();
                bumpDownloadVersion();
              }
              else if (result === 'failed') {
                Alert.alert(
                  t('errors.downloadTitle'),
                  t('errors.downloadFailed', { title: song.title })
                );
              }
            });
          }
          if (isFav) favoriteSongsService.remove(song.id);
          else favoriteSongsService.add(song);
          return;
        }
        const fileInfo = await FileSystem.getInfoAsync(persistentUri);
        const hasValidFile = fileInfo.exists && (fileInfo as any).size > 5000;
        if (!hasValidFile) {
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(persistentUri, { idempotent: true });
          }
          console.log(`[FAVORITE] Iniciando descarga de audio: ${song.title}`);
          const downloadUrl = youtubeService.getAudioDownloadUrl(song.url);
          const downloadResumable = FileSystem.createDownloadResumable(
            downloadUrl,
            persistentUri,
            { sessionType: FileSystem.FileSystemSessionType.BACKGROUND }
          );

          downloadResumable.downloadAsync().then(async (result) => {
            if (!result?.uri) {
              console.error(`[FAVORITE] Descarga falló sin resultado: ${song.title}`);
              return;
            }
            const info = await FileSystem.getInfoAsync(result.uri);
            if (!info.exists || (info as any).size <= 5000) {
              console.error(`[FAVORITE] Archivo inválido tras descarga (${(info as any).size ?? 0} bytes): ${song.title}`);
              await FileSystem.deleteAsync(result.uri, { idempotent: true });
              Alert.alert(
                t('errors.downloadTitle'),
                t('errors.downloadFailed', { title: song.title })
              );
              return;
            }
            console.log(`[FAVORITE] Descarga de audio completada (${(info as any).size} bytes): ${song.title}`);
            triggerDownloadBanner();
            bumpDownloadVersion();
            if (AppState.currentState !== 'active') {
              sendDownloadCompleteNotification(
                t('download.notificationTitle'),
                t('download.notificationBody', { title: song.title })
              );
            }
          })
          .catch(err => {
            console.error(`[FAVORITE] Error descargando audio ${song.title}:`, err);
            FileSystem.deleteAsync(persistentUri, { idempotent: true }).catch(() => {});
            Alert.alert(
              t('errors.downloadTitle'),
              t('errors.downloadFailed', { title: song.title })
            );
          });
        }

        if (song.thumbnail?.url) {
          const thumbInfo = await FileSystem.getInfoAsync(thumbnailUri);
          if (!thumbInfo.exists) {
            const thumbDownload = FileSystem.createDownloadResumable(
              song.thumbnail.url,
              thumbnailUri,
              {}
            );
            
            console.log(`[FAVORITE] Iniciando descarga de portada: ${song.title}`);
            thumbDownload.downloadAsync().then(() => {
              console.log(`[FAVORITE] Descarga de portada completada: ${song.title}`);
            })
            .catch(err => {
              console.error(`[FAVORITE] Error descargando portada ${song.title}:`, err);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in toggleFavorite process:', error);
      setFavorites(favorites);
    }

    if (isFav) favoriteSongsService.remove(song.id);
    else favoriteSongsService.add(song);
  };

  const isFavorite = (songId: string) => {
    return favorites.some(f => f.id === songId);
  };

  const toggleFavoriteArtist = async (artist: ArtistData) => {
    const isAlreadyFavorite = favoriteArtists.some(f => f.id === artist.id);
    const newFavoriteArtists = isAlreadyFavorite
      ? favoriteArtists.filter(f => f.id !== artist.id)
      : [...favoriteArtists, artist];

    setFavoriteArtists(newFavoriteArtists);
    try {
      await storage.setItem(FAVORITE_ARTISTS_KEY, JSON.stringify(newFavoriteArtists));
    } catch (error) {
      console.error('Error persisting favorite artists:', error);
    }

    if (isAlreadyFavorite) {
      favoriteArtistsService.remove(artist.id);
    }
    else {
      const canonical = await favoriteArtistsService.add(artist);
      if (canonical && (canonical.avatar !== artist.avatar || canonical.name !== artist.name)) {
        const reconciled = newFavoriteArtists.map(a => a.id === canonical.id ? canonical : a);
        setFavoriteArtists(reconciled);
        storage.setItem(FAVORITE_ARTISTS_KEY, JSON.stringify(reconciled)).catch(() => {});
      }
    }
  };

  const isFavoriteArtist = (artistId: string) => {
    return favoriteArtists.some(f => f.id === artistId);
  };

  const recordActiveDay = async () => {
    const today = todayStr();
    try {
      const saved = await storage.getItem(ACTIVE_DAYS_KEY);
      const days: string[] = saved ? JSON.parse(saved) : [];
      if (!days.includes(today)) {
        const updated = [...days, today];
        await storage.setItem(ACTIVE_DAYS_KEY, JSON.stringify(updated));
        setStreak(computeStreak(updated));
      }
    } catch (err) {
      console.error('Error recording active day:', err);
    }
  };

  const addRecentPlayed = async (song: SongData) => {
    const filtered = recentPlayed.filter(s => s.id !== song.id);
    const updated = [song, ...filtered].slice(0, 8);
    setRecentPlayed(updated);
    try {
      await storage.setItem(RECENT_PLAYED_KEY, JSON.stringify(updated));
    }
    catch (err) {
      console.error('Error saving recent played:', err);
    }
    recordActiveDay();
    songsPlayedService.recordPlay(song);
  };

  const addMostPlayed = async (song: SongData) => {

    const existingSongIndex = mostPlayed.findIndex(s => s.id === song.id);
    let updated;

    if (existingSongIndex !== -1)
    {
      updated = [...mostPlayed];
      updated[existingSongIndex] = {
        ...updated[existingSongIndex],
        timesPlayed: (updated[existingSongIndex].timesPlayed || 0) + 1
      };
    }
    else {
      updated = [...mostPlayed, { ...song, timesPlayed: 1 }];
    }

    updated.sort((a, b) => (b.timesPlayed || 0) - (a.timesPlayed || 0));
    const limited = updated.slice(0, 10);
    setMostPlayed(limited);

    const artistKey = song.channel.name;
    const existingArtist = artistPlays[artistKey];
    const updatedArtistPlays: Record<string, ArtistPlayData> = {
      ...artistPlays,
      [artistKey]: {
        name: song.channel.name,
        avatar: existingArtist?.avatar || song.channel.avatar || song.channel.icon || '',
        count: (existingArtist?.count || 0) + 1,
      },
    };

    setArtistPlays(updatedArtistPlays);
    const existingSong = songPlays[song.id];
    const updatedSongPlays: Record<string, SongPlayData> = {
      ...songPlays,
      [song.id]: {
        id: song.id,
        url: song.url,
        title: song.title,
        duration_formatted: song.duration_formatted,
        thumbnail: song.thumbnail,
        channel: { name: song.channel.name },
        timesPlayed: (existingSong?.timesPlayed || 0) + 1,
      },
    };

    setSongPlays(updatedSongPlays);
    try {
      await Promise.all([
        storage.setItem(MOST_PLAYED_KEY, JSON.stringify(limited)),
        storage.setItem(ARTIST_PLAYS_KEY, JSON.stringify(updatedArtistPlays)),
        storage.setItem(SONG_PLAYS_KEY, JSON.stringify(updatedSongPlays)),
      ]);
    }
    catch (err) {
      console.error('Error saving most played:', err);
    }
  };

  const setVideoQuality = async (quality: VideoQuality) => {
    setVideoQualityState(quality);
    await storage.setItem(VIDEO_QUALITY_KEY, quality);
  };

  const downloadAllFavorites = async (): Promise<{ downloaded: number; skipped: number; failed: number }> => {
    const stats = { downloaded: 0, skipped: 0, failed: 0 };
    const concurrency = 2;
    const queue = [...favorites];

    if (Platform.OS === 'web') {
      const folderOk = await webDownload.pickFolder();
      if (!folderOk && webDownload.isSupported()) {
        return stats;
      }
      const downloadOneWeb = async (song: SongData) => {
        const result = await webDownload.downloadOne({
          songId: song.id,
          title: song.title,
          url: youtubeService.getAudioDownloadUrl(song.url),
        });
        stats[result as keyof typeof stats]++;
        if (result === 'downloaded') bumpDownloadVersion();
      };
      const workersWeb = Array.from({ length: concurrency }, async () => {
        while (queue.length > 0) {
          const song = queue.shift();
          if (song) await downloadOneWeb(song);
        }
      });
      await Promise.all(workersWeb);
      if (stats.downloaded > 0) triggerDownloadBanner();
      return stats;
    }

    const downloadOne = (song: SongData): Promise<void> => new Promise((resolve) => {
      const persistentUri = `${FileSystem.documentDirectory}${song.id}.mp3`;
      const thumbnailUri = `${FileSystem.documentDirectory}${song.id}_thumb.jpg`;

      FileSystem.getInfoAsync(persistentUri).then((info) => {
        if (info.exists && (info as any).size > 5000) {
          stats.skipped++;
          return resolve();
        }
        const cleanupAndStart = info.exists
          ? FileSystem.deleteAsync(persistentUri, { idempotent: true })
          : Promise.resolve();

        cleanupAndStart.then(() => {
          const downloadUrl = youtubeService.getAudioDownloadUrl(song.url);
          FileSystem.createDownloadResumable(
            downloadUrl,
            persistentUri,
            { sessionType: FileSystem.FileSystemSessionType.BACKGROUND }
          )
          .downloadAsync().then(async (result: any) => {
            const finalInfo = await FileSystem.getInfoAsync(result?.uri || persistentUri);
            if (!finalInfo.exists || (finalInfo as any).size <= 5000) {
              await FileSystem.deleteAsync(persistentUri, { idempotent: true });
              stats.failed++;
              return resolve();
            }
            stats.downloaded++;
            bumpDownloadVersion();

            if (AppState.currentState !== 'active') {
              sendDownloadCompleteNotification(
                t('download.notificationTitle'),
                t('download.notificationBody', { title: song.title })
              );
            }

            if (song.thumbnail?.url) {
              const thumbInfo = await FileSystem.getInfoAsync(thumbnailUri);
              if (!thumbInfo.exists) {
                FileSystem.createDownloadResumable(song.thumbnail.url, thumbnailUri, {})
                  .downloadAsync()
                  .catch(() => {});
              }
            }
            resolve();
          })
          .catch((err: any) => {
            console.error(`[DOWNLOAD_ALL] Error en ${song.title}:`, err);
            FileSystem.deleteAsync(persistentUri, { idempotent: true }).catch(() => {});
            stats.failed++;
            resolve();
          });
        });
      })
      .catch(() => {
        stats.failed++;
        resolve();
      });
    });

    const workers = Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const song = queue.shift();
        if (song) await downloadOne(song);
      }
    });

    await Promise.all(workers);
    if (stats.downloaded > 0) triggerDownloadBanner();
    bumpDownloadVersion();

    return stats;
  };

  return {
    favorites,
    favoriteArtists,
    recentPlayed,
    mostPlayed,
    artistPlays,
    songPlays,
    showDownloadBanner,
    streak,
    videoQuality,
    setVideoQuality,
    toggleFavorite,
    isFavorite,
    toggleFavoriteArtist,
    isFavoriteArtist,
    addRecentPlayed,
    addMostPlayed,
    downloadAllFavorites,
    downloadVersion,
  };
};
