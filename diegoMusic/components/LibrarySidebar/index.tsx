import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import { SmartImage } from '@/components/SmartImage';
import { DEFAULT_ARTIST_AVATAR } from '@/constants/images';
import { colors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { useLibrary, usePlayerUI } from '@/context/PlayerContext';
import { getPlaylistSubtitle, sortPlaylists } from '@/utils/playlists';
import { FavoritesCover } from './FavoritesCover';
import { SidebarItem } from './SidebarItem';
import { useSidebarTooltip } from './useSidebarTooltip';
import { COVER_SIZE, styles } from './styles';

const LIBRARY_ROUTE = '/playlists';
const playlistRoute = (id: string) => `${LIBRARY_ROUTE}/${id}`;

/**
 * Collapsed "Your Library" sidebar (web): library shortcut, favorites playlist,
 * favorite artists and the remaining playlists.
 */
export function LibrarySidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { playlists, favoriteArtists } = useLibrary();
  const { setIsMaximized, openArtistOverlay } = usePlayerUI();
  const tooltip = useSidebarTooltip();

  const sorted = useMemo(() => sortPlaylists(playlists), [playlists]);
  const favorites = sorted.find((playlist) => playlist.isDefault) ?? null;
  const otherPlaylists = sorted.filter((playlist) => !playlist.isDefault);

  const navigate = (route: string) => {
    tooltip.hide();
    setIsMaximized(false);
    router.push(route as never);
  };

  const hoverProps = { onHoverStart: tooltip.show, onHoverEnd: tooltip.hide };

  return (
    <View ref={tooltip.containerRef} style={styles.sidebar}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        onScroll={tooltip.hide}
        scrollEventThrottle={64}
      >
        <SidebarItem
          title={t('library.title')}
          active={pathname === LIBRARY_ROUTE}
          onPress={() => navigate(LIBRARY_ROUTE)}
          {...hoverProps}
        >
          <IconSymbol
            name="books.vertical"
            size={26}
            color={pathname === LIBRARY_ROUTE ? colors.text : colors.textSubdued}
          />
        </SidebarItem>

        {favorites && (
          <SidebarItem
            title={favorites.name}
            subtitle={getPlaylistSubtitle(favorites, t)}
            active={pathname === playlistRoute(favorites.id)}
            onPress={() => navigate(playlistRoute(favorites.id))}
            {...hoverProps}
          >
            {favorites.coverUrl ? (
              <PlaylistCover coverUrl={favorites.coverUrl} size={COVER_SIZE} borderRadius={4} />
            ) : (
              <FavoritesCover />
            )}
          </SidebarItem>
        )}

        {favoriteArtists.length > 0 && <View style={styles.divider} />}
        {favoriteArtists.map((artist) => (
          <SidebarItem
            key={artist.id}
            title={artist.name}
            subtitle={t('favoriteArtists.artistLabel')}
            onPress={() => {
              tooltip.hide();
              openArtistOverlay({ id: artist.id, name: artist.name });
            }}
            {...hoverProps}
          >
            <SmartImage uri={artist.avatar || DEFAULT_ARTIST_AVATAR} style={styles.artistCover} />
          </SidebarItem>
        ))}

        {otherPlaylists.length > 0 && <View style={styles.divider} />}
        {otherPlaylists.map((playlist) => (
          <SidebarItem
            key={playlist.id}
            title={playlist.name}
            subtitle={getPlaylistSubtitle(playlist, t)}
            active={pathname === playlistRoute(playlist.id)}
            onPress={() => navigate(playlistRoute(playlist.id))}
            {...hoverProps}
          >
            <PlaylistCover
              coverUrl={playlist.coverUrl}
              previewThumbnails={playlist.previewThumbnails}
              size={COVER_SIZE}
              borderRadius={4}
            />
          </SidebarItem>
        ))}
      </ScrollView>

      {tooltip.tooltip && (
        <View pointerEvents="none" style={[styles.tooltip, { top: tooltip.tooltip.top }]}>
          <Text style={styles.tooltipTitle} numberOfLines={1}>{tooltip.tooltip.title}</Text>
          {tooltip.tooltip.subtitle ? (
            <Text style={styles.tooltipSubtitle} numberOfLines={1}>{tooltip.tooltip.subtitle}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
