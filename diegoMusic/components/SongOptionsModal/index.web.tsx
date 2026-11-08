import React, { useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from '@/components/IconSymbol';
import { ModalShell } from '@/components/ModalShell';
import { useLibrary } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { SongOptionsModalProps } from "@/interfaces/Song";
import AddToPlaylistModal from "@/components/AddToPlaylistModal";
import { styles } from "./styles.web";

export default function SongOptionsModal({ visible, onClose, song }: SongOptionsModalProps) {
  const { toggleFavoriteArtist, isFavoriteArtist } = useLibrary();
  const { t } = useLanguage();
  const [addToPlaylistVisible, setAddToPlaylistVisible] = useState(false);

  const openAddToPlaylist = () => {
    onClose();
    setTimeout(() => setAddToPlaylistVisible(true), 220);
  };

  const artistFavoriteStatus = song?.channel?.id ? isFavoriteArtist(song.channel.id) : false;

  return (
    <>
      <ModalShell visible={visible} onClose={onClose} width={420}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{song?.title || t('songOptions.untitled')}</Text>
        </View>
        <View style={styles.optionsList}>
          <TouchableOpacity style={styles.option} onPress={openAddToPlaylist}>
            <IconSymbol name="list.bullet" size={24} color="#fff" />
            <Text style={styles.optionText}>{t('songOptions.addToPlaylist')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={() => {
            if (song?.channel?.id) toggleFavoriteArtist({ id: song.channel.id, name: song.channel.name, avatar: song.channel?.avatar ?? (song.channel?.icon ?? "") });
            onClose();
          }}>
            <IconSymbol name={artistFavoriteStatus ? "person" : "person-add-outline"} size={24} color={artistFavoriteStatus ? "#2c5af3" : "#fff"} />
            <Text style={styles.optionText}>{artistFavoriteStatus ? t('songOptions.removeArtistFromFavorites') : t('songOptions.addArtistToFavorites')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={() => {
            if (song?.url) Linking.openURL(song.url).catch(console.error);
            onClose();
          }}>
            <IconSymbol name="videocam-outline" size={24} color="#fff" />
            <Text style={styles.optionText}>{t('songOptions.openOriginalVideo')}</Text>
          </TouchableOpacity>
        </View>
      </ModalShell>

      <AddToPlaylistModal
        visible={addToPlaylistVisible}
        onClose={() => setAddToPlaylistVisible(false)}
        song={song}
      />
    </>
  );
}
