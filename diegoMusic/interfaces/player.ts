import { ViewStyle } from "react-native";
import { SongData } from "./Song";
import type { ShelfProps } from "./ui";
import { VideoPlayer } from 'expo-video';


export interface CarouselProps {
  currentSong: any;
  prevSong: any;
  nextSong: any;
  showVideo: boolean;
  videoRef: any;
  isVideoReady: boolean;
  isVideoLoading: boolean;
  isVideoPlaying: boolean;
  setIsVideoLoading: (val: boolean) => void;
  setIsVideoReady: (val: boolean) => void;
  setIsVideoPlaying: (val: boolean) => void;
  setVideoProgress: (val: number) => void;
  setVideoDuration: (val: number) => void;
  videoDidFinishHandledRef: any;
  pendingVideoSeekRef: any;
  videoAutoPlay: boolean;
  setVideoAutoPlay: (val: boolean) => void;
  audioStateBeforeVideoRef: any;
  setShowVideo: (val: boolean) => void;
  handleToggleVideo: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (pos: number) => void;
  togglePlayPause: () => void;
}

export interface MinimizedPlayerProps {
  onPress: () => void;
  style?: ViewStyle;
}

export interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
}

export interface SongShelfProps extends Omit<ShelfProps, 'children' | 'expandable'> {
  songs: SongData[];
  /** Shows skeleton cards while the songs are being fetched. */
  loading?: boolean;
}

export interface MaximazedPlayerProps {
  visible: boolean;
  onClose: () => void;
}

export type AudioStateBeforeVideo = {
  wasPlaying: boolean;
  position: number;
};

export type CarouselSongs = {
  current: SongData;
  prev: SongData | null;
  next: SongData | null;
};

export type CarouselVideo = {
  show: boolean;
  player: VideoPlayer;
  isReady: boolean;
  isLoading: boolean;
  toggle: () => Promise<void>;
};

export type CarouselAudio = {
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (pos: number) => void;
  togglePlayPause: () => void;
};

export type PlayerCarouselProps = {
  songs: CarouselSongs;
  video: CarouselVideo;
  audio: CarouselAudio;
  onEnterFullscreen: () => void;
  onExitFullscreen: () => void;
};

export type UseVideoPlaybackArgs = {
  currentSong: SongData | null;
  isOnline: boolean;
  videoOfflineTitle: string;
  videoOfflineMessage: string;
  videoQuality: 'low' | 'medium' | 'high';
  audio: {
    isPlaying: boolean;
    progress: number;
    pause: () => Promise<void>;
    seekTo: (pos: number) => void;
    togglePlayPause: () => void;
    playNext: () => void;
  };
};
