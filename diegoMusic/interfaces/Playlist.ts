import type { SongData } from '@/interfaces/Song';

export type PlaylistKind = 'owned' | 'followed';
export type PlaylistVisibility = 'private' | 'public';

export interface PlaylistOwner {
  name: string;
  avatar?: string;
}

export interface PlaylistMeta {
  id: string;
  serverId?: number;
  name: string;
  coverUrl?: string | null;
  isDefault: boolean;
  downloadEnabled: boolean;
  position: number;
  songCount: number;
  previewThumbnails: string[];
  kind: PlaylistKind;
  visibility: PlaylistVisibility;
  readOnly: boolean;
  slug?: string | null;
  savesCount?: number;
  unavailable?: boolean;
  owner?: PlaylistOwner | null;
}

export interface Playlist extends PlaylistMeta {
  songs: SongData[];
}

export interface PlaylistApiMeta {
  id: number;
  name: string;
  coverUrl: string | null;
  isDefault: boolean;
  downloadEnabled: boolean;
  position: number;
  songCount: number;
  previewThumbnails: string[];
  kind: PlaylistKind;
  visibility: PlaylistVisibility;
  readOnly: boolean;
  slug: string | null;
  savesCount: number;
  unavailable?: boolean;
  owner?: PlaylistOwner | null;
}

export interface PlaylistApiDetail extends PlaylistApiMeta {
  songs: SongData[];
}

export interface PublicPlaylistResult {
  id: number;
  slug: string;
  name: string;
  owner: PlaylistOwner;
  coverUrl: string | null;
  previewThumbnails: string[];
  songCount: number;
  savesCount: number;
  isFollowing: boolean;
  isOwner: boolean;
}

export interface PublicPlaylistDetail {
  id: number;
  slug: string | null;
  name: string;
  coverUrl: string | null;
  visibility: PlaylistVisibility;
  savesCount: number;
  owner: PlaylistOwner;
  isOwner: boolean;
  isFollowing: boolean;
  songCount: number;
  previewThumbnails: string[];
  songs: SongData[];
}

export type PendingPlaylistOp =
  | { type: 'create'; localId: string; name: string; coverUrl?: string | null; ts: number }
  | { type: 'update'; localId: string; patch: Partial<Pick<PlaylistMeta, 'name' | 'coverUrl' | 'downloadEnabled' | 'position'>>; ts: number }
  | { type: 'delete'; localId: string; ts: number }
  | { type: 'reorder'; order: string[]; ts: number }
  | { type: 'addSong'; localId: string; song: SongData; ts: number }
  | { type: 'removeSong'; localId: string; songId: string; ts: number }
  | { type: 'reorderSongs'; localId: string; order: string[]; ts: number }
  | { type: 'uploadCover'; localId: string; localUri: string; ts: number };

/** Outcome of uploading a playlist cover image. */
export type CoverUploadResult =
  | { status: 'uploaded'; coverUrl: string }
  /** Network, server or session problem: keep it queued and try again later. */
  | { status: 'retry' }
  /** The server refused the image itself (or it no longer exists): retrying won't help. */
  | { status: 'rejected' };

/** What happened to a cover change requested from the UI. */
export type CoverChangeResult = 'saved' | 'queued' | 'rejected';
