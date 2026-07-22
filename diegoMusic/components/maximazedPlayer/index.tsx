import { usePlayer } from '@/context/PlayerContext';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import { Modal, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VideoView } from 'expo-video';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import QueueModal from "@/components/QueueModal";
import SleepTimerModal from "@/components/SleepTimerModal";
import SongOptionsModal from "@/components/SongOptionsModal";
import { LyricsView, LyricsPanel } from "@/components/LyricsView";
import { useLyrics } from '@/hooks/useLyrics';
import { useNetwork } from '@/context/NetworkContext';
import { useLanguage } from '@/context/LanguageContext';
import { PlayerCarousel } from "@/components/PlayerCarousel";
import { DownloadBanner } from "@/components/DownloadBanner";
import { MaximazedPlayerProps, PlayerCarouselProps } from '@/interfaces/player';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { usePlayerGestures } from '@/hooks/usePlayerGestures';
import { MarqueeText } from "@/components/MarqueeText";
import { VoiceButton } from "@/components/VoiceButton";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useVoiceCommandActions } from "@/hooks/useVoiceCommandActions";
import { styles } from './styles';


export const MaximazedPlayer = ({ visible, onClose }: MaximazedPlayerProps) => {

  const { isOnline } = useNetwork();
  const { t } = useLanguage();
  const pathname = usePathname();

  const runCommand = useVoiceCommandActions();
  const { isListening: isVoiceListening, start: startVoice, stop: stopVoice, available: voiceAvailable } =
    useVoiceSearch({
      // En el reproductor el micrófono solo ejecuta comandos; ignoramos búsquedas.
      onResult: (result) => {
        if (result.command) runCommand(result.command);
      },
    });

  const handleVoicePress = () => {
    if (isVoiceListening) stopVoice();
    else startVoice();
  };

  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isSleepTimerVisible, setIsSleepTimerVisible] = useState(false);

  useEffect(() => {
    setIsOptionsVisible(false);
    setIsQueueVisible(false);
    setIsSleepTimerVisible(false);
  }, [pathname]);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const isVideoFullscreenRef = useRef(false);

  useEffect(() => {
    if (isVideoFullscreen) {
      isVideoFullscreenRef.current = true;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    } else if (isVideoFullscreenRef.current) {
      isVideoFullscreenRef.current = false;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [isVideoFullscreen]);

  const {
    currentSong,
    queue,
    toggleFavorite,
    isFavorite,
    playNext,
    playPrevious,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    isPlaying,
    isIntendingToPlay,
    togglePlayPause,
    pause,
    progress,
    duration,
    seekTo,
    isLoading,
    sleepTimer,
    openArtistOverlay,
    videoQuality,
  } = usePlayer();

  const video = useVideoPlayback({
    currentSong,
    isOnline,
    videoOfflineTitle: t('player.videoOfflineTitle'),
    videoOfflineMessage: t('player.videoOfflineMessage'),
    videoQuality,
    audio: {
      isPlaying,
      progress,
      pause,
      seekTo,
      togglePlayPause,
      playNext,
    },
  });

  const lyrics = useLyrics(currentSong, isOnline);
  const lyricsDefaultQuery = lyrics.lyricsQuery;
  const currentIndex = queue.findIndex(s => s.id === currentSong?.id);
  const hasNextOrPrev = queue.length > 1 && currentIndex !== -1;
  const nextSong = hasNextOrPrev ? queue[(currentIndex + 1) % queue.length] : null;
  const prevSong = hasNextOrPrev ? queue[(currentIndex - 1 + queue.length) % queue.length] : null;

  const activeProgress = video.showVideo ? (video.isVideoReady && video.videoProgress > 0 ? video.videoProgress : progress) : progress;
  const activeDuration = video.showVideo ? (video.isVideoReady && video.videoDuration > 0 ? video.videoDuration : duration) : duration;
  const activeIsPlaying = video.showVideo ? (video.isVideoReady ? video.isVideoPlaying : false) : isPlaying;
  const activeIsLoading = video.showVideo ? video.isVideoLoading : isLoading;
  const isSeekEnabled = true;

  const currentDisplayProgress = (isSeeking || activeIsLoading) ? seekProgress : activeProgress;
  const playTint = useSharedValue(0);

  useEffect(() => {
    playTint.value = withTiming(!video.showVideo && activeIsLoading ? 1 : 0, { duration: 200 });
  }, [activeIsLoading, video.showVideo]);

  useEffect(() => {
    setSeekProgress(0);
    setIsSeeking(false);
    setShowLyrics(false);
  }, [currentSong?.id]);

  useEffect(() => {
    if (!activeIsLoading && !isSeeking) {
      setSeekProgress(activeProgress);
    }
  }, [activeIsLoading, isSeeking, activeProgress]);

  const formatTime = (millis: number) => {
    if (millis === undefined || millis === null || isNaN(millis)) return "00:00";
    const totalSeconds = Math.floor(millis / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = activeDuration > 0 ? Math.min(Math.max((currentDisplayProgress / activeDuration) * 100, 0), 100) : 0;
  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - playTint.value * 0.6,
  }));

  const handleClose = async () => {
    await video.closeIfOpen();
    onClose();
  };

  const handleNext = () => { if (hasNextOrPrev) playNext(); };
  const handlePrevious = () => { if (hasNextOrPrev) playPrevious(); };

  const handleSeek = (pos: number) => {
    video.seek(pos);
    setSeekProgress(pos);
    setIsSeeking(true);
    setTimeout(() => setIsSeeking(false), 1500);
  };

  const handlePlayPausePress = async () => {
    if (video.showVideo) {
      if (!video.isVideoReady) return;
      if (video.player.playing) video.player.pause();
      else video.player.play();
      return;
    }
    if (!isLoading) togglePlayPause();
  };

  const handleShare = async () => {
    if (!currentSong) return;
    try {
      await Share.share({
        message: t('player.shareMessage', {
          title: currentSong.title,
          artist: currentSong.channel.name,
          id: currentSong.id,
        }),
        url: `https://www.youtube.com/watch?v=${currentSong.id}`,
        title: currentSong.title,
      });
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const { playerTranslateY, playerTranslateX, playerGesture, progressGesture, progressTap } = usePlayerGestures({
    activeDuration,
    isSeekEnabled,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onClose: handleClose,
    onSeek: handleSeek,
    onSeekStart: () => setIsSeeking(true),
    onSeekUpdate: setSeekProgress,
  });

  const playerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: playerTranslateY.value },
      { translateX: playerTranslateX.value },
    ],
  }));

  if (!currentSong) return null;
  const favoriteStatus = isFavorite(currentSong.id);
  const carouselProps: PlayerCarouselProps = {
    songs: { current: currentSong, prev: prevSong, next: nextSong },
    video: {
      show: video.showVideo,
      player: video.player,
      isReady: video.isVideoReady,
      isLoading: video.isVideoLoading,
      toggle: video.toggle,
    },
    audio: { playNext, playPrevious, seekTo, togglePlayPause },
    onEnterFullscreen: () => setIsVideoFullscreen(true),
    onExitFullscreen: () => setIsVideoFullscreen(false),
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <GestureDetector gesture={playerGesture}>
      <Animated.View style={[styles.modalContainer, playerAnimatedStyle]}>
        <LinearGradient
          colors={['#2145baff', '#141414', '#101010ff']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="chevron-down" size={32} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('player.nowPlaying')}</Text>
            <View style={styles.headerActions}>
              {voiceAvailable && (
                <VoiceButton
                  isListening={isVoiceListening}
                  onPress={handleVoicePress}
                  size={24}
                  color="#fff"
                />
              )}
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setIsOptionsVisible(true)}
              >
                <IconSymbol name="ellipsis-horizontal" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
          >
            <View style={styles.carouselWrapper}>
              <PlayerCarousel key={currentSong.id} {...carouselProps} />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.titleRow}>
                <View style={styles.textWrapper}>
                  <MarqueeText key={`title-${currentSong.id}`} text={currentSong.title} style={styles.title} />
                  <TouchableOpacity onPress={() => currentSong.channel.id && openArtistOverlay({ id: currentSong.channel.id, name: currentSong.channel.name })}>
                    <MarqueeText key={`artist-${currentSong.id}`} text={currentSong.channel.name} style={styles.artist} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(currentSong)}>
                  <IconSymbol
                    name={favoriteStatus ? "heart" : "heart-outline"}
                    size={28}
                    color={favoriteStatus ? "#2c5af3ff" : "#fff"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressSection}>
              <GestureDetector gesture={Gesture.Exclusive(progressGesture, progressTap)}>
                <View style={[styles.progressContainer, { opacity: isSeekEnabled ? 1 : 0.5 }]}>
                  <View style={styles.bgBar} />
                  <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
                  <View style={[styles.progressDot, { left: `${progressPercentage}%` }]} />
                </View>
              </GestureDetector>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(currentDisplayProgress)}</Text>
                <Text style={styles.timeText}>{formatTime(activeDuration)}</Text>
              </View>
            </View>

            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={toggleShuffle}>
                <IconSymbol name="shuffle" size={28} color={isShuffle ? "#2c5af3ff" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePrevious}>
                <IconSymbol name="play-skip-back" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playButton} onPress={handlePlayPausePress}>
                <Animated.View style={playIconAnimatedStyle}>
                  <IconSymbol
                    name={video.showVideo ? (activeIsPlaying ? "pause-circle" : "play-circle") : (isIntendingToPlay ? "pause-circle" : "play-circle")}
                    size={80}
                    color="#fff"
                  />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext}>
                <IconSymbol name="play-skip-forward" size={36} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleRepeat} style={styles.repeatButton}>
                <IconSymbol
                  name="repeat"
                  size={28}
                  color={repeatMode === 'one' ? "#2c5af3ff" : "#fff"}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.footerActions}>
              <TouchableOpacity onPress={handleShare}>
                <IconSymbol name="share-outline" size={24} color="#b3b3b3" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setIsSleepTimerVisible(true)}>
                <IconSymbol
                  name={sleepTimer ? "timer" : "timer-outline"}
                  size={24}
                  color={sleepTimer ? "#2c5af3ff" : "#b3b3b3"}
                />
              </TouchableOpacity>
              <View style={{ width: 16 }} />
              <TouchableOpacity onPress={() => setIsQueueVisible(true)}>
                <IconSymbol name="list" size={24} color="#b3b3b3" />
              </TouchableOpacity>
            </View>

            <LyricsPanel
              syncedLyrics={lyrics.syncedLyrics}
              plainLyrics={lyrics.plainLyrics}
              loading={lyrics.loading}
              notFound={lyrics.notFound}
              isOnline={isOnline}
              currentLineIndex={lyrics.getCurrentLineIndex(currentDisplayProgress)}
              onSeek={handleSeek}
              onExpand={() => setShowLyrics(true)}
              onManualSearch={lyrics.manualSearch}
              manualSearchDefaultQuery={lyricsDefaultQuery}
            />
          </ScrollView>
        </LinearGradient>

        {showLyrics && (
          <LyricsView
            syncedLyrics={lyrics.syncedLyrics}
            plainLyrics={lyrics.plainLyrics}
            loading={lyrics.loading}
            notFound={lyrics.notFound}
            isOnline={isOnline}
            currentLineIndex={lyrics.getCurrentLineIndex(currentDisplayProgress)}
            onSeek={handleSeek}
            onClose={() => setShowLyrics(false)}
            onManualSearch={lyrics.manualSearch}
            manualSearchDefaultQuery={lyricsDefaultQuery}
          />
        )}

        {isVideoFullscreen && (
          <GestureDetector gesture={Gesture.LongPress().minDuration(450).onStart(() => setIsVideoFullscreen(false)).runOnJS(true)}>
            <View style={styles.videoFullscreen}>
              <VideoView
                player={video.player}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
              />
              <IconSymbol
                name="chevron-down"
                size={20}
                color="rgba(255,255,255,0.4)"
                style={styles.videoFullscreenHint}
              />
            </View>
          </GestureDetector>
        )}
      </Animated.View>
      </GestureDetector>

      <SongOptionsModal
        visible={isOptionsVisible}
        onClose={() => setIsOptionsVisible(false)}
        song={currentSong}
      />

      <QueueModal
        visible={isQueueVisible}
        onClose={() => setIsQueueVisible(false)}
      />

      <SleepTimerModal
        visible={isSleepTimerVisible}
        onClose={() => setIsSleepTimerVisible(false)}
      />
      <DownloadBanner />
    </Modal>
  );
}
