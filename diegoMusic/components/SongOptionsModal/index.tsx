import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Linking,
} from "react-native";
import { IconSymbol } from '@/components/IconSymbol';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useLibrary } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { SongOptionsModalProps } from "@/interfaces/Song";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { styles } from './styles';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");


export default function SongOptionsModal({
  visible,
  onClose,
  song,
}: SongOptionsModalProps) {

  const { toggleFavoriteArtist, isFavoriteArtist } = useLibrary();
  const { t } = useLanguage();
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);
  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(SCREEN_HEIGHT * 0.4);
  const startOpenAnimation = () => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    contentTranslateY.value = withTiming(0, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleClose = () => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    contentTranslateY.value = withTiming(
      SCREEN_HEIGHT * 0.4,
      { duration: 200 },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
        }
      }
    );
  };

  // iOS only presents one Modal at a time, so we must fully dismiss this sheet
  // before mounting the "add to playlist" sheet, otherwise it never appears.
  const openAddToPlaylist = () => {
    onClose();
    setTimeout(() => setAddToPlaylistVisible(true), 260);
  };

  const handleToggleArtistFavorite = () => {
    if (song?.channel?.id && song?.channel?.name) {
      toggleFavoriteArtist({
        id: song.channel.id,
        name: song.channel.name,
        avatar: song.channel?.avatar ?? (song.channel?.icon ?? "")
      });
    }
  };

  const handleOpenOriginalVideo = () => {
    if (song?.url) {
      Linking.openURL(song.url).catch((err) =>
        console.error("Error opening URL:", err)
      );
    }
  };

  const artistFavoriteStatus = song?.channel?.id ? isFavoriteArtist(song.channel.id) : false;

  useEffect(() => {
    if (visible) {
      startOpenAnimation();
    } else {
      overlayOpacity.value = 0;
      contentTranslateY.value = SCREEN_HEIGHT * 0.4;
    }
  }, [visible]);

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={startOpenAnimation}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.handle} />

          <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
              {song?.title || t('songOptions.untitled')}
              </Text>
            </View>

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.option}
              onPress={openAddToPlaylist}
            >
              <IconSymbol name="list.bullet" size={24} color="#fff" />
              <Text style={styles.optionText}>{t('songOptions.addToPlaylist')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                handleToggleArtistFavorite();
                handleClose();
              }}
            >
              <IconSymbol
                name={artistFavoriteStatus ? "person" : "person-add-outline"}
                size={24}
                color={artistFavoriteStatus ? "#2c5af3ff" : "#fff"}
              />
              <Text style={styles.optionText}>
                {artistFavoriteStatus ? t('songOptions.removeArtistFromFavorites') : t('songOptions.addArtistToFavorites')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                handleOpenOriginalVideo();
                handleClose();
              }}
            >
              <IconSymbol name="videocam-outline" size={24} color="#fff" />
              <Text style={styles.optionText}>{t('songOptions.openOriginalVideo')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>

    <AddToPlaylistModal
      visible={addToPlaylistVisible}
      onClose={() => setAddToPlaylistVisible(false)}
      song={song}
    />
    </>
  );
}
