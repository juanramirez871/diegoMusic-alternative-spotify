import { useMemo, useRef, useState } from "react";
import { Animated, Image, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import FavoriteArtists from "@/components/FavoriteArtists";
import { GenreOverlay } from "@/components/GenreOverlay";
import { HomeHeader } from "@/components/HomeHeader";
import MusicArtist from "@/components/MusicArtist";
import { OfflineView } from "@/components/OfflineView";
import RecentPlayed from "@/components/RecentPlayed";
import { SongShelf } from "@/components/SongShelf";
import { StatsOverlay } from "@/components/StatsOverlay";
import { UserDrawer, DRAWER_WIDTH } from "@/components/UserDrawer";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNetwork } from "@/context/NetworkContext";
import { useLibrary } from "@/context/PlayerContext";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useFadeToggle } from "@/hooks/useFadeToggle";
import { useRecommendations } from "@/hooks/useRecommendations";
import type { HomeFilter } from "@/interfaces/home";
import type { ArtistData } from "@/interfaces/Song";
import { styles } from "@/styles/HomeScreen.styles";

const isWeb = Platform.OS === "web";
const FEATURED_ARTIST_COUNT = 3;
const MOST_PLAYED_COUNT = 10;
const HEADER_GRADIENT = ["rgba(44,90,243,0.22)", "rgba(44,90,243,0.06)", "transparent"] as const;

export default function HomeScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isOnline, isNetworkChecked } = useNetwork();
  const { favoriteArtists, songPlays } = useLibrary();
  const { songs: recommendedSongs } = useRecommendations(20);
  const { songs: discoverySongs } = useDiscovery();

  const [filter, setFilter] = useState<HomeFilter>("all");
  const [selectedArtist, setSelectedArtist] = useState<ArtistData | null>(null);
  const artistOverlay = useFadeToggle(300, 200);
  const statsOverlay = useFadeToggle();

  const drawerAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, DRAWER_WIDTH] });

  const openDrawer = () => {
    Animated.spring(drawerAnim, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  };

  const openArtist = (artist: ArtistData) => {
    setSelectedArtist(artist);
    artistOverlay.show();
  };

  const closeArtist = () => artistOverlay.hide(() => setSelectedArtist(null));

  const mostPlayed = useMemo(
    () =>
      Object.values(songPlays)
        .sort((a, b) => b.timesPlayed - a.timesPlayed)
        .slice(0, MOST_PLAYED_COUNT),
    [songPlays],
  );

  const featuredArtists = useMemo(() => {
    if (favoriteArtists.length <= FEATURED_ARTIST_COUNT) return favoriteArtists;
    return [...favoriteArtists].sort(() => 0.5 - Math.random()).slice(0, FEATURED_ARTIST_COUNT);
  }, [favoriteArtists]);

  if (isNetworkChecked && !isOnline) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <OfflineView />
      </SafeAreaView>
    );
  }

  const showMusic = filter !== "artists";
  const showArtists = filter !== "music";

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.body, { transform: [{ translateX: isWeb ? 0 : contentTranslateX }] }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isWeb && <LinearGradient colors={HEADER_GRADIENT} style={styles.headerGradient} pointerEvents="none" />}

          <HomeHeader
            filter={filter}
            onFilterChange={setFilter}
            onOpenStats={statsOverlay.show}
            onOpenDrawer={openDrawer}
          />

          <View style={styles.sections}>
            {showMusic && <RecentPlayed />}

            {showMusic && (
              <SongShelf
                songs={recommendedSongs}
                eyebrow={user?.name ? t("home.madeFor") : undefined}
                title={user?.name ?? t("home.forYouTitle")}
              />
            )}

            {showMusic && <SongShelf songs={discoverySongs} title={t("home.discoverTitle")} />}

            {showArtists && featuredArtists.map((artist) => <MusicArtist key={artist.id} artist={artist} />)}

            {showArtists && <FavoriteArtists onArtistPress={openArtist} />}

            {showMusic && (
              <SongShelf
                songs={mostPlayed}
                title={t("home.mostPlayedTitle")}
                emptyText={t("home.noMostPlayed")}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Image source={require("@/assets/images/footer.png")} style={styles.footerImage} />
          </View>
        </ScrollView>

        <GenreOverlay
          isVisible={artistOverlay.visible}
          onClose={closeArtist}
          genreTitle={selectedArtist?.name ?? ""}
          channelId={selectedArtist?.id}
          fadeAnim={artistOverlay.anim}
        />

        <StatsOverlay
          isVisible={statsOverlay.visible}
          onClose={() => statsOverlay.hide()}
          fadeAnim={statsOverlay.anim}
        />
      </Animated.View>

      {!isWeb && <UserDrawer animValue={drawerAnim} onClose={closeDrawer} />}
    </SafeAreaView>
  );
}
