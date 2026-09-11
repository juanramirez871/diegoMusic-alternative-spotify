import { Platform, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SmartImage } from "@/components/SmartImage";
import { useEffect, useState } from "react";
import { youtubeService } from "@/services/youtubeService";
import { usePlayback } from "@/context/PlayerContext";
import { useNetwork } from "@/context/NetworkContext";
import { Skeleton } from "@/components/Skeleton";
import { CarouselPlayerProps } from "@/interfaces/player";
import { SongData } from "@/interfaces/Song";
import { styles } from './styles';

const isWeb = Platform.OS === 'web';
const THUMB_SIZE = isWeb ? 200 : 140;


export default function ListPlayer({ channelId, query, data }: CarouselPlayerProps) {

  const [songs, setSongs] = useState<SongData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const { playSong } = usePlayback();
  const { isApiReachable } = useNetwork();

  useEffect(() => {
    if (data) {
      setSongs(data);
      setLoading(false);
      return;
    }

    if (!isApiReachable) {
      setLoading(true);
      setApiError(true);
      return;
    }

    const fetchSongs = async () => {
      setLoading(true);
      setApiError(false);
      try {
        let fetchedData: SongData[] = [];
        if (channelId)
        {
          fetchedData = await youtubeService.getChannelVideos(channelId);
          if (fetchedData.length === 0 && query) fetchedData = await youtubeService.searchVideos(query, 10);
        }
        else if (query) fetchedData = await youtubeService.searchVideos(query, 10);
        setSongs(fetchedData);
      }
      catch (error) {
        console.error("Error fetching carousel songs:", error);
        setApiError(true);
      }
      finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [channelId, query, data, isApiReachable]);

  if (loading || apiError) {
    return (
      <View style={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {Array.from({ length: isWeb ? 10 : 5 }, (_, i) => i).map((i) => (
            <View key={i} style={styles.songItem}>
              <Skeleton width={THUMB_SIZE} height={THUMB_SIZE} borderRadius={isWeb ? 12 : 8} />
              <View style={styles.infoContainer}>
                <Skeleton width={isWeb ? 140 : 100} height={isWeb ? 16 : 14} borderRadius={4} style={{ marginBottom: 4 }} />
                <Skeleton width={isWeb ? 100 : 80} height={12} borderRadius={4} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {songs.map((item, index) => {
          return (
            <TouchableOpacity
              key={item.id + index}
              style={styles.songItem}
              onPress={() => playSong(item, songs)}
              activeOpacity={0.8}
            >
              <SmartImage
                uri={item.thumbnail?.url}
                style={styles.image}
              />
              <View style={styles.infoContainer}>
                <Text style={styles.titleSong} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.subtitleSong} numberOfLines={1}>
                  {item.channel.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
