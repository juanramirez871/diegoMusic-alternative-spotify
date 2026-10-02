import { useState, useEffect, useRef } from 'react';
import { useLibrary } from '@/context/PlayerContext';
import { useNetwork } from '@/context/NetworkContext';
import { localThumbFor } from '@/context/player/downloadFiles';
import {
  normalizeThumbnailUrl,
  youtubeIdFromThumb,
  type ThumbQuality,
} from '@/utils/thumbnailUrl';

const knownLocalUri = new Map<string, string | null>();
const hq720Available = new Map<string, boolean>();
const probeHq720 = async (ytId: string): Promise<boolean> => {
  if (hq720Available.has(ytId)) return hq720Available.get(ytId)!;
  try {
    const r = await fetch(`https://i.ytimg.com/vi/${ytId}/hq720.jpg`, { method: 'HEAD' });
    const ok = r.status === 200;
    hq720Available.set(ytId, ok);
    return ok;
  }
  catch {
    return false; // don't cache a network failure
  }
};

export const useThumbnail = (songId: string | undefined, remoteUrl: string | undefined) => {
  const { songPlaylistIds } = useLibrary();
  const { isOnline } = useNetwork();
  const inAnyPlaylist = songId ? songPlaylistIds(songId).length > 0 : false;

  const [localUri, setLocalUri] = useState<string | null>(
    () => (songId ? knownLocalUri.get(songId) ?? null : null),
  );
  const ytId = youtubeIdFromThumb(remoteUrl);
  const [remoteTier, setRemoteTier] = useState<ThumbQuality>(
    () => (ytId && hq720Available.get(ytId) === false ? 'low' : 'high'),
  );

  const normalizedRemote = normalizeThumbnailUrl(remoteUrl, remoteTier);
  const lastSongIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    let isMounted = true;
    if (!songId) {
      setLocalUri(null);
      lastSongIdRef.current = undefined;
      return;
    }

    if (lastSongIdRef.current !== songId) {
      lastSongIdRef.current = songId;
      const known = knownLocalUri.get(songId);
      setLocalUri(known ?? null);
    }

    (async () => {
      const found = await localThumbFor(songId);
      if (!isMounted) return;
      knownLocalUri.set(songId, found);
      setLocalUri(found);
    })();

    return () => { isMounted = false; };
  }, [songId]);

  useEffect(() => {
    if (!songId) return;
    let isMounted = true;
    localThumbFor(songId).then((found) => {
      if (!isMounted) return;
      knownLocalUri.set(songId, found);
      setLocalUri(found);
    });
    return () => { isMounted = false; };
  }, [songId, inAnyPlaylist]);

  const willShowRemote = !localUri;
  useEffect(() => {
    let isMounted = true;
    if (!ytId || !isOnline || !willShowRemote) return;
    if (hq720Available.get(ytId) === false) { setRemoteTier('low'); return; }
    probeHq720(ytId).then((ok) => {
      if (isMounted && !ok) setRemoteTier('low');
    });
    return () => { isMounted = false; };
  }, [ytId, isOnline, willShowRemote]);


  if (localUri) return { uri: localUri };
  const known = songId ? knownLocalUri.get(songId) : null;
  if (known) return { uri: known };

  if (!isOnline) {
    if (normalizedRemote) return { uri: normalizedRemote }; // last resort
    return require('@/assets/images/cover.jpg');
  }

  if (normalizedRemote) return { uri: normalizedRemote };

  return require('@/assets/images/cover.jpg');
};
