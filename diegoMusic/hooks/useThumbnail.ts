import { useState, useEffect } from 'react';
import * as FileSystem from '@/utils/fileSystem';
import { useLibrary } from '@/context/PlayerContext';

const thumbUriFor = (songId: string) => `${FileSystem.documentDirectory}${songId}_thumb.jpg`;
const knownLocal = new Set<string>();

export const useThumbnail = (songId: string | undefined, remoteUrl: string | undefined) => {

  const { songPlaylistIds } = useLibrary();
  const inAnyPlaylist = songId ? songPlaylistIds(songId).length > 0 : false;
  const [localExists, setLocalExists] = useState(
    () => !!songId && knownLocal.has(songId)
  );
  const normalizedRemote = typeof remoteUrl === 'string' ? remoteUrl.trim() : '';

  useEffect(() => {
    let isMounted = true;
    async function checkFile() {
      if (songId && inAnyPlaylist) {
        const thumbUri = thumbUriFor(songId);
        try {
          const info = await FileSystem.getInfoAsync(thumbUri);
          if (info.exists) knownLocal.add(songId);
          else knownLocal.delete(songId);
          if (isMounted) setLocalExists(info.exists);
        }
        catch (e) {
          if (isMounted) setLocalExists(false);
        }
      }
      else {
        if (isMounted) setLocalExists(false);
      }
    }
    checkFile();
    return () => { isMounted = false; };
  }, [songId, inAnyPlaylist]);

  if (inAnyPlaylist && localExists && songId) {
    return { uri: thumbUriFor(songId) };
  }

  if (normalizedRemote) return { uri: normalizedRemote };
  if (localExists && songId) return { uri: thumbUriFor(songId) };

  return require("@/assets/images/cover.jpg");
};
