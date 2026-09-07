import ListPlayer from "@/components/ListPlayer";
import FavoriteArtists from "@/components/FavoriteArtists";
import { GenreOverlay } from "@/components/GenreOverlay";
import MusicArtist from "@/components/MusicArtist";
import { OfflineView } from "@/components/OfflineView";
import RecentPlayed from "@/components/RecentPlayed";
import { StatsOverlay } from "@/components/StatsOverlay";
import { UserDrawer, DRAWER_WIDTH } from "@/components/UserDrawer";
import { useNetwork } from "@/context/NetworkContext";
import { useLibrary } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ArtistData, SongData } from "@/interfaces/Song";
import { IconSymbol } from '@/components/IconSymbol';
import React, { useMemo, useRef, useState } from "react";
import { Animated, Image, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "@/styles/HomeScreen.styles";


export default function HomeScreen() {

  const [selectedTag, setSelectedTag] = useState('music');
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const openDrawer = () => {
    Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const contentTranslateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, DRAWER_WIDTH],
  });

  const { t } = useLanguage();
  const { user } = useAuth();
  const { favoriteArtists, songPlays } = useLibrary();
  const mostPlayed = useMemo(
    () =>
      (Object.values(songPlays) as unknown as SongData[])
        .sort((a, b) => ((b as any).timesPlayed || 0) - ((a as any).timesPlayed || 0))
        .slice(0, 10),
    [songPlays]
  );
  const [selectedArtist, setSelectedArtist] = useState<ArtistData | null>(null);
  const [isArtistOverlayVisible, setIsArtistOverlayVisible] = useState(false);
  const artistFadeAnim = useRef(new Animated.Value(0)).current;
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const statsFadeAnim = useRef(new Animated.Value(0)).current;
  const { isOnline, isNetworkChecked } = useNetwork();

  const handleOpenStats = () => {
    setIsStatsVisible(true);
    Animated.timing(statsFadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const handleCloseStats = () => {
    Animated.timing(statsFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setIsStatsVisible(false));
  };

  const displayArtists = useMemo(() => {
    if (favoriteArtists.length <= 3) return favoriteArtists;
    const shuffled = [...favoriteArtists].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [favoriteArtists]);

  const handleOpenArtist = (artist: ArtistData) => {
    setSelectedArtist(artist);
    setIsArtistOverlayVisible(true);
    Animated.timing(artistFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  const handleCloseArtist = () => {
    Animated.timing(artistFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setIsArtistOverlayVisible(false);
      setSelectedArtist(null);
    });
  };

  if (isNetworkChecked && !isOnline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <OfflineView />
      </SafeAreaView>
    );
  }

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={[styles.safeArea, !isWeb && { overflow: 'hidden' }]}>
      {isWeb && (
        <LinearGradient
          colors={['rgba(44,90,243,0.18)', 'rgba(44,90,243,0.04)', 'transparent']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320, zIndex: 0 }}
          pointerEvents="none"
        />
      )}

      <Animated.View style={{ flex: 1, transform: [{ translateX: isWeb ? 0 : contentTranslateX }] }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              {!isWeb && (
                <TouchableOpacity style={styles.avatarCircle} onPress={openDrawer} activeOpacity={0.8}>
                  <Image
                    source={user?.avatar ? { uri: user.avatar } : require("@/assets/images/avatar.jpg")}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}

              <View style={styles.tagsContainer}>
                <TouchableOpacity
                  style={[styles.tag, selectedTag === 'music' && styles.selectedTag]}
                  onPress={() => setSelectedTag('music')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tagText, selectedTag === 'music' && styles.selectedTagText]}>
                    {t('home.musicTag')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statsButton}
                  onPress={handleOpenStats}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="trophy-outline" size={18} color="#E0E0E0" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.content}>
              {selectedTag === 'music' && (
                <View style={styles.recentPlayedWrapper}>
                  <View>
                    <RecentPlayed />
                  </View>

                  {/* Todo: Add music you might like for V.4 DiegoMusic */}
                  {/* <View>
                    <Text style={styles.title}>Music you might like</Text>
                    <CarouselPlayer />
                  </View> */}

                  <View style={styles.musicArtistContainer}>
                    {displayArtists.map((artist) => (
                      <View key={artist.id} style={styles.musicArtistItem}>
                        <MusicArtist artist={artist} />
                      </View>
                    ))}
                  </View>

                  <View>
                    <FavoriteArtists onArtistPress={handleOpenArtist} />
                  </View>

                  <View>
                    <Text style={styles.title}>{t('home.mostPlayedTitle')}</Text>
                    {mostPlayed.length > 0 ? (
                      <ListPlayer data={mostPlayed} />
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>{t('home.noMostPlayed')}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ width: "100%", alignItems: "center" }}>
                    <Image
                      source={require("@/assets/images/footer.png")}
                      style={{ width: 200, height: 100, transform: [{ translateY: 35 }] }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <GenreOverlay
          isVisible={isArtistOverlayVisible}
          onClose={handleCloseArtist}
          genreTitle={selectedArtist?.name || ""}
          channelId={selectedArtist?.id}
          fadeAnim={artistFadeAnim}
        />

        <StatsOverlay
          isVisible={isStatsVisible}
          onClose={handleCloseStats}
          fadeAnim={statsFadeAnim}
        />
      </Animated.View>

      {!isWeb && <UserDrawer animValue={drawerAnim} onClose={closeDrawer} />}
    </SafeAreaView>
  );
}
