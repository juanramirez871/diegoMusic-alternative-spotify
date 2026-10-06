import { ArtistData, SongData } from "@/interfaces/Song";
import type { PlaylistMeta } from "@/interfaces/Playlist";


export const CURRENT_SONG_KEY = '@current_song';
export const FAVORITES_KEY = '@favorites_songs';
export const FAVORITE_ARTISTS_KEY = '@favorite_artists';
export const RECENT_PLAYED_KEY = '@last_music_played';
export const MOST_PLAYED_KEY = '@most_played_songs';
export const FAVORITES_QUEUE_KEY = '@player_favorites_queue';
export const FAVORITES_DEFAULT_QUEUE_KEY = '@player_favorites_default_queue';
export const SEARCH_QUEUE_KEY = '@player_search_queue';
export const SEARCH_DEFAULT_QUEUE_KEY = '@player_search_default_queue';
export const QUEUE_SOURCE_KEY = '@player_queue_source';
export const SHUFFLE_KEY = '@player_shuffle';
export const REPEAT_KEY = '@player_repeat';
export const ACTIVE_DAYS_KEY = '@player_active_days';
export const ARTIST_PLAYS_KEY = '@artist_plays';
export const SONG_PLAYS_KEY = '@song_plays';
export const VIDEO_QUALITY_KEY = '@video_quality';
export const PLAYLISTS_KEY = '@playlists';
export const PLAYLIST_SONGS_PREFIX = '@playlist_songs_';
export const PLAYLIST_ID_MAP_KEY = '@playlist_local_id_map';
export const PENDING_PLAYLIST_OPS_KEY = '@pending_playlist_ops';
export const PLAYLIST_MIGRATION_DONE_KEY = '@player_migration_playlists_done';
export const PLAYLIST_QUEUE_KEY = '@player_playlist_queue';
export const PLAYLIST_DEFAULT_QUEUE_KEY = '@player_playlist_default_queue';
export type RepeatMode = 'off' | 'all' | 'one';
export type VideoQuality = 'low' | 'medium' | 'high';
export type QueueSource = 'playlist' | 'search';

export interface ArtistPlayData {
  name: string;
  avatar: string;
  count: number;
}

export interface SongPlayData {
  id: string;
  url: string;
  title: string;
  duration_formatted: string;
  thumbnail: { url: string };
  channel: { name: string };
  timesPlayed: number;
}

export interface PlaybackContextType {
  currentSong: SongData | null;
  setCurrentSong: (song: SongData | null) => void;
  playSong: (song: SongData, initialQueue?: SongData[], source?: QueueSource, playlistId?: string) => void;
  isPlaying: boolean;
  isIntendingToPlay: boolean;
  togglePlayPause: () => void;
  pause: () => Promise<void>;
  progress: number;
  duration: number;
  seekTo: (position: number) => void;
  isLoading: boolean;
  sleepTimer: number | null;
  setSleepTimer: (minutes: number | null) => void;
  volume: number;
  setVolume: (vol: number) => void;
}

export interface QueueContextType {
  queue: SongData[];
  setQueue: (queue: SongData[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  repeatMode: RepeatMode;
  toggleRepeat: () => void;
}

export interface LibraryContextType {
  favorites: SongData[];
  favoriteArtists: ArtistData[];
  recentPlayed: SongData[];
  mostPlayed: SongData[];
  artistPlays: Record<string, ArtistPlayData>;
  songPlays: Record<string, SongPlayData>;
  toggleFavorite: (song: SongData) => void;
  toggleFavoriteArtist: (artist: ArtistData) => void;
  isFavorite: (songId: string) => boolean;
  isFavoriteArtist: (artistId: string) => boolean;
  downloadVersion: number;
  showDownloadBanner: boolean;
  streak: number;
  videoQuality: VideoQuality;
  setVideoQuality: (quality: VideoQuality) => void;
  playlists: PlaylistMeta[];
  playlistsHydrated: boolean;
  defaultPlaylistId: string | null;
  wantedSongs: SongData[];
  songIsWanted: (songId: string) => boolean;
  syncProgress: { done: number; total: number } | null;
  webFolderMissing: boolean;
  requestWebFolder: () => Promise<boolean>;
  getPlaylistSongs: (playlistId: string) => Promise<SongData[]>;
  createPlaylist: (name: string, coverUrl?: string | null) => Promise<string | null>;
  renamePlaylist: (playlistId: string, name: string) => Promise<void>;
  setPlaylistCover: (playlistId: string, coverUrl: string | null) => Promise<void>;
  setPlaylistDownload: (playlistId: string, enabled: boolean) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  reorderPlaylists: (orderedIds: string[]) => Promise<void>;
  addSongToPlaylists: (song: SongData, playlistIds: string[]) => Promise<void>;
  addSongsToPlaylists: (songs: SongData[], playlistIds: string[]) => Promise<{ added: number; failed: number }>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylistSongs: (playlistId: string, orderedSongIds: string[]) => Promise<void>;
  isSongInPlaylist: (playlistId: string, songId: string) => boolean;
  songPlaylistIds: (songId: string) => string[];
  setPlaylistVisibility: (playlistId: string, visibility: 'private' | 'public') => Promise<boolean>;
  followPlaylist: (pub: {
    id: number;
    name: string;
    coverUrl: string | null;
    previewThumbnails: string[];
    songCount: number;
    savesCount: number;
    owner: { name: string; avatar?: string };
  }) => Promise<string>;
  unfollowPlaylist: (playlistId: string) => Promise<void>;
}

export interface PlayerUIContextType {
  isMaximized: boolean;
  setIsMaximized: (value: boolean) => void;
  pendingArtistOverlay: { id: string; name: string } | null;
  openArtistOverlay: (artist: { id: string; name: string }) => void;
  closeArtistOverlay: () => void;
}

export type PlayerContextType =
  & PlaybackContextType
  & QueueContextType
  & LibraryContextType
  & PlayerUIContextType;
