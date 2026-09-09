import React from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

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
  const trimmed = typeof coverUrl === 'string' ? coverUrl.trim() : '';
  const thumbs = previewThumbnails.filter(Boolean).slice(0, 4);
  const box: StyleProp<ViewStyle> = [
    { width: size, height: size, borderRadius, overflow: 'hidden' },
    style,
  ];

  if (trimmed) {
    return (
      <View style={box}>
        <Image source={{ uri: trimmed }} style={{ width: size, height: size }} />
      </View>
    );
  }

  if (thumbs.length === 0) {
    return (
      <View style={box}>
        <Image source={FALLBACK} style={{ width: size, height: size }} />
      </View>
    );
  }

  if (thumbs.length < 4) {
    return (
      <View style={box}>
        <Image source={{ uri: thumbs[0] }} style={{ width: size, height: size }} />
      </View>
    );
  }

  const half = size / 2;
  return (
    <View style={[styles.collage, box]}>
      {thumbs.map((uri, i) => (
        <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: half, height: half }} />
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
