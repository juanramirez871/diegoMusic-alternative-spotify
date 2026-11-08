import apiFetch, { getToken, isPermanentFailure } from './api';
import { API_URL } from './apiUrl';
import { authEvents } from './authEvents';
import type { SongData } from '@/interfaces/Song';
import { coverFormData } from '@/utils/coverImage';
import { resolveCoverUrl } from '@/utils/playlistCover';
import type {
  CoverUploadResult,
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

/**
 * Runs a mutation and reports whether it is settled: true once the server applied
 * it or refused it for good, false when it failed transiently and must be retried.
 */
async function settle(label: string, request: () => Promise<unknown>): Promise<boolean> {
  try {
    await request();
    return true;
  }
  catch (err) {
    console.warn(`[Playlists] ${label} failed:`, err);
    return isPermanentFailure(err);
  }
}

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

  update(
    serverId: number,
    patch: { name?: string; coverUrl?: string | null; downloadEnabled?: boolean; position?: number },
  ): Promise<boolean> {
    return settle('update', () =>
      apiFetch(`/playlists/${serverId}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    );
  },

  remove(serverId: number): Promise<boolean> {
    return settle('remove', () =>
      apiFetch(`/playlists/${serverId}`, { method: 'DELETE' }),
    );
  },

  reorder(serverIds: number[]): Promise<boolean> {
    return settle('reorder', () =>
      apiFetch('/playlists/reorder', { method: 'PATCH', body: JSON.stringify({ order: serverIds }) }),
    );
  },

  addSong(serverId: number, song: SongData): Promise<boolean> {
    return settle('addSong', () =>
      apiFetch(`/playlists/${serverId}/songs`, { method: 'POST', body: JSON.stringify(songBody(song)) }),
    );
  },

  removeSong(serverId: number, youtubeId: string): Promise<boolean> {
    return settle('removeSong', () =>
      apiFetch(`/playlists/${serverId}/songs/${encodeURIComponent(youtubeId)}`, { method: 'DELETE' }),
    );
  },

  reorderSongs(serverId: number, youtubeIds: string[]): Promise<boolean> {
    return settle('reorderSongs', () =>
      apiFetch(`/playlists/${serverId}/songs/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ order: youtubeIds }),
      }),
    );
  },

  /** Uploads a local image (file:, data: or blob: URI) as the playlist cover. */
  async uploadCover(serverId: number, localUri: string): Promise<CoverUploadResult> {
    const body = await coverFormData(localUri);
    if (!body) return { status: 'rejected' };

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/playlists/${serverId}/cover`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const coverUrl = resolveCoverUrl(data.coverUrl);
        return coverUrl ? { status: 'uploaded', coverUrl } : { status: 'retry' };
      }
      if (res.status === 401 && token) authEvents.notifySessionExpired();
      // 400: unsupported or too large image; 404: the playlist no longer exists.
      return res.status === 400 || res.status === 404 || res.status === 413
        ? { status: 'rejected' }
        : { status: 'retry' };
    }
    catch (err) {
      console.warn('[Playlists] uploadCover failed:', err);
      return { status: 'retry' };
    }
  },

  deleteCover(serverId: number): Promise<boolean> {
    return settle('deleteCover', () =>
      apiFetch(`/playlists/${serverId}/cover`, { method: 'DELETE' }),
    );
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
