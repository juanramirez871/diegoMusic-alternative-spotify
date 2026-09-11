import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import storage from '@/services/storage';
import { playlistsService } from '@/services/playlistsService';
import { pendingPlaylistOps } from '@/services/pendingPlaylistOps';
import { useAuth } from '@/context/AuthContext';
import { useNetwork } from '@/context/NetworkContext';
import type { SongData } from '@/interfaces/Song';
import type {
  PlaylistMeta,
  PlaylistApiMeta,
  PendingPlaylistOp,
} from '@/interfaces/Playlist';
import {
  FAVORITES_KEY,
  PLAYLISTS_KEY,
  PLAYLIST_SONGS_PREFIX,
  PLAYLIST_ID_MAP_KEY,
  PLAYLIST_MIGRATION_DONE_KEY,
} from './types';

const DEFAULT_NAME = 'Favoritos';

const uuid = () =>
  'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);

const songsKey = (id: string) => `${PLAYLIST_SONGS_PREFIX}${id}`;

const previewFrom = (songs: SongData[]) =>
  songs.map((s) => s.thumbnail?.url).filter(Boolean).slice(0, 4) as string[];

const makeOwnedMeta = (over: Partial<PlaylistMeta> & Pick<PlaylistMeta, 'id' | 'name'>): PlaylistMeta => ({
  coverUrl: null,
  isDefault: false,
  downloadEnabled: false,
  position: 0,
  songCount: 0,
  previewThumbnails: [],
  kind: 'owned',
  visibility: 'private',
  readOnly: false,
  slug: null,
  savesCount: 0,
  unavailable: false,
  owner: null,
  ...over,
});

const metaFromApi = (p: PlaylistApiMeta): PlaylistMeta => ({
  id: String(p.id),
  serverId: p.id,
  name: p.name,
  coverUrl: p.coverUrl,
  isDefault: p.isDefault,
  downloadEnabled: p.downloadEnabled,
  position: p.position,
  songCount: p.songCount,
  previewThumbnails: p.previewThumbnails ?? [],
  kind: p.kind ?? 'owned',
  visibility: p.visibility ?? 'private',
  readOnly: p.readOnly ?? false,
  slug: p.slug ?? null,
  savesCount: p.savesCount ?? 0,
  unavailable: p.unavailable ?? false,
  owner: p.owner ?? null,
});

type SessionSnapshot = {
  playlists: PlaylistMeta[] | null;
  songs: Record<string, SongData[]>;
  idMap: Record<string, number>;
  /** True once every playlist's persisted songs have been read from storage. */
  songsHydrated: boolean;
};

// Kept on globalThis so a Fast Refresh (dev) or a re-require of this module does
// NOT wipe the in-memory copy — that's what makes the playlists screen paint
// instantly on re-entry instead of flashing empty.
const g = globalThis as unknown as { __diegoPlaylistSnapshot?: SessionSnapshot };
const sessionSnapshot: SessionSnapshot =
  g.__diegoPlaylistSnapshot ??
  (g.__diegoPlaylistSnapshot = {
    playlists: null,
    songs: {},
    idMap: {},
    songsHydrated: false,
  });

