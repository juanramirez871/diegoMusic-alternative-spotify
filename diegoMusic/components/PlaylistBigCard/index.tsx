import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import { useLanguage } from '@/context/LanguageContext';
import type { PlaylistMeta } from '@/interfaces/Playlist';

interface Props {
  playlist: PlaylistMeta;
  onPress: () => void;
}

export const PlaylistBigCard: React.FC<Props> = ({ playlist, onPress }) => {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const coverSize = Math.min((width - 40) * 0.72, 300);

  const subtitle = playlist.unavailable
    ? t('playlist.unavailable')
    : playlist.kind === 'followed' && playlist.owner
      ? t('playlist.byAuthor', { author: playlist.owner.name })
      : t('playlist.songCount', { count: playlist.songCount });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cover}>
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          previewThumbnails={playlist.previewThumbnails}
          size={coverSize}
          borderRadius={12}
        />
      </View>
      <View style={styles.titleRow}>
        {playlist.isDefault && (
          <IconSymbol name="heart" size={17} color="#2c5af3" style={{ marginRight: 6 }} />
        )}
        {playlist.kind === 'owned' && playlist.visibility === 'public' && (
          <IconSymbol name="person" size={15} color="#2c5af3" style={{ marginRight: 6 }} />
        )}
        <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
        {playlist.downloadEnabled && (
          <IconSymbol
            name="arrow.down.circle.fill"
            size={15}
            color="#2c5af3"
            style={{ marginLeft: 8 }}
          />
        )}
      </View>
      <Text style={styles.meta} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginBottom: 22,
  },
  cover: {
    // Subtle depth so the big artwork reads as a card.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    maxWidth: '100%',
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    color: '#b3b3b3',
    fontSize: 14,
    marginTop: 4,
  },
});
