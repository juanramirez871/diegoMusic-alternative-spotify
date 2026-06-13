import { usePlayer } from '@/context/PlayerContext';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'expo-router';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import QueueModal from "@/components/QueueModal";
import SleepTimerModal from "@/components/SleepTimerModal";
import SongOptionsModal from "@/components/SongOptionsModal";
import { useLyrics } from '@/hooks/useLyrics';
import { useLyricsTranslation } from '@/hooks/useLyricsTranslation';
import { useVideoPlayback } from '@/hooks/useVideoPlayback';
import { useNetwork } from '@/context/NetworkContext';
import { useLanguage } from '@/context/LanguageContext';
import { useThumbnail } from '@/hooks/useThumbnail';
import { MaximazedPlayerProps } from '@/interfaces/player';
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { MarqueeText } from "@/components/MarqueeText";
import { styles } from './styles.web';

export const MaximazedPlayer = ({ visible, onClose }: MaximazedPlayerProps) => {

  const { isOnline } = useNetwork();
  const { t } = useLanguage();
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [isOptionsVisible, setIsOptionsVisible] = useState(false);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isSleepTimerVisible, setIsSleepTimerVisible] = useState(false);

  useEffect(() => {
    const routeChanged = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    if (!routeChanged) return;
    setIsOptionsVisible(false);
    setIsQueueVisible(false);
    setIsSleepTimerVisible(false);
    if (visible) onClose();

  }, [pathname, visible, onClose]);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const [showLyricsEdit, setShowLyricsEdit] = useState(false);
  const [lyricsSearchQuery, setLyricsSearchQuery] = useState('');
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const videoViewRef = useRef<VideoView>(null);

  const {
    currentSong,
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
    videoQuality,
    openArtistOverlay,
    closeArtistOverlay,
  } = usePlayer();

  useEffect(() => {
    if (visible) closeArtistOverlay();
  }, [visible]);

  const video = useVideoPlayback({
    currentSong,
    isOnline,
    videoOfflineTitle: t('player.videoOfflineTitle'),
    videoOfflineMessage: t('player.videoOfflineMessage'),
    videoQuality,
    audio: { isPlaying, progress, pause, seekTo, togglePlayPause, playNext },
  });

  const activeProgress = video.showVideo ? (video.isVideoReady && video.videoProgress > 0 ? video.videoProgress : progress) : progress;
  const activeDuration = video.showVideo ? (video.isVideoReady && video.videoDuration > 0 ? video.videoDuration : duration) : duration;
  const activeIsPlaying = video.showVideo ? (video.isVideoReady ? video.isVideoPlaying : false) : isPlaying;
  const activeIsLoading = video.showVideo ? video.isVideoLoading : isLoading;

  const handlePlayPausePress = () => {
    if (video.showVideo) {
      if (!video.isVideoReady) return;
      if (video.player.playing) video.player.pause();
      else video.player.play();
      return;
    }
    if (!isLoading) togglePlayPause();
  };

  const lyrics = useLyrics(currentSong, isOnline);
  const lyricsDefaultQuery = lyrics.lyricsQuery;
  const {
    translationEnabled,
    setTranslationEnabled,
    translationFrom,
    setTranslationFrom,
    translationTo,
    setTranslationTo,
    translatedSynced,
    translatedPlain,
    translating,
    supportedLanguages,
  } = useLyricsTranslation(lyrics.syncedLyrics, lyrics.plainLyrics);

  const displaySynced = translationEnabled && translatedSynced ? translatedSynced : lyrics.syncedLyrics;
  const displayPlain = translationEnabled && translatedPlain ? translatedPlain : lyrics.plainLyrics;
  const originalSyncedLines =
    lyrics.syncedLyrics?.map((line) => line.text) ??
    lyrics.plainLyrics?.split('\n').map((line) => line.trim()).filter(Boolean) ?? [];

  const originalPlainText = lyrics.plainLyrics ?? lyrics.syncedLyrics?.map((line) => line.text).join('\n') ?? '';
  const showOriginalSyncedAboveTranslation = Boolean(translationEnabled && translatedSynced);
  const showOriginalPlainAboveTranslation = Boolean(translationEnabled && translatedPlain && originalPlainText);
  const thumbnailSource = useThumbnail(currentSong?.id, currentSong?.thumbnail?.url);
  const lyricsScrollRef = useRef<ScrollView>(null);
  const playTint = useSharedValue(0);

  useEffect(() => {
    playTint.value = withTiming(activeIsLoading ? 1 : 0, { duration: 200 });
  }, [activeIsLoading]);

  useEffect(() => {
    if (video.showVideo) {
      video.player.play();
    }
  }, [video.showVideo]);

  useEffect(() => {
    setSeekProgress(0);
    setIsSeeking(false);
    setShowLyricsEdit(false);
  }, [currentSong?.id]);

  useEffect(() => {
    setLyricsSearchQuery(lyricsDefaultQuery ?? '');
  }, [lyricsDefaultQuery]);

  useEffect(() => {
    if (lyrics.loading) setShowLyricsEdit(false);
  }, [lyrics.loading]);

  useEffect(() => {
    if (lyrics.syncedLyrics || lyrics.plainLyrics) setShowLyricsEdit(false);
  }, [lyrics.syncedLyrics, lyrics.plainLyrics]);

  useEffect(() => {
    if (!isLoading && !isSeeking) setSeekProgress(progress);
  }, [isLoading, isSeeking, progress]);

  const currentLineIndex = lyrics.getCurrentLineIndex(isSeeking ? seekProgress : progress);

  const playIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - playTint.value * 0.6,
  }));

  const handleSeek = (pct: number) => {
    if (!isFinite(pct) || activeDuration <= 0) return;
    const pos = pct * activeDuration;
    if (!isFinite(pos)) return;
    video.seek(pos);
    setSeekProgress(pos);
    setIsSeeking(true);
    setTimeout(() => setIsSeeking(false), 1500);
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const s = Math.floor(millis / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  if (!visible || !currentSong) return null;

  const displayProgress = isSeeking ? seekProgress : activeProgress;
  const progressPct = activeDuration > 0 ? Math.min(Math.max(displayProgress / activeDuration, 0), 1) : 0;
  const isFav = isFavorite(currentSong.id);
  const isRepeating = repeatMode !== 'off';

  return (
    <>
      <LinearGradient colors={['#1a3a9e', '#0d0d0d', '#080808']} style={styles.dialog}>
          <Image
            source={thumbnailSource}
            style={styles.backgroundImage}
            blurRadius={36}
          />
          <View style={styles.backgroundOverlay} />

          <View style={styles.header}>
            <TouchableOpacity onPress={() => { video.closeIfOpen(); onClose(); }} style={styles.headerBtn}>
              <IconSymbol name="chevron-down" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('player.nowPlaying')}</Text>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setIsOptionsVisible(true)}>
              <IconSymbol name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <View style={styles.left}>
              <View style={[styles.cover, video.showVideo && styles.coverVideoMode]}>
                {video.showVideo ? (
                  <>
                    {video.isVideoLoading && (
                      <View style={styles.videoLoading}><LoadingSpinner /></View>
                    )}
                    <VideoView
                      ref={videoViewRef}
                      player={video.player}
                      style={{ width: '100%', height: '100%' } as any}
                      contentFit="cover"
                      nativeControls={false}
                      allowsFullscreen
                      onFullscreenEnter={() => setIsVideoFullscreen(true)}
                      onFullscreenExit={() => setIsVideoFullscreen(false)}
                    />
                    <TouchableOpacity
                      style={styles.fullscreenBtn}
                      onPress={() => {
                        if (isVideoFullscreen) {
                          videoViewRef.current?.exitFullscreen();
                        } else {
                          videoViewRef.current?.enterFullscreen();
                        }
                      }}
                    >
                      <IconSymbol
                        name={isVideoFullscreen ? 'xmark' : 'expand-outline'}
                        size={16}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Image
                    source={thumbnailSource}
                    style={styles.coverImage}
                  />
                )}
              </View>

              <View style={styles.songInfo}>
                <View style={styles.songInfoText}>
                  <MarqueeText key={`t-${currentSong.id}`} text={currentSong.title} style={styles.title} />
                  <TouchableOpacity onPress={() => currentSong.channel.id && openArtistOverlay({ id: currentSong.channel.id, name: currentSong.channel.name })}>
                    <MarqueeText key={`a-${currentSong.id}`} text={currentSong.channel.name} style={styles.artist} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => toggleFavorite(currentSong)}>
                  <IconSymbol name={isFav ? 'heart.fill' : 'heart'} size={24} color={isFav ? '#2c5af3' : '#fff'} />
                </TouchableOpacity>
              </View>

              <View style={styles.progressSection}>
                <TouchableOpacity
                  style={styles.progressTrack}
                  activeOpacity={1}
                  onPress={(e: any) => {
                    const rect = (e.currentTarget as any).getBoundingClientRect?.();
                    if (rect && rect.width > 0) {
                      handleSeek((e.nativeEvent.clientX - rect.left) / rect.width);
                    }
                  }}
                >
                  <View style={styles.progressBg} />
                  <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any }]} />
                  <View style={[styles.progressDot, { left: `${progressPct * 100}%` as any }]} />
                </TouchableOpacity>
                <View style={styles.timeRow}>
                  <Text style={styles.time}>{formatTime(displayProgress)}</Text>
                  <Text style={styles.time}>{formatTime(activeDuration)}</Text>
                </View>
              </View>

              <View style={styles.controls}>
                <TouchableOpacity onPress={toggleShuffle}>
                  <IconSymbol name="shuffle" size={24} color={isShuffle ? '#2c5af3' : '#fff'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={playPrevious}>
                  <IconSymbol name="play-skip-back" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.playBtn} onPress={handlePlayPausePress}>
                  <Animated.View style={playIconAnimatedStyle}>
                    <IconSymbol
                      name={activeIsPlaying ? 'pause' : 'play'}
                      size={32}
                      color="#000"
                    />
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={playNext}>
                  <IconSymbol name="play-skip-forward" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleRepeat}>
                  <IconSymbol name="repeat" size={24} color={isRepeating ? '#2c5af3' : '#fff'} />
                </TouchableOpacity>
              </View>

              {/* Footer actions */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={() => setIsSleepTimerVisible(true)}>
                  <IconSymbol name={sleepTimer ? 'timer' : 'timer-outline'} size={20} color={sleepTimer ? '#2c5af3' : '#b3b3b3'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={video.toggle}>
                  <IconSymbol name="play-video" size={20} color={video.showVideo ? '#2c5af3' : '#b3b3b3'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsQueueVisible(true)}>
                  <IconSymbol name="list" size={20} color="#b3b3b3" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Right: lyrics */}
            <View style={styles.right}>
              <View style={styles.lyricsTitleRow}>
                <Text style={styles.lyricsTitle}>{t('lyrics.title')}</Text>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setTranslationEnabled(!translationEnabled)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      name="translate"
                      size={16}
                      color={translationEnabled ? '#2c5af3ff' : '#b3b3b3'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowLyricsEdit(s => !s)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol name="pencil-outline" size={16} color={showLyricsEdit ? '#fff' : '#b3b3b3'} />
                  </TouchableOpacity>
                </View>
              </View>

              {translationEnabled && (
                <View style={styles.translateRow}>
                  <Text style={styles.translatePickerLabel}>{t('lyrics.translateFrom')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {supportedLanguages.map((lang) => (
                        <TouchableOpacity
                          key={`wf-${lang.code}`}
                          onPress={() => setTranslationFrom(lang.code)}
                          style={[
                            styles.translateToggleBtn,
                            translationFrom === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.translateToggleText,
                              translationFrom === lang.code && styles.translateToggleTextActive,
                            ]}
                          >
                            {lang.code.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {translationEnabled && (
                <View style={[styles.translateRow, styles.translateRowBottom]}>
                  <Text style={styles.translatePickerLabel}>{t('lyrics.translateTo')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {supportedLanguages.map((lang) => (
                        <TouchableOpacity
                          key={`wt-${lang.code}`}
                          onPress={() => setTranslationTo(lang.code)}
                          style={[
                            styles.translateToggleBtn,
                            translationTo === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.translateToggleText,
                              translationTo === lang.code && styles.translateToggleTextActive,
                            ]}
                          >
                            {lang.code.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {(showLyricsEdit || (!lyrics.loading && isOnline && lyrics.notFound)) && lyrics.manualSearch && (
                <View style={styles.lyricsSearchRow}>
                  <TextInput
                    style={styles.lyricsSearchInput}
                    value={lyricsSearchQuery}
                    onChangeText={setLyricsSearchQuery}
                    placeholder={t('lyrics.searchPlaceholder')}
                    placeholderTextColor="#555"
                    onSubmitEditing={() => lyricsSearchQuery.trim() && lyrics.manualSearch!(lyricsSearchQuery.trim())}
                    returnKeyType="search"
                    selectTextOnFocus
                  />
                  <TouchableOpacity
                    onPress={() => lyricsSearchQuery.trim() && lyrics.manualSearch!(lyricsSearchQuery.trim())}
                    style={styles.lyricsSearchBtn}
                  >
                    <IconSymbol name="search" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}

              {(lyrics.loading || translating) && (
                <View style={styles.lyricsCenter}>
                  <LoadingSpinner />
                </View>
              )}
              {!lyrics.loading && !translating && !isOnline && (
                <View style={styles.lyricsCenter}>
                  <Text style={styles.lyricsEmpty}>{t('lyrics.offline')}</Text>
                </View>
              )}
              {!lyrics.loading && !translating && isOnline && lyrics.notFound && (
                <View style={styles.lyricsCenter}>
                  <Text style={styles.lyricsEmpty}>{t('lyrics.notFound')}</Text>
                </View>
              )}
              {!lyrics.loading && !translating && displaySynced && displaySynced.length > 0 && (
                <ScrollView ref={lyricsScrollRef} style={styles.lyricsScroll} showsVerticalScrollIndicator={false}>
                  {displaySynced.map((line, i) => {
                    const isActive = i === currentLineIndex;
                    const originalText = originalSyncedLines[i] ?? line.text;
                    return (
                      <TouchableOpacity key={i} onPress={() => handleSeek(line.time / duration)} activeOpacity={0.7}>
                        {showOriginalSyncedAboveTranslation && (
                          <Text style={styles.lyricOriginalLine}>{originalText}</Text>
                        )}
                        <Text style={[styles.lyricLine, isActive && styles.lyricLineActive]}>
                          {line.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              {!lyrics.loading && !translating && displayPlain && !displaySynced && (
                <ScrollView style={styles.lyricsScroll} showsVerticalScrollIndicator={false}>
                  {showOriginalPlainAboveTranslation && (
                    <Text style={styles.lyricOriginalPlain}>{originalPlainText}</Text>
                  )}
                  <Text style={styles.lyricPlain}>{displayPlain}</Text>
                </ScrollView>
              )}
            </View>
          </View>
        </LinearGradient>

      <SongOptionsModal visible={isOptionsVisible} onClose={() => setIsOptionsVisible(false)} song={currentSong} />
      <QueueModal visible={isQueueVisible} onClose={() => setIsQueueVisible(false)} />
      <SleepTimerModal visible={isSleepTimerVisible} onClose={() => setIsSleepTimerVisible(false)} />
    </>
  );
};
