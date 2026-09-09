import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import { useLanguage } from '@/context/LanguageContext';
import type { PublicPlaylistResult } from '@/interfaces/Playlist';

interface Props {
  playlist: PublicPlaylistResult;
  onPress: () => void;
}

export const PlaylistResultRow: React.FC<Props> = ({ playlist, onPress }) => {
  const { t } = useLanguage();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <PlaylistCover
        coverUrl={playlist.coverUrl}
        previewThumbnails={playlist.previewThumbnails}
        size={50}
        borderRadius={5}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {playlist.isOwner ? t('playlist.byYou') : playlist.owner.name}
          {' · '}
          {t('playlist.savedByCount', { count: playlist.savesCount })}
        </Text>
      </View>
      {playlist.isOwner ? (
        <IconSymbol name="person" size={18} color="#2c5af3" />
      ) : playlist.isFollowing ? (
        <IconSymbol name="checkmark-circle" size={20} color="#2c5af3" />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  meta: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 3,
  },
});
