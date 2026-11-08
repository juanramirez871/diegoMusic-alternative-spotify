import { MediaCard } from '@/components/MediaCard';
import { Shelf } from '@/components/Shelf';
import { DEFAULT_ARTIST_AVATAR } from '@/constants/images';
import { useLanguage } from '@/context/LanguageContext';
import { useLibrary } from '@/context/PlayerContext';
import type { FavoriteArtistsProps } from '@/interfaces/artists';

export default function FavoriteArtists({ onArtistPress }: FavoriteArtistsProps) {
  const { favoriteArtists } = useLibrary();
  const { t } = useLanguage();

  return (
    <Shelf title={t('favoriteArtists.title')} emptyText={t('favoriteArtists.empty')}>
      {favoriteArtists.map((artist) => (
        <MediaCard
          key={artist.id}
          shape="circle"
          title={artist.name}
          subtitle={t('favoriteArtists.artistLabel')}
          imageUri={artist.avatar || DEFAULT_ARTIST_AVATAR}
          onPress={() => onArtistPress?.(artist)}
        />
      ))}
    </Shelf>
  );
}
