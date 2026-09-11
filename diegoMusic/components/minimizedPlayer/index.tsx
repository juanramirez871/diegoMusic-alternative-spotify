import { View, Image, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { usePlayer } from "@/context/PlayerContext";
import { useThumbnail } from "@/hooks/useThumbnail";
import { MinimizedPlayerProps } from "@/interfaces/player";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { styles } from './styles';


export const MinimizedPlayer = ({ onPress, style }: MinimizedPlayerProps) => {

  const { currentSong, isPlaying, isIntendingToPlay, togglePlayPause, progress, duration, isLoading, playNext, playPrevious } = usePlayer();
  const isBuffering = isIntendingToPlay && !isPlaying;
  const thumbnailSource = useThumbnail(currentSong?.id, currentSong?.thumbnail?.url);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const SWIPE_THRESHOLD = 60;
  const SWIPE_UP_THRESHOLD = 50;
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        playNext();
      } else if (e.translationX > SWIPE_THRESHOLD) {
        playPrevious();
      }
      translateX.value = withSpring(0);
    });

  const swipeUpGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY([-15, 15])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY * 0.3;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -SWIPE_UP_THRESHOLD) {
        runOnJS(onPress)();
      }
      translateY.value = withSpring(0);
    });

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      onPress();
    });

  const combinedGesture = Gesture.Race(panGesture, swipeUpGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  if (!currentSong) return null;
  const progressPercentage = duration > 0 ? Math.min(Math.max((progress / duration) * 100, 0), 100) : 0;

  return (
    <GestureDetector gesture={combinedGesture}>
      <Animated.View style={[styles.container, style, animatedStyle]}>
        <GestureDetector gesture={tapGesture}>
          <View style={styles.infoArea}>
            <Image
              source={thumbnailSource}
              style={styles.cover}
              resizeMode="cover"
            />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentSong.channel.name}</Text>
            </View>
          </View>
        </GestureDetector>

        <TouchableOpacity
          style={styles.controls}
          onPress={(e) => {
            e.stopPropagation();
            if (!isLoading) togglePlayPause();
          }}
        >
          <IconSymbol
            name={isIntendingToPlay ? "pause-circle" : "play-circle"}
            size={40}
            color={isBuffering ? "rgba(255, 255, 255, 0.4)" : "#fff"}
          />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <View style={[styles.bgBar, { width: '100%' }]} />
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </Animated.View>
    </GestureDetector>
  );
};
