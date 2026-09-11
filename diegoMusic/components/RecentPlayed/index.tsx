import { View, Text, TouchableOpacity } from "react-native";
import { usePlayer } from "@/context/PlayerContext";
import { SongData } from "@/interfaces/Song";
import { SmartImage } from "@/components/SmartImage";
import { styles } from './styles';

export default function RecentPlayed() {

  const { recentPlayed, playSong } = usePlayer();
  const leftColumn = recentPlayed.slice(0, 4);
  const rightColumn = recentPlayed.slice(4, 8);

  const renderSkeleton = (key: string) => (
    <View style={[styles.containerItem, styles.skeletonItem]} key={key}>
      <View style={styles.skeletonImage} />
      <View style={styles.textContainer}>
        <View style={styles.skeletonText} />
      </View>
    </View>
  );

  const renderItem = (item: SongData) => {
    return (
      <TouchableOpacity
        style={styles.containerItem}
        key={item.id}
        onPress={() => playSong(item, recentPlayed)}
        activeOpacity={0.7}
      >
        <SmartImage
          uri={item.thumbnail?.url}
          style={styles.image}
        />
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderColumn = (items: SongData[], startIndex: number) => {

    const columnItems = [];
    for (let i = 0; i < items.length; i++) {
      columnItems.push(renderItem(items[i]));
    }

    for (let i = items.length; i < 4; i++) {
      columnItems.push(renderSkeleton(`skeleton-${startIndex + i}`));
    }

    return columnItems;
  };

  return (
    <View style={styles.gridContainer}>
      <View style={styles.column}>
        {renderColumn(leftColumn, 0)}
      </View>
      <View style={styles.column}>
        {renderColumn(rightColumn, 4)}
      </View>
    </View>
  );
}

