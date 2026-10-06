import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { setAudioModeAsync } from 'expo-audio';
import storage from '@/services/storage';
import {
  CURRENT_SONG_KEY,
  QUEUE_SOURCE_KEY,
  PlaybackContextType,
  QueueContextType,
  LibraryContextType,
  QueueSource,
} from './player/types';
import { SafeMediaControl, Command, PlaybackState } from './player/mediaControls';
import { parseDuration } from './player/utils';
import { usePlayerStorage } from './player/usePlayerStorage';
import { usePlaylists } from './player/usePlaylists';
import { usePlaylistDownloads } from './player/usePlaylistDownloads';
import { cacheThumb, localThumbFor } from './player/downloadFiles';
import { usePreloader } from './player/usePreloader';
import { useAudioPlayer } from './player/useAudioPlayer';
import { usePlayerQueue } from './player/usePlayerQueue';
import { useNetwork } from './NetworkContext';
import { SongData } from '@/interfaces/Song';
import { Image } from 'react-native';
import { LibraryProvider, useLibrary } from './player/LibraryContext';
import { PlayerUIProvider, usePlayerUI } from './player/PlayerUIContext';
import { QueueProvider, useQueue } from './player/QueueContext';
import { PlaybackProvider, usePlayback } from './player/PlaybackContext';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOnline } = useNetwork();

  const storageHook = usePlayerStorage();
  const {
    favoriteArtists,
    recentPlayed,
    mostPlayed,
    artistPlays,
    songPlays,
    streak,
    videoQuality,
    setVideoQuality,
    toggleFavoriteArtist,
    isFavoriteArtist,
    addRecentPlayed,
    addMostPlayed,
  } = storageHook;

  const {
    playlists,
    playlistsHydrated,
    playlistSongsHydrated,
    defaultPlaylistId,
    getPlaylistSongs,
    createPlaylist,
    renamePlaylist,
    setPlaylistCover,
    setPlaylistDownload,
    deletePlaylist,
    reorderPlaylists,
    addSongToPlaylists,
    addSongsToPlaylists,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    isSongInPlaylist,
    songPlaylistIds,
    setPlaylistVisibility,
    followPlaylist,
    unfollowPlaylist,
    wantedSongs,
    allPlaylistSongs,
    songIsWanted,
    favorites,
    isFavorite,
    toggleFavorite,
  } = usePlaylists();

  const {
    downloadVersion,
    showDownloadBanner,
    syncProgress,
    webFolderMissing,
    requestWebFolder,
  } = usePlaylistDownloads({
    wantedSongs,
    allPlaylistSongs,
    hydrated: playlistsHydrated,
    songsHydrated: playlistSongsHydrated,
  });

  const [currentSong, setCurrentSong] = useState<SongData | null>(null);
  const {
    queue,
    setQueue,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    updateQueueAndSource,
    getNextSong,
    getPreviousSong,
  } = usePlayerQueue();

  const { preloadedSoundsRef, preloadNextSongs, clearPreloaded } = usePreloader();
  const updateQueueAndSourceRef = useRef(updateQueueAndSource);
  useEffect(() => {
    updateQueueAndSourceRef.current = updateQueueAndSource;
  }, [updateQueueAndSource]);

  const setIsIntendingToPlayRef = useRef<(value: boolean) => void>(() => {});

  const playSong = useCallback(async (song: SongData, initialQueue?: SongData[], source?: QueueSource, playlistId?: string) => {
    setCurrentSong(song);
    setIsIntendingToPlayRef.current(true);

    const artworkUrl = song.thumbnail?.url;
    const normalizedArtwork = typeof artworkUrl === 'string' && artworkUrl.length > 0
      ? artworkUrl.replace(/^http:\/\//, 'https://')
      : undefined;

    SafeMediaControl.updateMetadata({
      title: song.title,
      artist: song.channel?.name || 'Unknown Artist',
      duration: parseDuration(song.duration_formatted) / 1000,
      ...(normalizedArtwork ? { artwork: { uri: normalizedArtwork } } : {}),
    }).catch(() => {});

    const playPromise = playSongLogicRef.current!(song);
    const queueUpdatePromise = updateQueueAndSourceRef.current(song, initialQueue, source, playlistId);
    const [{ newSource }] = await Promise.all([queueUpdatePromise, playPromise]);

    try {
      await Promise.all([
        storage.setItem(CURRENT_SONG_KEY, JSON.stringify(song)),
        storage.setItem(QUEUE_SOURCE_KEY, newSource),
      ]);
    }
    catch (error) {
      console.error('Error persisting playback data:', error);
    }
  }, []);

  const playNext = useCallback(() => {
    const nextSong = getNextSong(currentSong);
    if (nextSong) playSong(nextSong);
  }, [getNextSong, currentSong, playSong]);

  const playPrevious = useCallback(() => {
    const prevSong = getPreviousSong(currentSong);
    if (prevSong) playSong(prevSong);
  }, [getPreviousSong, currentSong, playSong]);

  const {
    isPlaying,
    isIntendingToPlay,
    setIsIntendingToPlay,
    isLoading,
    progress,
    duration,
    setDuration,
    togglePlayPause,
    pause,
    seekTo,
    playSongLogicRef,
    cancelDownload,
    cleanupLocalFile,
    volume,
    setVolume,
  } = useAudioPlayer(
    currentSong,
    playNext,
    preloadedSoundsRef,
    addRecentPlayed,
    addMostPlayed,
    isOnline,
    songIsWanted,
  );

  setIsIntendingToPlayRef.current = setIsIntendingToPlay;

  const togglePlayPauseRef = useRef(togglePlayPause);
  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);
  const seekToRef = useRef(seekTo);

  useEffect(() => { togglePlayPauseRef.current = togglePlayPause; }, [togglePlayPause]);
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPreviousRef.current = playPrevious; }, [playPrevious]);
  useEffect(() => { seekToRef.current = seekTo; }, [seekTo]);

  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const sleepTimerRef = useRef<any>(null);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerState(minutes);
    if (minutes !== null) {
      const ms = minutes * 60 * 1000;
      sleepTimerRef.current = setTimeout(() => {
        pause();
        setSleepTimerState(null);
        sleepTimerRef.current = null;
      }, ms);
    }
  }, [pause]);

  useEffect(() => {
    const loadCurrentSong = async () => {
      try {
        const savedSong = await storage.getItem(CURRENT_SONG_KEY);
        if (savedSong) {
          const song = JSON.parse(savedSong);
          setCurrentSong(song);
          setDuration(parseDuration(song.duration_formatted));
        }
      } catch (error) {
        console.error('Error loading initial song:', error);
      }
    };
    loadCurrentSong();
  }, []);

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          allowsRecording: false,
          shouldPlayInBackground: true,
        });

        if (SafeMediaControl.isAvailable()) {
          await SafeMediaControl.enableMediaControls({
            capabilities: [
              Command.PLAY,
              Command.PAUSE,
              Command.NEXT_TRACK,
              Command.PREVIOUS_TRACK,
              Command.STOP,
              Command.SEEK,
            ].filter(Boolean),
            compactCapabilities: [
              Command.PREVIOUS_TRACK,
              Command.PLAY,
              Command.NEXT_TRACK,
            ].filter(Boolean),
            notification: { color: '#2c5af3' },
          });
          await SafeMediaControl.updatePlaybackState(PlaybackState.STOPPED, 0);
        }
      } catch (error) {
        console.warn('Error setting audio mode or media controls:', error);
      }
    };
    setupAudio();

    const removeListener = SafeMediaControl.addListener((event: any) => {
      switch (event.command) {
        case Command.PLAY:
        case Command.PAUSE:
          togglePlayPauseRef.current();
          break;
        case Command.NEXT_TRACK:
          playNextRef.current();
          break;
        case Command.PREVIOUS_TRACK:
          playPreviousRef.current();
          break;
        case Command.SEEK:
          if (event.data?.position !== undefined) {
            seekToRef.current(event.data.position * 1000);
          }
          break;
      }
    });

    return () => {
      removeListener();
      SafeMediaControl.disableMediaControls().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const updateMetadata = async () => {

      if (!currentSong) return;
      let artworkUri = currentSong.thumbnail?.url;

      try {
        const local = await localThumbFor(currentSong.id);
        if (local) artworkUri = local;
      }
      catch (e) {
        console.warn('Error checking local thumbnail for metadata:', e);
      }

      if (cancelled) return;
      const normalizedArtworkUri =
        typeof artworkUri === 'string' && artworkUri.length > 0
          ? artworkUri.replace(/^http:\/\//, 'https://')
          : undefined;

      const metadata: any = {
        title: currentSong.title,
        artist: currentSong.channel?.name || 'Unknown Artist',
        duration: parseDuration(currentSong.duration_formatted) / 1000,
      };

      if (normalizedArtworkUri) metadata.artwork = { uri: normalizedArtworkUri };
      SafeMediaControl.updateMetadata(metadata).catch(() => {});
    };

    updateMetadata();

    return () => { cancelled = true; };
  }, [currentSong, favorites]);

  useEffect(() => {
    if (currentSong && queue.length > 0) {
      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1) preloadNextSongs(queue, currentIndex, isOnline);
    }
  }, [currentSong?.id, queue, isOnline]);

  useEffect(() => {
    if (!currentSong?.id) return;
    cacheThumb(currentSong);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (currentIndex === -1) return;

    const candidates = [
      queue[(currentIndex + 1) % queue.length],
      queue[(currentIndex + 2) % queue.length],
    ];

    const seen = new Set<string>();
    for (const song of candidates) {
      const rawUrl = song?.thumbnail?.url;
      if (!rawUrl) continue;
      const url = rawUrl.replace(/^http:\/\//, 'https://');
      if (seen.has(url)) continue;
      seen.add(url);
      Image.prefetch(url).catch(() => {});
      if (song) cacheThumb(song);
    }
  }, [currentSong?.id, queue]);

  useEffect(() => {
    return () => {
      clearPreloaded();
      cancelDownload();
      cleanupLocalFile();
    };
  }, []);

  const onToggleShuffle = useCallback(() => toggleShuffle(currentSong), [toggleShuffle, currentSong]);

  const libraryValue = useMemo<LibraryContextType>(() => ({
    favorites,
    favoriteArtists,
    recentPlayed,
    mostPlayed,
    artistPlays,
    songPlays,
    toggleFavorite,
    toggleFavoriteArtist,
    isFavorite,
    isFavoriteArtist,
    downloadVersion,
    showDownloadBanner,
    streak,
    videoQuality,
    setVideoQuality,

    playlists,
    playlistsHydrated,
    defaultPlaylistId,
    getPlaylistSongs,
    createPlaylist,
    renamePlaylist,
    setPlaylistCover,
    setPlaylistDownload,
    deletePlaylist,
    reorderPlaylists,
    addSongToPlaylists,
    addSongsToPlaylists,
    removeSongFromPlaylist,
    reorderPlaylistSongs,
    isSongInPlaylist,
    songPlaylistIds,
    setPlaylistVisibility,
    followPlaylist,
    unfollowPlaylist,
    wantedSongs,
    songIsWanted,
    syncProgress,
    webFolderMissing,
    requestWebFolder,
  }), [
    favorites, favoriteArtists, recentPlayed, mostPlayed, artistPlays, songPlays,
    toggleFavorite, toggleFavoriteArtist, isFavorite, isFavoriteArtist,
    downloadVersion, showDownloadBanner, streak,
    videoQuality, setVideoQuality,
    playlists, playlistsHydrated, defaultPlaylistId, getPlaylistSongs,
    createPlaylist, renamePlaylist, setPlaylistCover, setPlaylistDownload,
    deletePlaylist, reorderPlaylists, addSongToPlaylists, addSongsToPlaylists, removeSongFromPlaylist,
    reorderPlaylistSongs, isSongInPlaylist, songPlaylistIds,
    setPlaylistVisibility, followPlaylist, unfollowPlaylist,
    wantedSongs, songIsWanted, syncProgress, webFolderMissing, requestWebFolder,
  ]);

  const playbackValue = useMemo<PlaybackContextType>(() => ({
    currentSong,
    setCurrentSong,
    playSong,
    isPlaying,
    isIntendingToPlay,
    togglePlayPause,
    pause,
    progress,
    duration,
    seekTo,
    isLoading,
    sleepTimer,
    setSleepTimer,
    volume,
    setVolume,
  }), [
    currentSong, playSong, isPlaying, isIntendingToPlay, togglePlayPause, pause,
    progress, duration, seekTo, isLoading, sleepTimer, setSleepTimer, volume, setVolume,
  ]);

  const queueValue = useMemo<QueueContextType>(() => ({
    queue,
    setQueue,
    playNext,
    playPrevious,
    isShuffle,
    toggleShuffle: onToggleShuffle,
    repeatMode,
    toggleRepeat,
  }), [queue, setQueue, playNext, playPrevious, isShuffle, onToggleShuffle, repeatMode, toggleRepeat]);

  return (
    <LibraryProvider value={libraryValue}>
      <PlayerUIProvider>
        <PlaybackProvider value={playbackValue}>
          <QueueProvider value={queueValue}>
            {children}
          </QueueProvider>
        </PlaybackProvider>
      </PlayerUIProvider>
    </LibraryProvider>
  );
};

export const usePlayer = () => {
  const playback = usePlayback();
  const queue = useQueue();
  const library = useLibrary();
  const ui = usePlayerUI();
  return { ...playback, ...queue, ...library, ...ui };
};

export { useLibrary, usePlayback, useQueue, usePlayerUI };
