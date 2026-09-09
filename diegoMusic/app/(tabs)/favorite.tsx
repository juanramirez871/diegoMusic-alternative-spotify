import { Redirect } from 'expo-router';
import { usePlayer } from '@/context/PlayerContext';

export default function FavoriteRedirect() {
  const { defaultPlaylistId } = usePlayer();
  if (defaultPlaylistId) {
    return <Redirect href={`/playlists/${defaultPlaylistId}` as any} />;
  }
  return <Redirect href="/playlists" />;
}
