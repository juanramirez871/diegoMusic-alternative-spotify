import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';
import * as Icons from 'lucide-react';

type IconEntry = { icon: Icons.LucideIcon; filled?: boolean };

const ICONS: Record<string, IconEntry> = {
  'house.fill': { icon: Icons.Home, filled: true },
  'heart.fill': { icon: Icons.Heart, filled: true },
  'heart': { icon: Icons.Heart },
  'heart-outline': { icon: Icons.Heart },
  'magnifyingglass': { icon: Icons.Search },
  'search': { icon: Icons.Search },
  'gearshape.fill': { icon: Icons.Cog },
  'chevron.left': { icon: Icons.ChevronLeft },
  'chevron.right': { icon: Icons.ChevronRight },
  'chevron.up': { icon: Icons.ChevronUp },
  'chevron.down': { icon: Icons.ChevronDown },
  'chevron-back': { icon: Icons.ChevronLeft },
  'chevron-down': { icon: Icons.ChevronDown },
  'xmark': { icon: Icons.X },
  'xmark.circle.fill': { icon: Icons.XCircle, filled: true },
  'close': { icon: Icons.X },
  'close-circle': { icon: Icons.XCircle, filled: true },
  'play.fill': { icon: Icons.Play, filled: true },
  'play': { icon: Icons.Play, filled: true },
  'play-circle': { icon: Icons.PlayCircle },
  'pause.fill': { icon: Icons.Pause, filled: true },
  'pause': { icon: Icons.Pause, filled: true },
  'pause-circle': { icon: Icons.PauseCircle },
  'backward.fill': { icon: Icons.SkipBack, filled: true },
  'play-skip-back': { icon: Icons.SkipBack },
  'forward.fill': { icon: Icons.SkipForward, filled: true },
  'play-skip-forward': { icon: Icons.SkipForward },
  'shuffle': { icon: Icons.Shuffle },
  'repeat': { icon: Icons.Repeat },
  'repeat.1': { icon: Icons.Repeat1 },
  'ellipsis': { icon: Icons.MoreHorizontal },
  'ellipsis-horizontal': { icon: Icons.MoreHorizontal },
  'star.fill': { icon: Icons.Star, filled: true },
  'music.note': { icon: Icons.Music },
  'music.note.list': { icon: Icons.ListMusic },
  'musical-notes': { icon: Icons.Music2 },
  'musical-notes-outline': { icon: Icons.Music2 },
  'speaker.wave.2.fill': { icon: Icons.Volume2 },
  'speaker.slash.fill': { icon: Icons.VolumeX },
  'arrow.down.circle.fill': { icon: Icons.ArrowDownCircle },
  'arrow.down.circle': { icon: Icons.ArrowDownCircle },
  'image-outline': { icon: Icons.Image },
  'arrow.clockwise': { icon: Icons.RotateCw },
  'wifi': { icon: Icons.Wifi },
  'wifi.slash': { icon: Icons.WifiOff },
  'info.circle': { icon: Icons.Info },
  'list.bullet': { icon: Icons.List },
  'list': { icon: Icons.List },
  'trash': { icon: Icons.Trash2 },
  'square.and.arrow.up': { icon: Icons.Share2 },
  'share-outline': { icon: Icons.Share2 },
  'plus': { icon: Icons.Plus },
  'minus': { icon: Icons.Minus },
  'trophy-outline': { icon: Icons.Trophy },
  'checkmark-circle': { icon: Icons.CheckCircle },
  'bar-chart-outline': { icon: Icons.BarChart2 },
  'cloud-offline-outline': { icon: Icons.CloudOff },
  'expand-outline': { icon: Icons.Maximize2 },
  'pencil-outline': { icon: Icons.Pencil },
  'time': { icon: Icons.Clock },
  'time-outline': { icon: Icons.Clock },
  'videocam-outline': { icon: Icons.Video },
  'timer': { icon: Icons.Timer },
  'timer-outline': { icon: Icons.Timer },
  'person': { icon: Icons.User },
  'person-add-outline': { icon: Icons.UserPlus },
  'reorder-two': { icon: Icons.AlignJustify },
  'radio-button-on': { icon: Icons.CircleDot },
  'radio-button-off': { icon: Icons.Circle },
  'cellular': { icon: Icons.Signal },
  'cellular-outline': { icon: Icons.Signal },
  'play-video': { icon: Icons.MonitorPlay },
  'translate': { icon: Icons.Languages },
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const entry = ICONS[name];
  if (!entry) return null;

  const { icon: Icon, filled } = entry;
  const colorStr = color as string;

  return (
    <Icon
      size={size}
      color={colorStr}
      fill={filled ? colorStr : 'none'}
      strokeWidth={filled ? 0 : 2}
      style={style as any}
    />
  );
}
