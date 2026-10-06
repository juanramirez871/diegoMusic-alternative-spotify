import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import { useLanguage } from '@/context/LanguageContext';
import type { PlaylistMeta } from '@/interfaces/Playlist';

interface Props {
  playlist: PlaylistMeta;
  onPress: () => void;
}

export const PlaylistCard: React.FC<Props> = ({ playlist, onPress }) => {
  const { t } = useLanguage();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <PlaylistCover
        coverUrl={playlist.coverUrl}
        previewThumbnails={playlist.previewThumbnails}
        size={56}
        borderRadius={6}
      />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          {playlist.isDefault && (
            <IconSymbol name="heart" size={15} color="#2c5af3" style={{ marginRight: 5 }} />
          )}
          {playlist.kind === 'owned' && playlist.visibility === 'public' && (
            <IconSymbol name="person" size={14} color="#2c5af3" style={{ marginRight: 5 }} />
          )}
          <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {playlist.unavailable
              ? t('playlist.unavailable')
              : playlist.kind === 'followed' && playlist.owner
                ? t('playlist.byAuthor', { author: playlist.owner.name })
                : t('playlist.songCount', { count: playlist.songCount })}
          </Text>
          {playlist.downloadEnabled && (
            <IconSymbol
              name="arrow.down.circle.fill"
              size={13}
              color="#2c5af3"
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={18} color="#8f8f8f" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  meta: {
    color: '#b3b3b3',
    fontSize: 13,
  },
});
