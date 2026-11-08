import type { LanguageContextValue } from '@/interfaces/language';
import type { PlaylistMeta } from '@/interfaces/Playlist';

/** Default (favorites) playlist first, then by position, newest first. */
export const sortPlaylists = (playlists: PlaylistMeta[]): PlaylistMeta[] =>
  [...playlists].sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.position - a.position;
  });

/** Secondary line for a playlist: availability, author or song count. */
export const getPlaylistSubtitle = (playlist: PlaylistMeta, t: LanguageContextValue['t']): string => {
  if (playlist.unavailable) return t('playlist.unavailable');
  if (playlist.kind === 'followed' && playlist.owner) {
    return t('playlist.byAuthor', { author: playlist.owner.name });
  }
  return t('playlist.songCount', { count: playlist.songCount });
};
