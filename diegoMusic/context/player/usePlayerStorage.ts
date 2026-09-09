import storage from '@/services/storage';
import { useEffect, useState } from 'react';
import {
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
import { favoriteArtistsService } from '@/services/favoriteArtistsService';
import { songsPlayedService } from '@/services/songsPlayedService';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';

export const usePlayerStorage = () => {

  const { token } = useAuth();
  const { isOnline } = useNetwork();
  const [favoriteArtists, setFavoriteArtists] = useState<ArtistData[]>([]);
  const [recentPlayed, setRecentPlayed] = useState<SongData[]>([]);
  const [mostPlayed, setMostPlayed] = useState<SongData[]>([]);
  const [artistPlays, setArtistPlays] = useState<Record<string, ArtistPlayData>>({});
  const [songPlays, setSongPlays] = useState<Record<string, SongPlayData>>({});
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [
          savedArtists,
          savedRecent,
          savedMostPlayed,
          savedActiveDays,
          savedArtistPlays,
          savedSongPlays,
          savedVideoQuality,
        ] = await Promise.all([
          storage.getItem(FAVORITE_ARTISTS_KEY),
          storage.getItem(RECENT_PLAYED_KEY),
          storage.getItem(MOST_PLAYED_KEY),
          storage.getItem(ACTIVE_DAYS_KEY),
          storage.getItem(ARTIST_PLAYS_KEY),
          storage.getItem(SONG_PLAYS_KEY),
          storage.getItem(VIDEO_QUALITY_KEY),
        ]);

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

  return {
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
  };
};
