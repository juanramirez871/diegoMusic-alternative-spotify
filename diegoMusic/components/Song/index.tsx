import { View, Image, Text, TouchableOpacity } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { useState } from "react";
import SongOptionsModal from "@/components/SongOptionsModal";
import { usePlayback } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { useThumbnail } from "@/hooks/useThumbnail";
import { useIsDownloaded } from "@/hooks/useIsDownloaded";
import { SongProps } from "@/interfaces/Song";
import { styles } from './styles';


export default function Song({ data, onPress }: SongProps) {

  const { currentSong } = usePlayback();
  const { t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const thumbnailSource = useThumbnail(data?.id, data?.thumbnail?.url);
  const isDownloaded = useIsDownloaded(data?.id, data?.title);

  const isCurrentSong = currentSong?.id === data?.id;
  const title = data?.title || t('song.untitled');
  const artist = data?.channel?.name || t('song.unknownArtist');

  const handlePress = () => {
    if (onPress && data) {
      onPress(data);
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.songContainer} 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={thumbnailSource}
            style={[styles.image, isCurrentSong && { opacity: 0.6 }]}
            resizeMode="cover"
          />
          {/* {isCurrentSong && (
            <View style={styles.playingOverlay}>
              {isLoading ? (
                <LoadingSpinner size={20} color="#2c5af3" />
              ) : (
                <IconSymbol
                  name={isPlaying ? "pause" : "play"}
                  size={20}
                  color="#2c5af3"
                />
              )}
            </View>
          )} */}
        </View>
        <View style={styles.infoContainer}>
          <Text 
            style={[styles.title, isCurrentSong && { color: "#2c5af3" }]} 
            numberOfLines={1}
          >
            {title}
          </Text>
          <View style={styles.metadataContainer}>
            <View style={styles.videoBadge}>
              <IconSymbol
                name="play-video"
                size={16}
                color={isCurrentSong ? "#2c5af3" : "#b3b3b3"}
              />
            </View>
            {isDownloaded && (
              <IconSymbol
                name="arrow.down.circle.fill"
                size={14}
                color="#2c5af3"
                style={{ marginLeft: -4 }}
              />
            )}
            <Text
              style={[styles.artist, isCurrentSong && { color: "rgba(44, 90, 243, 0.7)" }]}
              numberOfLines={1}
            >
              {artist} {data?.duration_formatted ? `• ${data.duration_formatted}` : ""}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            setModalVisible(true);
          }}
        >
          <IconSymbol name="ellipsis-horizontal" size={20} color="#b3b3b3" />
        </TouchableOpacity>
      </TouchableOpacity>

      <SongOptionsModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        song={data}
      />
    </>
  );
}
