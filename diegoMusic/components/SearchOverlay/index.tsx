import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { IconSymbol } from '@/components/IconSymbol';
import Song from "@/components/Song";
import { youtubeService } from "@/services/youtubeService";
import { playlistsService } from "@/services/playlistsService";
import { Skeleton } from "@/components/Skeleton";
import { usePlayback, useQueue, useLibrary } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { DownloadBanner } from "@/components/DownloadBanner";
import { PlaylistResultRow } from "@/components/PlaylistResultRow";
import { SongData } from "@/interfaces/Song";
import type { PublicPlaylistResult } from "@/interfaces/Playlist";
import type { HistoryItem, SearchOverlayProps } from '@/interfaces/ui';
import { styles } from './styles';

const SongSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <Skeleton width={50} height={50} borderRadius={4} />
    <View style={styles.skeletonInfo}>
      <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <Skeleton width="40%" height={12} borderRadius={4} />
    </View>
  </View>
);

const SearchLoadingIndicator = () => {

  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),

        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  
  }, [animatedValue]);

  return (
    <Animated.View 
      style={[
        styles.searchLoadingBar, 
        { 
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.3, 1],
          })
        }
      ]} 
    />
  );
};

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isVisible,
  onClose,
  fadeAnim,
  searchQuery,
  setSearchQuery,
  recentSearches,
  setRecentSearches,
}) => {

  const { playSong } = usePlayback();
  const { setQueue, isShuffle } = useQueue();
  const { playlists } = useLibrary();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [results, setResults] = useState<SongData[]>([]);
  const [playlistResults, setPlaylistResults] = useState<PublicPlaylistResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'songs' | 'playlists'>('all');

  const fetchResults = async (query: string) => {

    const trimmedQuery = query.trim();
    if (trimmedQuery.length <= 3) {
      setResults([]);
      setPlaylistResults([]);
      setLastSearchedQuery("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [songs, playlists] = await Promise.allSettled([
      youtubeService.searchVideos(trimmedQuery, 21),
      playlistsService.searchPublic(trimmedQuery, 6),
    ]);

    if (songs.status === 'fulfilled') {
      setResults(songs.value);
    }
    else {
      console.error("Error fetching search results:", songs.reason);
      setResults([]);
    }

    setPlaylistResults(
      playlists.status === 'fulfilled' && Array.isArray(playlists.value) ? playlists.value : [],
    );

    setLastSearchedQuery(trimmedQuery);
    setIsLoading(false);
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    setFilter('all');
    if (trimmedQuery.length <= 3) {
      setResults([]);
      setPlaylistResults([]);
      setLastSearchedQuery("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      fetchResults(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSong = async (song: SongData) => {
    const isAlreadyInHistory = recentSearches.some(item => item.text === song.title);

    if (!isAlreadyInHistory) {
      const newHistoryItem: HistoryItem = {
        id: song.id,
        text: song.title,
      };
      setRecentSearches([newHistoryItem, ...recentSearches].slice(0, 10));
    }

    const immediateQueue = results.length > 0
      ? [song, ...results.filter(s => s.id !== song.id)]
      : undefined;
    playSong(song, immediateQueue);

    if (song.channel?.id) {
      youtubeService.getChannelVideos(song.channel.id)
        .then((channelVideos) => {
          const filteredQueue = channelVideos.filter(s => s.id !== song.id);
          if (filteredQueue.length === 0) return;
          if (isShuffle) {
            for (let i = filteredQueue.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [filteredQueue[i], filteredQueue[j]] = [filteredQueue[j], filteredQueue[i]];
            }
          }
          setQueue([song, ...filteredQueue]);
        })
        .catch((error) => console.warn("Error fetching channel videos for queue:", error));
    }
  };

  const removeHistoryItem = (id: string) => {
    setRecentSearches(recentSearches.filter(item => item.id !== id));
  };

  const clearAllHistory = () => {
    setRecentSearches([]);
  };

  const handleSelectPlaylist = (p: PublicPlaylistResult) => {
    onClose();
    if (p.isOwner) {
      // Send owners straight to their editable playlist view.
      const own = playlists.find((pl) => pl.serverId === p.id);
      router.push(`/playlists/${own?.id ?? p.id}` as any);
      return;
    }
    router.push(`/playlists/public/${p.slug || p.id}` as any);
  };

  const showSongs = filter !== 'playlists';
  const showPlaylists = filter !== 'songs';

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, zIndex: 100 }]}>
      <StatusBar style="light" backgroundColor="#121212" />
      <DownloadBanner />
      <View style={{ backgroundColor: "#121212", paddingTop: insets.top }}>
        <View style={styles.modalHeader}>
          <View style={styles.activeSearchWrapper}>
            <TextInput
              autoFocus
              style={styles.activeSearchInput}
              placeholder={t('searchOverlay.placeholder')}
              placeholderTextColor="#b3b3b3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {isLoading && <SearchLoadingIndicator />}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelButtonWrapper}>
            <Text style={styles.cancelButton}>{t('searchOverlay.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {searchQuery.trim().length > 3 && (results.length > 0 || playlistResults.length > 0) && (
        <View style={styles.filterRow}>
          {([
            ['all', t('search.filterAll')],
            ['songs', t('search.filterSongs')],
            ['playlists', t('search.filterPlaylists')],
          ] as const).map(([f, label]) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.searchContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}
      >
        {searchQuery.trim().length > 3 ? (
          isLoading && results.length === 0 ? (
            <View style={styles.resultsContainer}>
              {[...Array(10)].map((_, i) => (
                <SongSkeleton key={i} />
              ))}
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.resultsContainer}
            >
              {showPlaylists && playlistResults.length > 0 && (
                <View style={styles.section}>
                  {filter === 'all' && (
                    <Text style={styles.sectionTitle}>{t('search.playlistsSection')}</Text>
                  )}
                  {playlistResults.map((p) => (
                    <PlaylistResultRow
                      key={`pl-${p.id}`}
                      playlist={p}
                      onPress={() => handleSelectPlaylist(p)}
                    />
                  ))}
                </View>
              )}

              {showSongs && results.length > 0 && (
                <>
                  {filter === 'all' && playlistResults.length > 0 && (
                    <Text style={[styles.sectionTitle, styles.songsSectionTitle]}>
                      {t('search.songsSection')}
                    </Text>
                  )}
                  {results.map((item, index) => (
                    <Song
                      key={`${item.id}-${index}`}
                      data={item}
                      onPress={handleSelectSong}
                    />
                  ))}
                </>
              )}

              {!isLoading && searchQuery.trim() === lastSearchedQuery && (
                (filter === 'playlists' && playlistResults.length === 0) ||
                (filter === 'songs' && results.length === 0) ||
                (filter === 'all' && results.length === 0 && playlistResults.length === 0)
              ) && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>{t('searchOverlay.noResults')}</Text>
                  <Text style={styles.emptyStateSub}>{t('searchOverlay.noResultsSub')}</Text>
                </View>
              )}
            </ScrollView>
          )
        ) : recentSearches.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="search" size={44} color="#8f8f8f" style={styles.emptyStateIcon} />
            <Text style={styles.emptyStateTitle}>{t('searchOverlay.emptyTitle')}</Text>
            <Text style={styles.emptyStateSub}>{t('searchOverlay.emptySub')}</Text>
          </View>
        ) : (
          <View style={styles.recentSearchesContainer}>
            <View style={styles.recentSearchesHeader}>
              <Text style={styles.recentSearchesTitle}>{t('searchOverlay.recentSearches')}</Text>
              <TouchableOpacity onPress={clearAllHistory}>
                <Text style={styles.clearRecentText}>{t('searchOverlay.clearAll')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
            >
              {recentSearches.map((item, index) => (
                <TouchableOpacity 
                  key={`${item.id}-${index}`} 
                  style={styles.recentSearchItem}
                  onPress={() => setSearchQuery(item.text)}
                >
                  <IconSymbol name="time-outline" size={20} color="#b3b3b3" style={styles.recentSearchIcon} />
                  <Text style={styles.recentSearchText}>{item.text}</Text>
                  <TouchableOpacity onPress={() => removeHistoryItem(item.id)}>
                    <IconSymbol name="close" size={18} color="#b3b3b3" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </KeyboardAvoidingView>
    </Animated.View>
  );
};
