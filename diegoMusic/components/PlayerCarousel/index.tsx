import { IconSymbol } from '@/components/IconSymbol';
import { VideoView } from 'expo-video';
import { Dimensions, Image, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { useThumbnail } from '@/hooks/useThumbnail';
import { LoadingSpinner } from "@/components/LoadingSpinner";
import React, { useEffect } from 'react';
import { PlayerCarouselProps } from '@/interfaces/player';
import { styles } from './styles';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width - 48;
const SWIPE_THRESHOLD = 80;


export function PlayerCarousel({ songs, video, audio, onEnterFullscreen }: PlayerCarouselProps) {

  const translateX = useSharedValue(0);
  const prevThumbnailSource = useThumbnail(songs.prev?.id, songs.prev?.thumbnail?.url);
  const currentThumbnailSource = useThumbnail(songs.current?.id, songs.current?.thumbnail?.url);
  const nextThumbnailSource = useThumbnail(songs.next?.id, songs.next?.thumbnail?.url);
  const playNext = audio.playNext;
  const playPrevious = audio.playPrevious;

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-25, 25])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && (songs.next || songs.prev)) {
        translateX.value = withTiming(-width, { duration: 300 }, (finished) => {
          if (finished) runOnJS(playNext)();
        });
      }
      else if (event.translationX > SWIPE_THRESHOLD && (songs.next || songs.prev)) {
        translateX.value = withTiming(width, { duration: 300 }, (finished) => {
          if (finished) runOnJS(playPrevious)();
        });
      }
      else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const mainImageStyle = useAnimatedStyle(() => {
    const opacity = interpolate(Math.abs(translateX.value), [0, width], [1, 0.5], Extrapolation.CLAMP);
    const scale = interpolate(Math.abs(translateX.value), [0, width], [1, 0.8], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(Math.abs(translateX.value), [0, width], [0.5, 0], Extrapolation.CLAMP);
    const elevation = interpolate(Math.abs(translateX.value), [0, width], [20, 0], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }], shadowOpacity, elevation };
  });

  const useSideImageStyle = (isNext: boolean) => useAnimatedStyle(() => {
    const targetValue = isNext ? -width : width;
    const opacity = interpolate(translateX.value, [0, targetValue], [0.5, 1], Extrapolation.CLAMP);
    const scale = interpolate(translateX.value, [0, targetValue], [0.8, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const nextImageStyle = useSideImageStyle(true);
  const prevImageStyle = useSideImageStyle(false);

  const loadingBarX = useSharedValue(-IMAGE_SIZE);
  useEffect(() => {
    if (video.isLoading) {
      loadingBarX.value = -IMAGE_SIZE;
      loadingBarX.value = withRepeat(
        withTiming(IMAGE_SIZE, { duration: 900 }),
        -1,
        false
      );
    } else {
      loadingBarX.value = -IMAGE_SIZE;
    }
  }, [video.isLoading]);

  const loadingBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: loadingBarX.value }],
  }));

  const videoLongPressGesture = Gesture.LongPress()
    .minDuration(450)
    .onStart(() => {
      if (video.show && video.isReady) runOnJS(onEnterFullscreen)();
    })
    .runOnJS(true);

  return (
    <View style={styles.carouselContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.imagesWrapper, animatedStyle]}>
          <View style={styles.imageContainerWrapper}>
            {songs.prev && (
              <Animated.View style={[prevImageStyle, styles.imageWrapper]}>
                <Image key={songs.prev.id} source={prevThumbnailSource} style={styles.cover} resizeMode="cover" />
              </Animated.View>
            )}
          </View>

          <View style={styles.imageContainerWrapper}>
            <GestureDetector gesture={videoLongPressGesture}>
              <Animated.View style={[styles.imageContainer, mainImageStyle]}>
                {video.show && (
                  <VideoView
                    player={video.player}
                    style={[styles.cover, styles.videoLayer, { opacity: video.isReady ? 1 : 0 }]}
                    contentFit="cover"
                    nativeControls={false}
                  />
                )}
                {(!video.show || !video.isReady) && (
                  <Image key={songs.current.id} source={currentThumbnailSource} style={styles.cover} resizeMode="cover" />
                )}
                {video.isLoading && (
                  <View style={styles.loadingBarTrack}>
                    <Animated.View style={[styles.loadingBarFill, loadingBarStyle]} />
                  </View>
                )}
                <TouchableOpacity onPress={video.toggle} style={styles.icon}>
                  {video.show && video.isLoading ? (
                    <LoadingSpinner size={22} />
                  ) : (
                    <IconSymbol name="play-video" size={30} color="#ffffffff" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            </GestureDetector>
          </View>

          <View style={styles.imageContainerWrapper}>
            {songs.next && (
              <Animated.View style={nextImageStyle}>
                <Image key={songs.next.id} source={nextThumbnailSource} style={styles.cover} resizeMode="cover" />
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
