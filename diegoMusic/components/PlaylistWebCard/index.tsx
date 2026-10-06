import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import { useLanguage } from '@/context/LanguageContext';
import type { PlaylistMeta } from '@/interfaces/Playlist';

const webTransition = (value: string) =>
  ({ transition: value } as Record<string, unknown>);

const CARD_PADDING = 16;

interface Props {
  playlist: PlaylistMeta;
  onPress: () => void;
  /** Full tile width in px (the grid decides this). */
  width: number;
}

export const PlaylistWebCard: React.FC<Props> = ({ playlist, onPress, width }) => {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const coverSize = Math.max(0, width - CARD_PADDING * 2);

  const subtitle = playlist.unavailable
    ? t('playlist.unavailable')
    : playlist.kind === 'followed' && playlist.owner
      ? t('playlist.byAuthor', { author: playlist.owner.name })
      : t('playlist.songCount', { count: playlist.songCount });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.card, hovered && styles.cardHover, { width }]}
    >
      <View style={[styles.coverWrap, { width: coverSize, height: coverSize }]}>
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          previewThumbnails={playlist.previewThumbnails}
          size={coverSize}
          borderRadius={10}
        />
        <View
          style={[
            styles.playFab,
            hovered ? styles.playFabHover : styles.playFabIdle,
          ]}
        >
          <IconSymbol name="play.fill" size={22} color="#fff" />
        </View>
      </View>

      <View style={styles.titleRow}>
        {playlist.isDefault && (
          <IconSymbol name="heart" size={15} color="#2c5af3" style={styles.badge} />
        )}
        {playlist.kind === 'owned' && playlist.visibility === 'public' && (
          <IconSymbol name="person" size={14} color="#2c5af3" style={styles.badge} />
        )}
        <Text style={styles.name} numberOfLines={1}>
          {playlist.name}
        </Text>
        {playlist.downloadEnabled && (
          <IconSymbol
            name="arrow.down.circle.fill"
            size={14}
            color="#2c5af3"
            style={styles.dlBadge}
          />
        )}
      </View>
      <Text style={styles.meta} numberOfLines={2}>
        {subtitle}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: CARD_PADDING,
    borderRadius: 12,
    backgroundColor: '#181818',
    ...webTransition('background-color 180ms ease'),
  },
  cardHover: {
    backgroundColor: '#282828',
  },
  coverWrap: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  playFab: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c5af3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.44,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    ...webTransition('opacity 180ms ease, transform 180ms ease'),
  },
  playFabIdle: {
    opacity: 0,
    transform: [{ translateY: 8 }],
  },
  playFabHover: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  badge: {
    marginRight: 5,
  },
  dlBadge: {
    marginLeft: 6,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    color: '#a7a7a7',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 17,
  },
});
