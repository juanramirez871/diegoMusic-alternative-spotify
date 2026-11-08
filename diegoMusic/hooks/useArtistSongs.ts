import { useEffect, useState } from 'react';
import { useNetwork } from '@/context/NetworkContext';
import { youtubeService } from '@/services/youtubeService';
import type { SongData } from '@/interfaces/Song';

/** Videos from an artist's channel, falling back to a search when the channel is empty. */
export function useArtistSongs(channelId: string, fallbackQuery: string) {
  const { isApiReachable } = useNetwork();
  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isApiReachable) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let result = await youtubeService.getChannelVideos(channelId);
        if (result.length === 0) result = await youtubeService.searchVideos(fallbackQuery, 10);
        if (!cancelled) setSongs(result);
      } catch (error) {
        console.error('Error fetching artist songs:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [channelId, fallbackQuery, isApiReachable]);

  return { songs, loading };
}
