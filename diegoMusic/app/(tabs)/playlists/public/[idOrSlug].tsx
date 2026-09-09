import {
  Platform,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { shareLink as shareLinkUtil } from "@/utils/alert";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Song from "@/components/Song";
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { playlistsService } from "@/services/playlistsService";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { styles } from "@/styles/FavoriteScreen.styles";
import type { SongData } from "@/interfaces/Song";
import type { PublicPlaylistDetail } from "@/interfaces/Playlist";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

export default function PublicPlaylistScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const router = useRouter();
  const { idOrSlug } = useLocalSearchParams<{ idOrSlug: string }>();
  const { t } = useLanguage();
  const { playSong, isShuffle, followPlaylist, unfollowPlaylist, playlists, currentSong } = usePlayer();

  const [detail, setDetail] = useState<PublicPlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    if (!idOrSlug) return;
    let cancelled = false;
    setLoading(true);
    playlistsService.fetchPublic(idOrSlug).then((d) => {
      if (cancelled) return;
      setDetail(d);
      setFollowing(d?.isFollowing ?? false);
      setLoading(false);
      // If this is our own playlist, send us to the editable view.
      if (d?.isOwner) {
        const own = playlists.find((p) => p.serverId === d.id);
        router.replace((own ? `/playlists/${own.id}` : `/playlists/${d.id}`) as any);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idOrSlug]);

  // Keep the follow toggle in sync if the library changes elsewhere.
  useEffect(() => {
    if (detail) setFollowing(playlists.some((p) => p.serverId === detail.id && p.kind === 'followed'));
  }, [playlists, detail]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (detail?.songs ?? []).filter(
      (s) => s.title.toLowerCase().includes(q) || s.channel.name.toLowerCase().includes(q),
    );
  }, [detail?.songs, searchQuery]);

  const handleToggleFollow = useCallback(async () => {
    if (!detail || busy) return;
    setBusy(true);
    if (following) {
      const local = playlists.find((p) => p.serverId === detail.id);
      if (local) await unfollowPlaylist(local.id);
      setFollowing(false);
    }
    else {
      await followPlaylist({
        id: detail.id,
        name: detail.name,
        coverUrl: detail.coverUrl,
        previewThumbnails: detail.previewThumbnails,
        songCount: detail.songCount,
        savesCount: detail.savesCount,
        owner: detail.owner,
      });
      setFollowing(true);
    }
    setBusy(false);
  }, [detail, busy, following, playlists, followPlaylist, unfollowPlaylist]);

  const handleShare = useCallback(() => {
    if (!detail) return;
    const link = `https://diegomusic.app/p/${detail.slug || detail.id}`;
    void shareLinkUtil(detail.name, link);
  }, [detail]);

  const playFrom = (startSong: SongData) => {
    if (filteredSongs.length === 0 || !detail) return;
    playSong(startSong, filteredSongs, 'playlist', String(detail.id));
  };
  const playAll = () => {
    if (filteredSongs.length === 0) return;
    const i = Math.floor(Math.random() * filteredSongs.length);
    playFrom(isShuffle ? filteredSongs[i] : filteredSongs[0]);
  };

  const scrollHandler = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const searchAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 60], [0, -20], Extrapolation.CLAMP) }],
  }));
  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 60], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [0, 60], [0, -20], Extrapolation.CLAMP) }],
  }));
  const iconsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 180], [0, -125], Extrapolation.CLAMP) }],
  }));
  const shuffleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [120, 150], [1, 0], Extrapolation.CLAMP),
  }));
  const headerGradientStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, 180], [insets.top + 200, insets.top + 65], Extrapolation.CLAMP),
  }));
  const headerTitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [150, 180], [0, 1], Extrapolation.CLAMP),
  }));

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" translucent />
        <LoadingSpinner size={32} color="#2c5af3" />
      </View>
    );
  }

  if (!detail) {
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
          <Text style={styles.headerTitle} numberOfLines={1}>{detail.name}</Text>
        </Animated.View>

        <View style={[styles.contentContainer, { paddingTop: insets.top + 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <IconSymbol name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} hitSlop={12}>
              <IconSymbol name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
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
            <Text style={styles.title} numberOfLines={2}>{detail.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
              {detail.owner.avatar ? (
                <Image source={{ uri: detail.owner.avatar }} style={{ width: 20, height: 20, borderRadius: 10 }} />
              ) : (
                <IconSymbol name="person" size={16} color="#b3b3b3" />
              )}
              <Text style={styles.count}>
                {t('playlist.byAuthor', { author: detail.owner.name })}
                {'  ·  '}
                {t('playlist.savedByCount', { count: detail.savesCount })}
              </Text>
            </View>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 230,
          paddingBottom: currentSong ? 190 : 120,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              backgroundColor: following ? 'transparent' : '#2c5af3',
              borderColor: '#2c5af3',
              borderWidth: following ? 1 : 0,
              borderRadius: 24,
              height: 46,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
            onPress={handleToggleFollow}
            disabled={busy}
          >
            {busy ? (
              <LoadingSpinner size={20} color="#fff" />
            ) : (
              <>
                <IconSymbol
                  name={following ? "checkmark-circle" : "add"}
                  size={20}
                  color={following ? "#2c5af3" : "#fff"}
                />
                <Text style={[styles.buttonText, { color: following ? '#2c5af3' : '#fff' }]}>
                  {following ? t('playlist.removeFromLibrary') : t('playlist.saveToLibrary')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.songContainer}>
          {filteredSongs.length > 0 ? (
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

      <Animated.View style={[styles.containerIcons, iconsAnimatedStyle]}>
        <Animated.View style={shuffleAnimatedStyle}>
          <TouchableOpacity onPress={handleShare}>
            <IconSymbol name="share-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity onPress={playAll}>
          <IconSymbol name="play-circle" size={45} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
