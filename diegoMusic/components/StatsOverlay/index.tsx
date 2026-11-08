import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { IconSymbol } from "@/components/IconSymbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLibrary } from "@/context/PlayerContext";
import { parseDuration } from "@/context/player/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { StatsOverlayProps } from "@/interfaces/ui";
import { styles } from "./styles";
import { DEFAULT_ARTIST_AVATAR } from "@/constants/images";

export const StatsOverlay: React.FC<StatsOverlayProps> = ({
  isVisible,
  onClose,
  fadeAnim,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { favorites, streak, artistPlays, songPlays } = useLibrary();

  if (!isVisible) return null;

  const allSongs = Object.values(songPlays).sort(
    (a, b) => b.timesPlayed - a.timesPlayed,
  );
  const totalPlays = allSongs.reduce((acc, s) => acc + s.timesPlayed, 0);
  const totalMinutes = allSongs.reduce((acc, song) => {
    const durationMs = parseDuration(song.duration_formatted || "");
    return acc + (durationMs * song.timesPlayed) / 60000;
  }, 0);

  const topArtists = Object.values(artistPlays)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topSongs = allSongs.slice(0, 5);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, top: -insets.top, paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor="#121212" translucent={false} />
      <View style={[styles.header, { paddingTop: 10 }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <IconSymbol name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("stats.title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 120 },
        ]}
      >
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <IconSymbol name="musical-notes" size={24} color="#2c5af3ff" />
            <Text style={styles.cardNumber}>{totalPlays}</Text>
            <Text style={styles.cardLabel}>{t("stats.totalPlays")}</Text>
          </View>
          <View style={styles.card}>
            <IconSymbol name="time" size={24} color="#2c5af3ff" />
            <Text style={styles.cardNumber}>{Math.round(totalMinutes)}</Text>
            <Text style={styles.cardLabel}>{t("stats.minutes")}</Text>
          </View>
          <View style={styles.card}>
            <IconSymbol name="heart" size={24} color="#2c5af3ff" />
            <Text style={styles.cardNumber}>{favorites.length}</Text>
            <Text style={styles.cardLabel}>{t("stats.liked")}</Text>
          </View>
        </View>

        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Text style={styles.streakFlame}>🔥</Text>
            <View>
              <Text style={styles.streakLabel}>{t("stats.dayStreak")}</Text>
              <Text style={styles.streakSub}>
                {streak > 0 ? t("stats.keepGoing") : t("stats.playToday")}
              </Text>
            </View>
          </View>
          <Text style={styles.streakNumber}>{streak}</Text>
        </View>

        {topArtists.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("stats.topArtists")}</Text>
            <View style={styles.artistsRow}>
              {topArtists.map((artist, i) => {
                const thumb = { uri: artist.avatar || DEFAULT_ARTIST_AVATAR };
                return (
                  <View key={artist.name} style={styles.artistItem}>
                    {i === 0 && (
                      <View style={styles.crownBadge}>
                        <Text style={styles.crownText}>
                          <Image
                            source={require("@/assets/images/crown2.png")}
                            style={styles.crownImage}
                          />
                        </Text>
                      </View>
                    )}
                    <Image source={thumb} style={styles.artistAvatar} />
                    <Text style={styles.artistName} numberOfLines={1}>
                      {artist.name}
                    </Text>
                    <Text style={styles.artistPlays}>
                      {t("stats.plays", { count: artist.count })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {topSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("stats.mostPlayed")}</Text>
            {topSongs.map((song, i) => {
              const thumb = song.thumbnail?.url
                ? { uri: song.thumbnail.url }
                : require("@/assets/images/cover.jpg");
              return (
                <View key={song.id} style={styles.songRow}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Image source={thumb} style={styles.songThumb} />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.songArtist} numberOfLines={1}>
                      {song.channel.name}
                    </Text>
                  </View>
                  <View style={styles.playsBadge}>
                    <Text style={styles.playsText}>
                      {song.timesPlayed || 1}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {totalPlays === 0 && favorites.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="bar-chart-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>{t("stats.empty")}</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};
