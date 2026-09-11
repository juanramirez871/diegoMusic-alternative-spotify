import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
} from "react-native";
import { IconSymbol } from '@/components/IconSymbol';
import { usePlayer } from "@/context/PlayerContext";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { QueueModalProps } from "@/interfaces/player";
import { SongData } from "@/interfaces/Song";
import { useThumbnail } from "@/hooks/useThumbnail";
import { useLanguage } from "@/context/LanguageContext";
import { styles } from './styles';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const QueueItem = React.memo(function QueueItem({
  item,
  isCurrent,
  isSelected,
  onPress,
  onReorderPress,
}: {
  item: SongData;
  isCurrent: boolean;
  isSelected: boolean;
  onPress: () => void;
  onReorderPress: () => void;
}) {
  const thumbnailSource = useThumbnail(item.id, item.thumbnail?.url);
  return (
    <View
      style={[
        styles.songItem,
        isCurrent && styles.currentSongItem,
        isSelected && styles.selectedItem,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        style={styles.songPressArea}
        activeOpacity={0.7}
      >
        <Image source={thumbnailSource} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, isCurrent && styles.currentSongTitle]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {item.channel.name}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReorderPress} style={styles.reorderHandle} activeOpacity={0.6}>
        <IconSymbol
          name="reorder-two"
          size={24}
          color={isSelected ? "#2c5af3" : "#b3b3b3"}
        />
      </TouchableOpacity>
    </View>
  );
});

export default function QueueModal({ visible, onClose }: QueueModalProps) {

  const { queue, setQueue, currentSong, playSong, isShuffle, toggleShuffle } = usePlayer();
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) });
      backdropOpacity.value = withTiming(1, { duration: 400 });
    }
    else setSelectedIndex(null);

  }, [visible]);

  const handleClose = () => {
    setSelectedIndex(null);
    backdropOpacity.value = withTiming(0, { duration: 300 });
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: 300,
      easing: Easing.in(Easing.quad),
    }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const handleReorderPress = useCallback((index: number) => {
    
    if (selectedIndex === null) setSelectedIndex(index);
    else if (selectedIndex === index) setSelectedIndex(null);
    else {
      const newQueue = [...queue];
      const temp = newQueue[selectedIndex];
      newQueue[selectedIndex] = newQueue[index];
      newQueue[index] = temp;
      setQueue(newQueue);
      setSelectedIndex(null);
    }
  }, [selectedIndex, queue, setQueue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const renderItem = useCallback(({ item, index }: { item: SongData; index: number }) => (
    <QueueItem
      item={item}
      isCurrent={currentSong?.id === item.id}
      isSelected={selectedIndex === index}
      onPress={() => playSong(item)}
      onReorderPress={() => handleReorderPress(index)}
    />
  ), [currentSong?.id, selectedIndex, playSong, handleReorderPress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.content, animatedStyle]}>
          <LinearGradient colors={["#0a0a0aff", "#141414"]} style={styles.headerGradient}>
            <View style={styles.header}>
              <View style={styles.headerHandle} />
              <View style={styles.headerTop}>
                <Text style={styles.headerTitle}>{t('queue.title')}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <IconSymbol name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[styles.controlButton, isShuffle && styles.activeControl]}
                  onPress={toggleShuffle}
                >
                  <IconSymbol name="shuffle" size={24} color={isShuffle ? "#fff" : "#b3b3b3"} />
                  <Text style={[styles.controlText, isShuffle && styles.activeControlText]}>
                    {t('queue.shuffle')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.listContainer}>
            <FlatList
              data={queue}
              keyExtractor={(item: SongData) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
