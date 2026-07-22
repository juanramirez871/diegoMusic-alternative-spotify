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
import { IconSymbol } from '@/components/IconSymbol';
import Song from "@/components/Song";
import { youtubeService } from "@/services/youtubeService";
import { Skeleton } from "@/components/Skeleton";
import { usePlayback, useQueue } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { DownloadBanner } from "@/components/DownloadBanner";
import { VoiceButton } from "@/components/VoiceButton";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import { useVoiceCommandActions } from "@/hooks/useVoiceCommandActions";
import { SongData } from "@/interfaces/Song";
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
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<SongData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");

  const runCommand = useVoiceCommandActions();
  const { isListening, start, stop, available } = useVoiceSearch({
    onResult: (result) => {
      if (result.command) {
        runCommand(result.command);
      } else if (result.query) {
        setSearchQuery(result.query);
      }
    },
    onPartial: (text) => setSearchQuery(text),
  });

  const handleMicPress = () => {
    if (isListening) stop();
    else start();
  };

  const fetchResults = async (query: string) => {
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length <= 3) {
      setResults([]);
      setLastSearchedQuery("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await youtubeService.searchVideos(trimmedQuery, 21);
      setResults(data);
      setLastSearchedQuery(trimmedQuery);
    }
    catch (error) {
      console.error("Error fetching search results:", error);
      setResults([]);
      setLastSearchedQuery(trimmedQuery);
    }
    finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length <= 3) {
      setResults([]);
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

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.modalContainer, { opacity: fadeAnim, zIndex: 100 }]}>
      <DownloadBanner />
      <View style={{ backgroundColor: "#282828", paddingTop: insets.top }}>
        <View style={styles.modalHeader}>
          <View style={styles.activeSearchWrapper}>
            <TextInput
              autoFocus
              style={styles.activeSearchInput}
              placeholder={isListening ? t('searchOverlay.listening') : t('searchOverlay.placeholder')}
              placeholderTextColor="#b3b3b3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {available && (
              <VoiceButton
                isListening={isListening}
                onPress={handleMicPress}
                style={styles.voiceButton}
              />
            )}
            {isLoading && <SearchLoadingIndicator />}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.cancelButtonWrapper}>
            <Text style={styles.cancelButton}>{t('searchOverlay.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              {results.map((item, index) => (
                <Song 
                  key={`${item.id}-${index}`} 
                  data={item} 
                  onPress={handleSelectSong}
                />
              ))}
              {!isLoading && results.length === 0 && searchQuery.trim() === lastSearchedQuery && (
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
