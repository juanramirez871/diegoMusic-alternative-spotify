import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { SmartImage } from '@/components/SmartImage';
import { usePlaylistCover } from '@/hooks/usePlaylistCover';

interface Props {
  coverUrl?: string | null;
  previewThumbnails?: string[];
  size: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

const FALLBACK = require('@/assets/images/cover.jpg');
export const PlaylistCover: React.FC<Props> = ({
  coverUrl,
  previewThumbnails = [],
  size,
  borderRadius = 6,
  style,
}) => {
  // Resolves to local files when offline (custom cover + song thumbnails), so
  // playlist artwork still shows with no connection.
  const { coverUrl: resolvedCover, thumbs } = usePlaylistCover(coverUrl, previewThumbnails);

  const box: StyleProp<ViewStyle> = [
    { width: size, height: size, borderRadius, overflow: 'hidden' },
    style,
  ];

  if (resolvedCover) {
    return (
      <View style={box}>
        <Image
          source={{ uri: resolvedCover }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

  if (thumbs.length === 0) {
    return (
      <View style={box}>
        <Image source={FALLBACK} style={{ width: size, height: size }} resizeMode="cover" />
      </View>
    );
  }

  if (thumbs.length < 4) {
    return (
      <View style={box}>
        <SmartImage uri={thumbs[0]} style={{ width: size, height: size }} />
      </View>
    );
  }

  const half = size / 2;
  return (
    <View style={[styles.collage, box]}>
      {thumbs.map((uri, i) => (
        <SmartImage
          key={`${uri}-${i}`}
          uri={uri}
          style={{ width: half, height: half }}
        />
      ))}
    </View>
  );
};

export const PlaylistCoverPlaceholder: React.FC<{ size: number; borderRadius?: number }> = ({
  size,
  borderRadius = 6,
}) => (
  <View style={[styles.placeholder, { width: size, height: size, borderRadius }]}>
    <IconSymbol name="music.note.list" size={size * 0.4} color="#8f8f8f" />
  </View>
);

const styles = StyleSheet.create({
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  placeholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