export const usePlaylists = () => {
  const { token } = useAuth();
  const { isOnline } = useNetwork();

  const [playlists, setPlaylists] = useState<PlaylistMeta[]>(
    () => sessionSnapshot.playlists ?? [],
  );
  const [hydrated, setHydrated] = useState(() => sessionSnapshot.playlists !== null);
  const [songsCache, setSongsCache] = useState<Record<string, SongData[]>>(
    () => sessionSnapshot.songs,
  );
  // Distinct from `hydrated`: the playlist *list* can be ready a tick before the
  // per-playlist songs are read back from storage. The download sync must not
  // prune files until this is true, or it deletes everything as "unwanted".
  const [songsHydrated, setSongsHydrated] = useState(() => sessionSnapshot.songsHydrated);

  const [, setRev] = useState(0);
  const bump = () => setRev((r) => r + 1);
  const idMapRef = useRef<Record<string, number>>({});
  const playlistsRef = useRef<PlaylistMeta[]>([]);
  playlistsRef.current = playlists;
  const songsCacheRef = useRef<Record<string, SongData[]>>({});
  songsCacheRef.current = songsCache;

  const persistMeta = useCallback(async (list: PlaylistMeta[]) => {
    sessionSnapshot.playlists = list;
    try {
      await storage.setItem(PLAYLISTS_KEY, JSON.stringify(list));
    }
    catch (err) {
      console.warn('[Playlists] persist meta failed:', err);
    }
  }, []);

  const persistSongs = useCallback(async (id: string, songs: SongData[]) => {
    sessionSnapshot.songs = { ...sessionSnapshot.songs, [id]: songs };
    try {
      await storage.setItem(songsKey(id), JSON.stringify(songs));
    }
    catch (err) {
      console.warn('[Playlists] persist songs failed:', err);
    }
  }, []);

  const persistIdMap = useCallback(async () => {
    sessionSnapshot.idMap = { ...idMapRef.current };
    try {
      await storage.setItem(PLAYLIST_ID_MAP_KEY, JSON.stringify(idMapRef.current));
    }
    catch {
      /* noop */
    }
  }, []);

  const setLocalSongs = useCallback((id: string, songs: SongData[]) => {
    setSongsCache((c) => ({ ...c, [id]: songs }));
    persistSongs(id, songs);
    setPlaylists((list) => {
      const next = list.map((p) =>
        p.id === id
          ? { ...p, songCount: songs.length, previewThumbnails: previewFrom(songs) }
          : p,
      );
      persistMeta(next);
      return next;
    });
  }, [persistMeta, persistSongs]);

  const serverIdOf = useCallback((id: string): number | undefined => {
    const p = playlistsRef.current.find((x) => x.id === id);
    return p?.serverId ?? idMapRef.current[id];
  }, []);

  const [hydrateSeq, setHydrateSeq] = useState(0);
  useEffect(() => {
    let alive = true;

    if (sessionSnapshot.playlists !== null) {
      idMapRef.current = { ...sessionSnapshot.idMap };
      setHydrated(true);
      if (sessionSnapshot.songsHydrated) setSongsHydrated(true);
      return () => { alive = false; };
    }

    const hydrate = async () => {
      try {
        const [rawPlaylists, rawIdMap] = await Promise.all([
          storage.getItem(PLAYLISTS_KEY),
          storage.getItem(PLAYLIST_ID_MAP_KEY),
        ]);

        if (rawIdMap) {
          try { idMapRef.current = JSON.parse(rawIdMap) ?? {}; }
          catch { idMapRef.current = {}; }
        }
        sessionSnapshot.idMap = { ...idMapRef.current };

        let list: PlaylistMeta[] = rawPlaylists ? JSON.parse(rawPlaylists) : [];
        if (list.length === 0)
        {
          const migrationDone = await storage.getItem(PLAYLIST_MIGRATION_DONE_KEY);
          const rawFav = await storage.getItem(FAVORITES_KEY);
          const favSongs: SongData[] = rawFav ? JSON.parse(rawFav) : [];

          const defaultId = uuid();
          const defaultMeta = makeOwnedMeta({
            id: defaultId,
            name: DEFAULT_NAME,
            isDefault: true,
            downloadEnabled: true,
            songCount: favSongs.length,
            previewThumbnails: previewFrom(favSongs),
          });
          list = [defaultMeta];
          await persistMeta(list);
          await persistSongs(defaultId, favSongs);
          if (!migrationDone) await storage.setItem(PLAYLIST_MIGRATION_DONE_KEY, '1');
          if (alive) {
            setSongsCache({ [defaultId]: favSongs });
            sessionSnapshot.songsHydrated = true;
            setSongsHydrated(true);
          }
        }

        if (!list.some((p) => p.isDefault)) {
          const defaultId = uuid();
          list = [
            makeOwnedMeta({
              id: defaultId,
              name: DEFAULT_NAME,
              isDefault: true,
              downloadEnabled: true,
            }),
            ...list,
          ];
          await persistMeta(list);
        }

        list = list.map((p) => ({ ...makeOwnedMeta({ id: p.id, name: p.name }), ...p }));
        if (!alive) return;
        sessionSnapshot.playlists = list;
        setPlaylists(list);
        setHydrated(true);
        Promise.all(
          list.map(async (p) => {
            const raw = await storage.getItem(songsKey(p.id));
            return [p.id, raw ? (JSON.parse(raw) as SongData[]) : []] as const;
          }),
        )
        .then((entries) => {
          if (!alive) return;
          setSongsCache((prev) => {
            const next = { ...prev };
            for (const [id, songs] of entries) if (!next[id]) next[id] = songs;
            sessionSnapshot.songs = next;
            return next;
          });
        })
        .finally(() => {
          if (!alive) return;
          // Every playlist's persisted songs have now been read (or failed to,
          // in which case an empty cache is the truth). Only now is it safe for
          // the download layer to prune "unwanted" files.
          sessionSnapshot.songsHydrated = true;
          setSongsHydrated(true);
        });
      }
      catch (err) {
        console.error('[Playlists] hydrate error:', err);
        if (alive) {
          setHydrated(true);
          sessionSnapshot.songsHydrated = true;
          setSongsHydrated(true);
        }
      }
    };

    hydrate();
    return () => { alive = false; };
  }, [persistMeta, persistSongs, hydrateSeq]);

  const prevTokenRef = useRef(token);
  useEffect(() => {
    if (prevTokenRef.current && !token) {
      sessionSnapshot.playlists = null;
      sessionSnapshot.songs = {};
      sessionSnapshot.idMap = {};
      sessionSnapshot.songsHydrated = false;
      idMapRef.current = {};
      setPlaylists([]);
      setSongsCache({});
      setHydrated(false);
      setSongsHydrated(false);
      setHydrateSeq((n) => n + 1);
    }
    prevTokenRef.current = token;
  }, [token]);

  const reconcilingRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !token || !isOnline) return;
    if (reconcilingRef.current) return;
    reconcilingRef.current = true;

    const run = async () => {
      try {
        await drainPendingOps();
        await pullFromServer();
      }
      catch (err) {
        console.warn('[Playlists] reconcile error:', err);
      }
      finally {
        reconcilingRef.current = false;
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token, isOnline]);

  const drainPendingOps = useCallback(async () => {
    const ops = await pendingPlaylistOps.all();
    if (ops.length === 0) return;

    const remaining: PendingPlaylistOp[] = [];

    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      try {
        if (op.type === 'create')
        {
          const created = await playlistsService.create(op.name, op.coverUrl);
          if (created) {
            idMapRef.current[op.localId] = created.id;
            idMapRef.current[String(created.id)] = created.id;
            await persistIdMap();
            setPlaylists((list) => {
              const next = list.map((p) =>
                p.id === op.localId ? { ...p, serverId: created.id } : p,
              );
              persistMeta(next);
              return next;
            });
          }
          else {
            remaining.push(op);
          }
        }
        else {
          const sid = serverIdOf(op.type === 'reorder' ? '' : (op as any).localId)
            ?? idMapRef.current[(op as any).localId];
          if (op.type === 'reorder') {
            const serverIds = op.order
              .map((id) => serverIdOf(id) ?? idMapRef.current[id])
              .filter((n): n is number => Number.isFinite(n));
            if (serverIds.length > 0) await playlistsService.reorder(serverIds);
          }
          else if (!sid) {
            remaining.push(op);
          }
          else if (op.type === 'update') {
            await playlistsService.update(sid, op.patch);
          }
          else if (op.type === 'delete') {
            await playlistsService.remove(sid);
          }
          else if (op.type === 'addSong') {
            await playlistsService.addSong(sid, op.song);
          }
          else if (op.type === 'removeSong') {
            await playlistsService.removeSong(sid, op.songId);
          }
          else if (op.type === 'reorderSongs') {
            await playlistsService.reorderSongs(sid, op.order);
          }
          else if (op.type === 'uploadCover') {
            const remoteUrl = await playlistsService.uploadCover(sid, op.localUri);
            if (remoteUrl) {
              setPlaylists((list) => {
                const next = list.map((p) =>
                  p.id === op.localId ? { ...p, coverUrl: remoteUrl } : p,
                );
                persistMeta(next);
                return next;
              });
            }
            else {
              remaining.push(op);
            }
          }
        }
      }
      catch (err) {
        console.warn('[Playlists] drain op failed, keeping:', op.type, err);
        remaining.push(op);
      }
    }

    await pendingPlaylistOps.set(remaining);
  }, [persistIdMap, persistMeta, serverIdOf]);

  const pullFromServer = useCallback(async () => {
    const apiList = await playlistsService.fetchAll();
    if (!apiList) return;

    const local = playlistsRef.current;
    const localDefault = local.find((p) => p.isDefault);

    let merged: PlaylistMeta[] = apiList.map((p) => {
      const m = metaFromApi(p);
      if (m.isDefault && localDefault && localDefault.serverId == null) {
        idMapRef.current[localDefault.id] = p.id;
        return { ...m, id: localDefault.id };
      }
      return m;
    });

    const localIds = local.map((p) => p.id).sort().join(',');
    const mergedIds = merged.map((p) => p.id).sort().join(',');
    if (localIds === mergedIds && local.length > 0) {
      const byId = new Map(merged.map((m) => [m.id, m]));
      merged = local.map((p) => byId.get(p.id) ?? p);
    }

    await persistIdMap();
    setPlaylists(merged);
    await persistMeta(merged);
    const def = merged.find((p) => p.isDefault);
    if (def?.serverId != null) {
      const detail = await playlistsService.fetchOne(def.serverId);
      if (detail) setLocalSongs(def.id, detail.songs);
    }
    bump();
  }, [persistIdMap, persistMeta, setLocalSongs]);

  const isFollowed = useCallback(
    (playlistId: string) => playlistsRef.current.find((p) => p.id === playlistId)?.kind === 'followed',
    [],
  );

  const fetchSongsFromServer = useCallback(async (playlistId: string): Promise<SongData[] | null> => {
    const sid = serverIdOf(playlistId);
    if (sid == null || !token || !isOnline) return null;
    if (isFollowed(playlistId)) {
      const pub = await playlistsService.fetchPublic(sid);
      return pub ? pub.songs : null;
    }
    const d = await playlistsService.fetchOne(sid);
    return d ? d.songs : null;
  }, [isFollowed, isOnline, serverIdOf, token]);

  const getPlaylistSongs = useCallback(async (playlistId: string): Promise<SongData[]> => {
    const cached = songsCacheRef.current[playlistId];
    if (cached)
    {
      fetchSongsFromServer(playlistId).then((songs) => {
        if (songs) setLocalSongs(playlistId, songs);
      });
      return cached;
    }
    const raw = await storage.getItem(songsKey(playlistId));
    const local: SongData[] = raw ? JSON.parse(raw) : [];
    if (local.length > 0) {
      setSongsCache((c) => ({ ...c, [playlistId]: local }));
      return local;
    }
    const songs = await fetchSongsFromServer(playlistId);
    if (songs) {
      setLocalSongs(playlistId, songs);
      return songs;
    }
    return local;
  }, [fetchSongsFromServer, setLocalSongs]);

  const createPlaylist = useCallback(async (name: string, coverUrl: string | null = null): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const localId = uuid();
    const maxPos = playlistsRef.current.reduce((m, p) => Math.max(m, p.position), 0);
    const meta = makeOwnedMeta({ id: localId, name: trimmed, coverUrl, position: maxPos + 1 });
    const next = [...playlistsRef.current, meta];
    setPlaylists(next);
    await persistMeta(next);
    await persistSongs(localId, []);
    setSongsCache((c) => ({ ...c, [localId]: [] }));

    if (token && isOnline) {
      const created = await playlistsService.create(trimmed, coverUrl);
      if (created) {
        idMapRef.current[localId] = created.id;
        await persistIdMap();
        setPlaylists((list) => {
          const withServer = list.map((p) => (p.id === localId ? { ...p, serverId: created.id } : p));
          persistMeta(withServer);
          return withServer;
        });
        return localId;
      }
    }
    await pendingPlaylistOps.enqueue({ type: 'create', localId, name: trimmed, coverUrl, ts: Date.now() });
    return localId;
  }, [isOnline, persistIdMap, persistMeta, persistSongs, token]);

  const applyMetaPatch = useCallback(async (
    playlistId: string,
    patch: Partial<Pick<PlaylistMeta, 'name' | 'coverUrl' | 'downloadEnabled' | 'position'>>,
  ) => {
    setPlaylists((list) => {
      const next = list.map((p) => (p.id === playlistId ? { ...p, ...patch } : p));
      persistMeta(next);
      return next;
    });
    const sid = serverIdOf(playlistId);
    if (sid != null && token && isOnline) {
      const ok = await playlistsService.update(sid, patch);
      if (ok) return;
    }
    await pendingPlaylistOps.enqueue({ type: 'update', localId: playlistId, patch, ts: Date.now() });
  }, [isOnline, persistMeta, serverIdOf, token]);

  const renamePlaylist = useCallback(async (playlistId: string, name: string) => {
    const p = playlistsRef.current.find((x) => x.id === playlistId);
    if (!p || p.isDefault || p.readOnly || !name.trim()) return;
    await applyMetaPatch(playlistId, { name: name.trim() });
  }, [applyMetaPatch]);

  const setPlaylistCover = useCallback(async (playlistId: string, coverUrl: string | null) => {
    if (playlistsRef.current.find((p) => p.id === playlistId)?.readOnly) return;
    const isLocalImage =
      !!coverUrl && !/^https?:\/\//i.test(coverUrl) &&
      (coverUrl.startsWith('file:') || coverUrl.startsWith('content:') || coverUrl.startsWith('/'));

    setPlaylists((list) => {
      const next = list.map((p) => (p.id === playlistId ? { ...p, coverUrl } : p));
      persistMeta(next);
      return next;
    });

    const sid = serverIdOf(playlistId);

    if (coverUrl === null) {
      if (sid != null && token && isOnline) {
        const ok = await playlistsService.deleteCover(sid);
        if (ok) return;
      }
      await pendingPlaylistOps.enqueue({ type: 'update', localId: playlistId, patch: { coverUrl: null }, ts: Date.now() });
      return;
    }

    if (isLocalImage && sid != null && token && isOnline) {
      const remoteUrl = await playlistsService.uploadCover(sid, coverUrl);
      if (remoteUrl) {
        setPlaylists((list) => {
          const next = list.map((p) => (p.id === playlistId ? { ...p, coverUrl: remoteUrl } : p));
          persistMeta(next);
          return next;
        });
        return;
      }
    }

    await pendingPlaylistOps.enqueue({
      type: 'uploadCover',
      localId: playlistId,
      localUri: coverUrl,
      ts: Date.now(),
    });
  }, [isOnline, persistMeta, serverIdOf, token]);

  const setPlaylistDownload = useCallback(async (playlistId: string, enabled: boolean) => {
    const p = playlistsRef.current.find((x) => x.id === playlistId);
    if (p?.kind === 'followed')
    {
      setPlaylists((list) => {
        const next = list.map((x) => (x.id === playlistId ? { ...x, downloadEnabled: enabled } : x));
        persistMeta(next);
        return next;
      });
      return;
    }
    await applyMetaPatch(playlistId, { downloadEnabled: enabled });
  }, [applyMetaPatch, persistMeta]);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    const p = playlistsRef.current.find((x) => x.id === playlistId);
    if (!p || p.isDefault) return;

    const next = playlistsRef.current.filter((x) => x.id !== playlistId);
    setPlaylists(next);
    await persistMeta(next);
    await storage.removeItem(songsKey(playlistId));
    setSongsCache((c) => {
      const n = { ...c };
      delete n[playlistId];
      return n;
    });

    const sid = p.serverId ?? serverIdOf(playlistId);
    if (p.kind === 'followed') {
      if (sid != null && token && isOnline) await playlistsService.unfollow(sid);
      return;
    }

    if (sid != null && token && isOnline) {
      const ok = await playlistsService.remove(sid);
      if (ok) return;
    }
    await pendingPlaylistOps.enqueue({ type: 'delete', localId: playlistId, ts: Date.now() });
  }, [isOnline, persistMeta, serverIdOf, token]);

  const reorderPlaylists = useCallback(async (orderedIds: string[]) => {
    setPlaylists((list) => {
      const byId = new Map(list.map((p) => [p.id, p]));
      const next: PlaylistMeta[] = [];
      let pos = 0;
      for (const id of orderedIds) {
        const p = byId.get(id);
        if (p) { next.push({ ...p, position: pos++ }); byId.delete(id); }
      }
      for (const p of byId.values()) next.push({ ...p, position: pos++ });
      persistMeta(next);
      return next;
    });

    const serverIds = orderedIds
      .map((id) => serverIdOf(id))
      .filter((n): n is number => Number.isFinite(n));
    if (serverIds.length > 0 && token && isOnline) {
      const ok = await playlistsService.reorder(serverIds);
      if (ok) return;
    }
    await pendingPlaylistOps.enqueue({ type: 'reorder', order: orderedIds, ts: Date.now() });
  }, [isOnline, persistMeta, serverIdOf, token]);

  const addSongToPlaylists = useCallback(async (song: SongData, playlistIds: string[]) => {
    for (const pid of playlistIds) {
      const target = playlistsRef.current.find((p) => p.id === pid);
      if (target?.readOnly) continue;
      const current = songsCacheRef.current[pid] ?? (await getPlaylistSongs(pid));
      if (current.some((s) => s.id === song.id)) continue;
      const updated = [...current, song];
      setLocalSongs(pid, updated);

      const sid = serverIdOf(pid);
      if (sid != null && token && isOnline) {
        const ok = await playlistsService.addSong(sid, song);
        if (ok) continue;
      }
      await pendingPlaylistOps.enqueue({ type: 'addSong', localId: pid, song, ts: Date.now() });
    }
    bump();
  }, [getPlaylistSongs, isOnline, serverIdOf, setLocalSongs, token]);

  const addSongsToPlaylists = useCallback(async (
    songs: SongData[],
    playlistIds: string[],
  ): Promise<{ added: number; failed: number }> => {
    const targets = playlistIds.filter(
      (pid) => !playlistsRef.current.find((p) => p.id === pid)?.readOnly,
    );

    if (targets.length === 0 || songs.length === 0) return { added: 0, failed: 0 };
    const perPlaylistNew: Record<string, SongData[]> = {};
    for (const pid of targets)
    {
      const current = songsCacheRef.current[pid] ?? (await getPlaylistSongs(pid));
      const have = new Set(current.map((s) => s.id));
      const toAdd = songs.filter((s) => !have.has(s.id) && s.id);
      if (toAdd.length === 0) continue;
      perPlaylistNew[pid] = toAdd;
      setLocalSongs(pid, [...current, ...toAdd]);
    }
    bump();

    const jobs: { pid: string; song: SongData }[] = [];
    for (const pid of Object.keys(perPlaylistNew)) {
      for (const song of perPlaylistNew[pid]) jobs.push({ pid, song });
    }

    if (jobs.length === 0) return { added: 0, failed: 0 };
    let added = 0;
    let failed = 0;
    const CONCURRENCY = 6;
    let cursor = 0;

    const worker = async () => {
      while (cursor < jobs.length) {
        const { pid, song } = jobs[cursor++];
        const sid = serverIdOf(pid);
        let ok = false;
        if (sid != null && token && isOnline) {
          try { ok = await playlistsService.addSong(sid, song); } catch { ok = false; }
        }
        if (ok) added++;
        else {
          failed++;
          await pendingPlaylistOps.enqueue({ type: 'addSong', localId: pid, song, ts: Date.now() });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));
    return { added, failed };
  }, [getPlaylistSongs, isOnline, serverIdOf, setLocalSongs, token]);

  const removeSongFromPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (playlistsRef.current.find((p) => p.id === playlistId)?.readOnly) return;
    const current = songsCacheRef.current[playlistId] ?? (await getPlaylistSongs(playlistId));
    const updated = current.filter((s) => s.id !== songId);
    if (updated.length === current.length) return;
    setLocalSongs(playlistId, updated);

    const sid = serverIdOf(playlistId);
    if (sid != null && token && isOnline) {
      const ok = await playlistsService.removeSong(sid, songId);
      if (ok) { bump(); return; }
    }
    await pendingPlaylistOps.enqueue({ type: 'removeSong', localId: playlistId, songId, ts: Date.now() });
    bump();
  }, [getPlaylistSongs, isOnline, serverIdOf, setLocalSongs, token]);

  const reorderPlaylistSongs = useCallback(async (playlistId: string, orderedSongIds: string[]) => {
    const current = songsCacheRef.current[playlistId] ?? (await getPlaylistSongs(playlistId));
    const byId = new Map(current.map((s) => [s.id, s]));
    const next: SongData[] = [];
    for (const id of orderedSongIds) {
      const s = byId.get(id);
      if (s) { next.push(s); byId.delete(id); }
    }
    for (const s of byId.values()) next.push(s);
    setLocalSongs(playlistId, next);

    const sid = serverIdOf(playlistId);
    if (sid != null && token && isOnline) {
      const ok = await playlistsService.reorderSongs(sid, orderedSongIds);
      if (ok) return;
    }
    await pendingPlaylistOps.enqueue({ type: 'reorderSongs', localId: playlistId, order: orderedSongIds, ts: Date.now() });
  }, [getPlaylistSongs, isOnline, serverIdOf, setLocalSongs, token]);

  const isSongInPlaylist = useCallback((playlistId: string, songId: string) => {
    const songs = songsCacheRef.current[playlistId];
    return !!songs && songs.some((s) => s.id === songId);
  }, []);

  const songPlaylistIds = useCallback((songId: string): string[] => {
    const ids: string[] = [];
    for (const p of playlistsRef.current) {
      const songs = songsCacheRef.current[p.id];
      if (songs && songs.some((s) => s.id === songId)) ids.push(p.id);
    }
    return ids;
  }, []);

  const setPlaylistVisibility = useCallback(async (
    playlistId: string,
    visibility: 'private' | 'public',
  ): Promise<boolean> => {
    const p = playlistsRef.current.find((x) => x.id === playlistId);
    if (!p || p.isDefault || p.kind === 'followed') return false;

    setPlaylists((list) => {
      const next = list.map((x) => (x.id === playlistId ? { ...x, visibility } : x));
      persistMeta(next);
      return next;
    });

    const sid = serverIdOf(playlistId);
    if (sid == null || !token || !isOnline)
    {
      setPlaylists((list) => {
        const next = list.map((x) => (x.id === playlistId ? { ...x, visibility: p.visibility } : x));
        persistMeta(next);
        return next;
      });
      return false;
    }

    const updated = await playlistsService.setVisibility(sid, visibility);
    if (updated) {
      setPlaylists((list) => {
        const next = list.map((x) =>
          x.id === playlistId
            ? { ...x, visibility: updated.visibility, slug: updated.slug, savesCount: updated.savesCount }
            : x,
        );
        persistMeta(next);
        return next;
      });
      return true;
    }
    setPlaylists((list) => {
      const next = list.map((x) => (x.id === playlistId ? { ...x, visibility: p.visibility } : x));
      persistMeta(next);
      return next;
    });
    return false;
  }, [isOnline, persistMeta, serverIdOf, token]);

  const followPlaylist = useCallback(async (pub: {
    id: number;
    name: string;
    coverUrl: string | null;
    previewThumbnails: string[];
    songCount: number;
    savesCount: number;
    owner: { name: string; avatar?: string };
  }): Promise<string> => {
    const localId = String(pub.id);
    const already = playlistsRef.current.find((p) => p.id === localId);
    if (!already) {
      const maxPos = playlistsRef.current.reduce((m, p) => Math.max(m, p.position), 0);
      const meta: PlaylistMeta = {
        id: localId,
        serverId: pub.id,
        name: pub.name,
        coverUrl: pub.coverUrl,
        isDefault: false,
        downloadEnabled: false,
        position: maxPos + 1,
        songCount: pub.songCount,
        previewThumbnails: pub.previewThumbnails ?? [],
        kind: 'followed',
        visibility: 'public',
        readOnly: true,
        slug: null,
        savesCount: pub.savesCount,
        unavailable: false,
        owner: pub.owner,
      };
      setPlaylists((list) => {
        const next = [...list, meta];
        persistMeta(next);
        return next;
      });
    }

    if (token && isOnline) {
      const ok = await playlistsService.follow(pub.id);
      if (!ok) console.warn('[Playlists] follow request failed (kept optimistic)');
    }
    // Hydrate songs.
    getPlaylistSongs(localId);
    return localId;
  }, [getPlaylistSongs, isOnline, persistMeta, token]);

  const unfollowPlaylist = useCallback(async (playlistId: string) => {
    const p = playlistsRef.current.find((x) => x.id === playlistId);
    if (!p || p.kind !== 'followed') return;

    setPlaylists((list) => {
      const next = list.filter((x) => x.id !== playlistId);
      persistMeta(next);
      return next;
    });
    await storage.removeItem(songsKey(playlistId));
    setSongsCache((c) => {
      const n = { ...c };
      delete n[playlistId];
      return n;
    });

    const sid = p.serverId ?? serverIdOf(playlistId);
    if (sid != null && token && isOnline) {
      await playlistsService.unfollow(sid);
    }
  }, [isOnline, persistMeta, serverIdOf, token]);

  const downloadEnabledPlaylistIds = useMemo(
    () => playlists.filter((p) => p.downloadEnabled).map((p) => p.id),
    [playlists],
  );

  const songsSignature = useMemo(() => {
    const parts: string[] = [];
    for (const p of playlists) {
      const ids = (songsCache[p.id] ?? []).map((s) => s.id).join(',');
      parts.push(`${p.id}:${p.downloadEnabled ? 1 : 0}:${ids}`);
    }
    return parts.join('|');
  }, [playlists, songsCache]);

  const wantedSongIds = useMemo(() => {
    const set = new Set<string>();
    for (const id of downloadEnabledPlaylistIds) {
      for (const s of songsCache[id] ?? []) set.add(s.id);
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songsSignature]);

  const allPlaylistSongs = useMemo(() => {
    const seen = new Set<string>();
    const out: SongData[] = [];
    for (const p of playlists) {
      for (const s of songsCache[p.id] ?? []) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songsSignature]);

  const wantedSongs = useMemo(() => {
    const seen = new Set<string>();
    const out: SongData[] = [];
    for (const id of downloadEnabledPlaylistIds) {
      for (const s of songsCache[id] ?? []) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push(s);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songsSignature]);

  const songIsWanted = useCallback(
    (songId: string) => wantedSongIds.has(songId),
    [wantedSongIds],
  );

  const defaultPlaylist = playlists.find((p) => p.isDefault) ?? null;
  const defaultPlaylistId = defaultPlaylist?.id ?? null;
  const favorites = (defaultPlaylistId && songsCache[defaultPlaylistId]) || [];

  const isFavorite = useCallback((songId: string) => {
    if (!defaultPlaylistId) return false;
    return isSongInPlaylist(defaultPlaylistId, songId);
  }, [defaultPlaylistId, isSongInPlaylist]);

  const toggleFavorite = useCallback(async (song: SongData) => {
    if (!defaultPlaylistId) return;
    if (isFavorite(song.id)) await removeSongFromPlaylist(defaultPlaylistId, song.id);
    else await addSongToPlaylists(song, [defaultPlaylistId]);
  }, [addSongToPlaylists, defaultPlaylistId, isFavorite, removeSongFromPlaylist]);

  return {
    // playlist API
    playlists,
    playlistsHydrated: hydrated,
    playlistSongsHydrated: songsHydrated,
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

    // public playlists (PR 10)
    setPlaylistVisibility,
    followPlaylist,
    unfollowPlaylist,

    // download-layer inputs (PR 5)
    wantedSongs,
    allPlaylistSongs,
    songIsWanted,
    downloadEnabledPlaylistIds,

    // favorites shims
    favorites,
    isFavorite,
    toggleFavorite,
  };
};
