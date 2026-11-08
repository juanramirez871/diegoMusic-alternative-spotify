import { useState } from 'react';
import { Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { PlayFab } from '@/components/PlayFab';
import { SmartImage } from '@/components/SmartImage';
import { useLibrary, usePlayback } from '@/context/PlayerContext';
import type { SongData } from '@/interfaces/Song';
import { styles } from './styles';

const SLOT_COUNT = 8;
/** Window width from which the web grid switches from 2 to 4 columns. */
const WIDE_BREAKPOINT = 1200;

function RecentTile({ song, onPress }: { song: SongData; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={song.title}
      style={({ pressed }) => [styles.tile, (hovered || pressed) && styles.tileActive]}
    >
      <SmartImage uri={song.thumbnail?.url} style={styles.image} />
      <Text style={styles.title} numberOfLines={2}>
        {song.title}
      </Text>
      <PlayFab visible={hovered} size={32} style={styles.playFab} />
    </Pressable>
  );
}

/** Grid of the last played songs; empty slots keep the grid shape stable. */
export default function RecentPlayed() {
  const { recentPlayed } = useLibrary();
  const { playSong } = usePlayback();
  const { width } = useWindowDimensions();
  const columns = Platform.OS === 'web' && width >= WIDE_BREAKPOINT ? 4 : 2;

  const slots = Array.from({ length: SLOT_COUNT }, (_, index) => recentPlayed[index] ?? null);
  const rows = Array.from({ length: SLOT_COUNT / columns }, (_, row) =>
    slots.slice(row * columns, (row + 1) * columns),
  );

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((song, columnIndex) =>
            song ? (
              <RecentTile key={song.id} song={song} onPress={() => playSong(song, recentPlayed)} />
            ) : (
              <View key={`empty-${rowIndex}-${columnIndex}`} style={[styles.tile, styles.tileEmpty]} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
