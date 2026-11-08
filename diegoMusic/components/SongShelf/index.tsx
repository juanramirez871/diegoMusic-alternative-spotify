import { Platform } from 'react-native';
import { MediaCard, MediaCardSkeleton } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { usePlayback } from '@/context/PlayerContext';
import type { SongShelfProps } from '@/interfaces/player';

const SKELETON_COUNT = Platform.OS === 'web' ? 6 : 4;

export function SongShelf({ songs, loading = false, ...shelf }: SongShelfProps) {
  const { playSong } = usePlayback();

  return (
    <Shelf {...shelf} expandable={!loading}>
      {loading
        ? Array.from({ length: SKELETON_COUNT }, (_, index) => <MediaCardSkeleton key={index} />)
        : songs.map((song, index) => (
            <MediaCard
              key={`${song.id}-${index}`}
              title={song.title}
              subtitle={song.channel.name}
              imageUri={song.thumbnail?.url}
              onPress={() => playSong(song, songs)}
            />
          ))}
    </Shelf>
  );
}
