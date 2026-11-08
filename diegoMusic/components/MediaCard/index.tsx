import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PlayFab } from '@/components/PlayFab';
import { Skeleton } from '@/components/Skeleton';
import { SmartImage } from '@/components/SmartImage';
import type { MediaCardProps } from '@/interfaces/ui';
import { IMAGE_SIZE, styles } from './styles';

/** Spotify-style tile: cover art with a title and subtitle underneath. */
export function MediaCard({ title, subtitle, imageUri, shape = 'square', onPress }: MediaCardProps) {
  const [hovered, setHovered] = useState(false);
  const isCircle = shape === 'circle';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, hovered && styles.cardHovered, pressed && styles.cardPressed]}
    >
      <View>
        <SmartImage uri={imageUri} style={[styles.image, isCircle && styles.imageCircle]} />
        <PlayFab visible={hovered} style={styles.playFab} />
      </View>
      <Text style={styles.title} numberOfLines={isCircle ? 1 : 2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MediaCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={IMAGE_SIZE} height={IMAGE_SIZE} borderRadius={6} />
      <Skeleton width="85%" height={14} style={styles.skeletonTitle} />
      <Skeleton width="55%" height={12} style={styles.skeletonSubtitle} />
    </View>
  );
}
