import { SmartImage } from '@/components/SmartImage';
import { SongShelf } from '@/components/SongShelf';
import { DEFAULT_ARTIST_AVATAR } from '@/constants/images';
import { useLanguage } from '@/context/LanguageContext';
import { useArtistSongs } from '@/hooks/useArtistSongs';
import type { MusicArtistProps } from '@/interfaces/artists';
import { styles } from './styles';

/** "For fans of <artist>" section with songs from the artist's channel. */
export default function MusicArtist({ artist }: MusicArtistProps) {
  const { t } = useLanguage();
  const { songs, loading } = useArtistSongs(artist.id, `${artist.name} songs`);

  return (
    <SongShelf
      songs={songs}
      loading={loading}
      eyebrow={t('musicArtist.forFansOf')}
      title={artist.name}
      leading={<SmartImage uri={artist.avatar || DEFAULT_ARTIST_AVATAR} style={styles.avatar} />}
    />
  );
}
