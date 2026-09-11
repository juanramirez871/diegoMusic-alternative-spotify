import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useNetwork } from '@/context/NetworkContext';
import {
  localThumbFor,
  cacheThumb,
  cachePlaylistCover,
  localPlaylistCover,
} from '@/context/player/downloadFiles';
import { normalizeThumbnailUrl, youtubeIdFromThumb } from '@/utils/thumbnailUrl';

type Store = { thumb: Map<string, string | null>; cover: Map<string, string | null> };
const g = globalThis as unknown as { __diegoPlCoverCache?: Store };
const store: Store =
  g.__diegoPlCoverCache ??
  (g.__diegoPlCoverCache = { thumb: new Map(), cover: new Map() });

const resolveThumb = async (remote: string): Promise<string | null> => {
  const hit = store.thumb.get(remote);
  if (hit) return hit; // only trust a positive cached result
  const id = youtubeIdFromThumb(remote);
  const local = id ? await localThumbFor(id) : null;
  if (local) store.thumb.set(remote, local);
  return local;
};

const resolveCover = async (remote: string): Promise<string | null> => {
  const hit = store.cover.get(remote);
  if (hit) return hit;
  const local = await localPlaylistCover(remote);
  if (local) store.cover.set(remote, local);
  return local;
};

export interface ResolvedCover {
  coverUrl: string | null;
  thumbs: string[];
}

export const usePlaylistCover = (
  coverUrl: string | null | undefined,
  previewThumbnails: string[] | undefined,
): ResolvedCover => {
  const { isOnline } = useNetwork();
  const trimmedCover = typeof coverUrl === 'string' ? coverUrl.trim() : '';
  const remoteThumbs = (previewThumbnails ?? [])
    .filter(Boolean)
    .slice(0, 4)
    .map((u) => normalizeThumbnailUrl(u));
  const key = `${trimmedCover}|${remoteThumbs.join(',')}`;

  const seed = (): ResolvedCover => {
    if (Platform.OS === 'web') {
      return { coverUrl: trimmedCover || null, thumbs: remoteThumbs };
    }
    const cachedCover = trimmedCover ? store.cover.get(trimmedCover) : undefined;
    const cover = cachedCover ?? (trimmedCover || null);
    const thumbs = remoteThumbs.map((r) => store.thumb.get(r) ?? r);
    return { coverUrl: cover, thumbs };
  };

  const [resolved, setResolved] = useState<ResolvedCover>(seed);

  useEffect(() => {
    setResolved(seed());
    if (Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      if (isOnline) {
        if (trimmedCover) cachePlaylistCover(trimmedCover);
        for (const r of remoteThumbs) {
          const id = youtubeIdFromThumb(r);
          if (id) cacheThumb({ id, thumbnail: { url: r } });
        }
      }

      const [localCover, localThumbs] = await Promise.all([
        trimmedCover ? resolveCover(trimmedCover) : Promise.resolve(null),
        Promise.all(remoteThumbs.map(resolveThumb)),
      ]);
      if (cancelled) return;

      setResolved({
        // Prefer the local cover when offline; online keep the remote (freshest).
        coverUrl: trimmedCover
          ? (!isOnline && localCover ? localCover : trimmedCover)
          : null,
        thumbs: remoteThumbs.map((r, i) =>
          !isOnline && localThumbs[i] ? localThumbs[i]! : r,
        ),
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isOnline]);

  return resolved;
};
