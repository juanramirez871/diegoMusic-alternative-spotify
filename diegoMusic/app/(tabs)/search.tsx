import { GenreOverlay } from "@/components/GenreOverlay";
import { OfflineView } from "@/components/OfflineView";
import { SearchOverlay } from "@/components/SearchOverlay";
import CATEGORIES from "@/constants/categories";
import { useNetwork } from "@/context/NetworkContext";
import { useLanguage } from "@/context/LanguageContext";
import { usePlayerUI } from "@/context/PlayerContext";
import type { HistoryItem } from '@/interfaces/ui';
import storage from '@/services/storage';
import { IconSymbol } from '@/components/IconSymbol';
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/styles/SearchTab.styles";

const RECENT_SEARCHES_KEY = '@recent_searches';
const webGridStyle = {
  display: 'grid' as any,
  gridTemplateColumns: 'repeat(auto-fill, minmax(max(180px, 25% - 12px), 1fr))' as any,
};

export default function TabTwoScreen() {

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<HistoryItem[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<{ title: string; query: string } | null>(null);
  const [isGenreVisible, setIsGenreVisible] = useState(false);
  const { isOnline, isNetworkChecked, isApiReachable } = useNetwork();
  const { t } = useLanguage();
  const { isMaximized } = usePlayerUI();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const savedHistory = await storage.getItem(RECENT_SEARCHES_KEY);
        if (savedHistory) {
          setRecentSearches(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('Error loading history:', error);
      }
    };
    loadHistory();
  }, []);

  const handleUpdateHistory = async (newHistory: HistoryItem[]) => {
    setRecentSearches(newHistory);
    try {
      await storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newHistory));
    }
    catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const genreFadeAnim = useRef(new Animated.Value(0)).current;

  const handleOpenSearch = () => {
    setIsSearching(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleOpenGenre = (genreTitle: string, query: string) => {
    setSelectedGenre({ title: genreTitle, query });
    setIsGenreVisible(true);
    Animated.timing(genreFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleCloseGenre = () => {
    Animated.timing(genreFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsGenreVisible(false);
      setSelectedGenre(null);
    });
  };

  const handleCloseSearch = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsSearching(false);
      setSearchQuery("");
    });
  };

  useEffect(() => {
    if (isMaximized && isSearching) {
      handleCloseSearch();
    }
  }, [isMaximized]);

  const isDisabled = (isNetworkChecked && !isOnline) || !isApiReachable;

  if (isNetworkChecked && !isOnline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <OfflineView />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.container}>
          {Platform.OS !== 'web' && (
            <View style={styles.containerHeader}>
              <Image
                source={require("@/assets/images/avatar.jpg")}
                style={styles.avatar}
              />
              <Text style={styles.headerTitle}>{t('search.title')}</Text>
            </View>
          )}

          {Platform.OS !== 'web' && (
            <View style={styles.searchSection}>
              <TouchableOpacity
                activeOpacity={isDisabled ? 1 : 0.9}
                style={[styles.inputWrapper, isDisabled && styles.inputWrapperDisabled]}
                onPress={isDisabled ? undefined : handleOpenSearch}
                disabled={isDisabled}
              >
                <IconSymbol
                  name="search"
                  size={22}
                  color={isDisabled ? "#aaa" : "#252424"}
                  style={styles.searchIcon}
                />
                <Text style={[styles.placeholderText, isDisabled && styles.placeholderDisabled]}>
                  {isDisabled ? t('search.placeholderOffline') : t('search.placeholder')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.browseAllSection}>
            <Text style={styles.sectionTitle}>{t('search.browseAll')}</Text>
            <View style={[styles.categoriesGrid, Platform.OS === 'web' && webGridStyle]}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryCard, Platform.OS === 'web' && { width: '100%' as any }, { backgroundColor: category.color }, isDisabled && styles.categoryCardDisabled]}
                  onPress={isDisabled ? undefined : () => handleOpenGenre(t(`genres.${category.key}`), category.query)}
                  disabled={isDisabled}
                  activeOpacity={isDisabled ? 1 : 0.7}
                >
                  <Text style={styles.categoryTitle}>{t(`genres.${category.key}`)}</Text>
                  <Image
                    source={category.image}
                    style={[styles.categoryIcon, isDisabled && styles.categoryIconDisabled]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <SearchOverlay 
        isVisible={isSearching}
        onClose={handleCloseSearch}
        fadeAnim={fadeAnim}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        recentSearches={recentSearches}
        setRecentSearches={handleUpdateHistory}
      />

      <GenreOverlay 
        isVisible={isGenreVisible}
        onClose={handleCloseGenre}
        genreTitle={selectedGenre?.title || ''}
        searchQuery={selectedGenre?.query}
        fadeAnim={genreFadeAnim}
      />
    </SafeAreaView>
  );
}
