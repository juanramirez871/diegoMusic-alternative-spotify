import {
  Platform,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Song from "@/components/Song";
import { PlaylistCover } from "@/components/PlaylistCover";
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styles } from "@/styles/FavoriteScreen.styles";
import type { SongData } from "@/interfaces/Song";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

import PlaylistOptionsModal from "@/components/PlaylistOptionsModal";
const local = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  titleCover: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  titleTextCol: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  containerIcons: {
    top: 250,
  },
  downloadBanner: {
    position: 'absolute',
    bottom: 22,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(28,28,28,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    maxWidth: 170,
  },
  downloadBannerText: {
    color: '#e6e6e6',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default function PlaylistDetailScreen() {

  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    playlists,
    getPlaylistSongs,
    playSong,
    isShuffle,
    toggleShuffle,
    unfollowPlaylist,
    syncProgress,
    webFolderMissing,
    requestWebFolder,
    currentSong,
  } = usePlayer();
  const { t } = useLanguage();

  const playlist = useMemo(() => playlists.find((p) => p.id === id) ?? null, [playlists, id]);

  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [optionsVisible, setOptionsVisible] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getPlaylistSongs(id).then((s) => {
      if (!cancelled) {
        setSongs(s);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id, getPlaylistSongs, playlist?.songCount]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return [...songs].reverse().filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        song.channel.name.toLowerCase().includes(q),
    );
  }, [songs, searchQuery]);

  const title = playlist?.name ?? t('playlist.defaultName');
  const isFollowed = playlist?.kind === 'followed';

  const handleUnfollow = useCallback(async () => {
    if (!playlist) return;
    await unfollowPlaylist(playlist.id);
    router.back();
  }, [playlist, unfollowPlaylist, router]);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 60], [0, -20], Extrapolation.CLAMP) }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 90], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 90], [0, -20], Extrapolation.CLAMP) }],
  }));

  // Icons fade out as the header collapses so they never overlap the back /
  // options row.
  const iconsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [40, 110], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 140], [0, -70], Extrapolation.CLAMP) }],
  }));

  const shuffleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 150], [1, 0], Extrapolation.CLAMP),
  }));

  const headerGradientStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, 200],
      [insets.top + 240, insets.top + 65],
      Extrapolation.CLAMP,
    ),
  }));

  const headerTitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [160, 200], [0, 1], Extrapolation.CLAMP),
  }));

  const playFrom = (startSong: SongData) => {
    if (filteredSongs.length === 0 || !id) return;
    playSong(startSong, filteredSongs, 'playlist', id);
  };

  const playAll = () => {
    if (filteredSongs.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredSongs.length);
    playFrom(isShuffle ? filteredSongs[randomIndex] : filteredSongs[0]);
  };

  if (!playlist && playlists.length > 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" translucent />
        <Text style={styles.emptyStateText}>{t('playlist.notFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={[styles.buttonText, { color: '#2c5af3' }]}>{t('errors.cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />

      <Animated.View style={[styles.headerContainer, headerGradientStyle]}>
        <LinearGradient
          colors={["#2c5af3ff", Platform.OS === 'web' ? '#121212' : '#252424ff']}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.headerTitleContainer, headerTitleAnimatedStyle, { paddingTop: insets.top }]}
        >
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </Animated.View>

        <View style={[styles.contentContainer, { paddingTop: insets.top + 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <IconSymbol name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            {isFollowed ? (
              <TouchableOpacity onPress={handleUnfollow} hitSlop={12}>
                <IconSymbol name="checkmark-circle" size={24} color="#2c5af3" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setOptionsVisible(true)} hitSlop={12}>
                <IconSymbol name="ellipsis-horizontal" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <Animated.View style={[styles.containerSearch, searchAnimatedStyle]}>
            <View style={styles.inputWrapper}>
              <IconSymbol name="search" size={20} color="#b3b3b3" style={styles.searchIcon} />
              <TextInput
                style={styles.input}
                placeholder={t('playlist.findIn')}
                placeholderTextColor="#b3b3b3"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <IconSymbol name="close" size={18} color="#b3b3b3" />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <View style={local.titleRow}>
              <View style={local.titleCover}>
                <PlaylistCover
                  coverUrl={playlist?.coverUrl}
                  previewThumbnails={playlist?.previewThumbnails ?? []}
                  size={64}
                  borderRadius={8}
                />
              </View>
              <View style={local.titleTextCol}>
                <Text style={local.title} numberOfLines={2}>{title}</Text>
                <Text style={styles.count}>
                  {isFollowed && playlist?.owner
                    ? `${t('playlist.byAuthor', { author: playlist.owner.name })}  ·  ${t('playlist.songCount', { count: songs.length })}`
                    : t('playlist.songCount', { count: songs.length })}
                </Text>
                {playlist?.unavailable && (
                  <Text style={[styles.count, { color: '#ff9955', marginTop: 2 }]}>
                    {t('playlist.unavailable')}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>

          {Platform.OS === 'web' && (
            <Animated.View style={[styles.containerIcons, styles.containerIconsWeb]}>
              <TouchableOpacity onPress={toggleShuffle}>
                <IconSymbol name="shuffle" size={35} color={isShuffle ? "#2c5af3ff" : "#fff"} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.webPlayBtn} onPress={playAll}>
                <IconSymbol name="play" size={28} color="#000" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 270,
          paddingBottom: currentSong ? 190 : 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.songContainer}>
          {loading ? (
            <View style={styles.emptyState}>
              <LoadingSpinner size={28} color="#2c5af3" />
            </View>
          ) : filteredSongs.length > 0 ? (
            filteredSongs.map((song) => (
              <Song key={song.id} data={song} onPress={() => playFrom(song)} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="musical-notes-outline" size={60} color="#333" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? t('playlist.noResults') : t('playlist.noSongs')}
              </Text>
            </View>
          )}
        </View>
      </Animated.ScrollView>

      {Platform.OS !== 'web' && (
        <Animated.View style={[styles.containerIcons, local.containerIcons, iconsAnimatedStyle]}>
          <Animated.View style={shuffleAnimatedStyle}>
            <TouchableOpacity onPress={toggleShuffle}>
              <IconSymbol name="shuffle" size={30} color={isShuffle ? "#2c5af3ff" : "#fff"} />
            </TouchableOpacity>
          </Animated.View>
          <TouchableOpacity onPress={playAll}>
            <IconSymbol name="play-circle" size={45} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {playlist && !isFollowed && (
        <PlaylistOptionsModal
          visible={optionsVisible}
          onClose={() => setOptionsVisible(false)}
          playlist={playlist}
          onDeleted={() => router.back()}
        />
      )}

      {playlist?.downloadEnabled && syncProgress && (
        <View style={local.downloadBanner}>
          <LoadingSpinner size={12} color="#2c5af3" />
          <Text style={local.downloadBannerText} numberOfLines={1}>
            {t('playlist.downloading', { done: syncProgress.done, total: syncProgress.total })}
          </Text>
        </View>
      )}

      {playlist?.downloadEnabled && !syncProgress && webFolderMissing && (
        <TouchableOpacity
          style={local.downloadBanner}
          onPress={requestWebFolder}
          activeOpacity={0.8}
        >
          <IconSymbol name="arrow.down.circle.fill" size={13} color="#2c5af3" />
          <Text style={local.downloadBannerText} numberOfLines={1}>
            {t('playlist.chooseFolder')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
