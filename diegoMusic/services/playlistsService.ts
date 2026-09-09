import AsyncStorage from '@react-native-async-storage/async-storage';
import apiFetch from './api';
import { API_URL } from './apiUrl';
import type { SongData } from '@/interfaces/Song';
import type {
  PlaylistApiMeta,
  PlaylistApiDetail,
  PlaylistVisibility,
  PublicPlaylistResult,
  PublicPlaylistDetail,
} from '@/interfaces/Playlist';

const songBody = (song: SongData) => ({
  youtubeId: song.id,
  title: song.title,
  thumbnailUrl: song.thumbnail?.url ?? '',
  durationFormatted: song.duration_formatted,
  channelId: song.channel?.id ?? '',
  channelName: song.channel?.name ?? '',
  channelAvatar: song.channel?.avatar ?? song.channel?.icon ?? '',
});

export const playlistsService = {
  async fetchAll(): Promise<PlaylistApiMeta[] | null> {
    try {
      const data = await apiFetch<{ playlists: PlaylistApiMeta[] }>('/playlists');
      return data.playlists ?? [];
    }
    catch {
      return null;
    }
  },

  async fetchOne(serverId: number): Promise<PlaylistApiDetail | null> {
    try {
      return await apiFetch<PlaylistApiDetail>(`/playlists/${serverId}`);
    }
    catch {
      return null;
    }
  },

  async create(name: string, coverUrl?: string | null): Promise<PlaylistApiMeta | null> {
    try {
      return await apiFetch<PlaylistApiMeta>('/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, coverUrl: coverUrl ?? null }),
      });
    }
    catch (err) {
      console.warn('[Playlists] create failed:', err);
      return null;
    }
  },

  async update(
    serverId: number,
    patch: { name?: string; coverUrl?: string | null; downloadEnabled?: boolean; position?: number },
  ): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] update failed:', err);
      return false;
    }
  },

  async remove(serverId: number): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}`, { method: 'DELETE' });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] remove failed:', err);
      return false;
    }
  },

  async reorder(serverIds: number[]): Promise<boolean> {
    try {
      await apiFetch('/playlists/reorder', { method: 'PATCH', body: JSON.stringify({ order: serverIds }) });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] reorder failed:', err);
      return false;
    }
  },

  async addSong(serverId: number, song: SongData): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}/songs`, { method: 'POST', body: JSON.stringify(songBody(song)) });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] addSong failed:', err);
      return false;
    }
  },

  async removeSong(serverId: number, youtubeId: string): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}/songs/${encodeURIComponent(youtubeId)}`, { method: 'DELETE' });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] removeSong failed:', err);
      return false;
    }
  },

  async reorderSongs(serverId: number, youtubeIds: string[]): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}/songs/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: youtubeIds }),
      });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] reorderSongs failed:', err);
      return false;
    }
  },

  /**
   * Uploads a local image as the playlist cover (multipart). Returns the
   * absolute cover URL from the server, or null on failure.
   */
  async uploadCover(serverId: number, localUri: string): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      const name = localUri.split('/').pop() || 'cover.jpg';
      const ext = (name.split('.').pop() || 'jpg').toLowerCase();
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      const form = new FormData();
      // React Native FormData file shape.
      form.append('cover', { uri: localUri, name, type } as any);

      const res = await fetch(`${API_URL}/playlists/${serverId}/cover`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return data.coverUrl ?? null;
    }
    catch (err) {
      console.warn('[Playlists] uploadCover failed:', err);
      return null;
    }
  },

  async deleteCover(serverId: number): Promise<boolean> {
    try {
      await apiFetch(`/playlists/${serverId}/cover`, { method: 'DELETE' });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] deleteCover failed:', err);
      return false;
    }
  },

  async setVisibility(serverId: number, visibility: PlaylistVisibility): Promise<PlaylistApiMeta | null> {
    try {
      return await apiFetch<PlaylistApiMeta>(`/playlists/${serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
      });
    }
    catch (err) {
      console.warn('[Playlists] setVisibility failed:', err);
      return null;
    }
  },

  async searchPublic(q: string, limit = 6): Promise<PublicPlaylistResult[] | null> {
    try {
      const data = await apiFetch<{ playlists: PublicPlaylistResult[] }>(
        `/playlists/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      );
      return data.playlists ?? [];
    }
    catch {
      return null;
    }
  },

  async fetchPublic(idOrSlug: string | number): Promise<PublicPlaylistDetail | null> {
    try {
      return await apiFetch<PublicPlaylistDetail>(
        `/playlists/public/${encodeURIComponent(String(idOrSlug))}`,
      );
    }
    catch {
      return null;
    }
  },

  async follow(serverId: number): Promise<boolean> {
    try {
      await apiFetch(`/playlists/public/${serverId}/follow`, { method: 'POST' });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] follow failed:', err);
      return false;
    }
  },

  async unfollow(serverId: number): Promise<boolean> {
    try {
      await apiFetch(`/playlists/public/${serverId}/follow`, { method: 'DELETE' });
      return true;
    }
    catch (err) {
      console.warn('[Playlists] unfollow failed:', err);
      return false;
    }
  },
};
