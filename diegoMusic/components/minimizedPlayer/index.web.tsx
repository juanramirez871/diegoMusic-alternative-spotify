import { View, Image, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { usePlayer } from '@/context/PlayerContext';
import { useThumbnail } from '@/hooks/useThumbnail';
import QueueModal from '@/components/QueueModal';
import { useState, useEffect } from 'react';
import { styles, sliderStyle } from './styles.web';

const MARQUEE_KF_ID = 'minplayer-marquee-kf';
function ensureMarqueeKeyframe() {
  if (typeof document === 'undefined' || document.getElementById(MARQUEE_KF_ID)) return;
  const s = document.createElement('style');
  s.id = MARQUEE_KF_ID;
  s.textContent = '@keyframes _mpq { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }';
  document.head.appendChild(s);
}

function MarqueeTitle({ text, style }: { text: string; style: object }) {
  const [containerW, setContainerW] = useState(0);
  const [textW, setTextW] = useState(0);
  const shouldScroll = containerW > 0 && textW > containerW;
  const duration = Math.max(8, text.length * 0.2);
  const gap = '          ';

  useEffect(() => { ensureMarqueeKeyframe(); }, []);

  return (
    <View
      style={{ overflow: 'hidden', flex: 1 } as any}
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
    >
      <Text
        style={[style, { position: 'absolute', opacity: 0, whiteSpace: 'nowrap', pointerEvents: 'none' } as any]}
        onLayout={(e) => setTextW(e.nativeEvent.layout.width)}
      >
        {text}
      </Text>

      {shouldScroll ? (
        <View style={{
          flexDirection: 'row',
          width: 'max-content',
          animation: `_mpq ${duration}s linear infinite`,
        } as any}>
          <Text style={[style, { whiteSpace: 'nowrap' } as any]}>{text}{gap}</Text>
          <Text style={[style, { whiteSpace: 'nowrap' } as any]}>{text}{gap}</Text>
        </View>
      ) : (
        <Text style={style} numberOfLines={1}>{text}</Text>
      )}
    </View>
  );
}

export const MinimizedPlayer = ({ onPress, style }: { onPress: () => void; style?: object }) => {
  const {
    currentSong,
    isPlaying,
    isIntendingToPlay,
    isLoading,
    togglePlayPause,
    playNext,
    playPrevious,
    progress,
    duration,
    isShuffle,
    toggleShuffle,
    repeatMode,
    toggleRepeat,
    isFavorite,
    toggleFavorite,
    volume,
    setVolume,
    seekTo,
  } = usePlayer();

  const [showQueue, setShowQueue] = useState(false);
  const thumbnailSource = useThumbnail(currentSong?.id, currentSong?.thumbnail?.url);

  if (!currentSong) return null;

  const progressPct = duration > 0 ? Math.min(Math.max((progress / duration) * 100, 0), 100) : 0;
  const isBuffering = isLoading;
  const isFav = isFavorite(currentSong.id);
  const isRepeating = repeatMode !== 'off';

  const fmt = (ms: number) => {
    const secs = Math.floor(ms / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.bar, style as any]}>
      <TouchableOpacity style={styles.left} onPress={onPress} activeOpacity={0.8}>
        <Image source={thumbnailSource} style={styles.cover} resizeMode="cover" />
        <View style={styles.info}>
          <MarqueeTitle text={currentSong.title} style={styles.title} />
          <Text style={styles.artist} numberOfLines={1}>{currentSong.channel.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={(e) => { e.stopPropagation(); toggleFavorite(currentSong); }}
        >
          <IconSymbol
            name={isFav ? 'heart.fill' : 'heart'}
            size={18}
            color={isFav ? '#2c5af3' : '#b3b3b3'}
          />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={{ width: '100%', maxWidth: 480, alignItems: 'center', gap: 6 }}>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleShuffle}>
            <IconSymbol name="shuffle" size={18} color={isShuffle ? '#2c5af3' : '#b3b3b3'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={playPrevious}>
            <IconSymbol name="play-skip-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => { if (!isLoading) togglePlayPause(); }}
          >
            <IconSymbol
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={isBuffering ? 'rgba(0,0,0,0.5)' : '#000'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={playNext}>
            <IconSymbol name="play-skip-forward" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleRepeat}>
            <IconSymbol name="repeat" size={18} color={isRepeating ? '#2c5af3' : '#b3b3b3'} />
          </TouchableOpacity>
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.time}>{fmt(progress)}</Text>
          <TouchableOpacity
            style={styles.trackBg}
            activeOpacity={1}
            onPress={(e: any) => {
              const rect = (e.currentTarget as any).getBoundingClientRect?.();
              if (rect && rect.width > 0 && duration > 0) {
                seekTo(((e.nativeEvent.clientX - rect.left) / rect.width) * duration);
              }
            }}
          >
            <View style={[styles.trackFill, { width: `${progressPct}%` as any }]} />
          </TouchableOpacity>
          <Text style={styles.time}>{fmt(duration)}</Text>
        </View>
        </View>
      </View>

      <View style={styles.right}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowQueue(true)}>
          <IconSymbol name="list" size={18} color="#b3b3b3" />
        </TouchableOpacity>
        <View style={styles.volumeRow}>
          <IconSymbol
            name={volume === 0 ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            size={16}
            color="#b3b3b3"
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </View>
      </View>

      <QueueModal visible={showQueue} onClose={() => setShowQueue(false)} />
    </View>
  );
};
