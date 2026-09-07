import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const SF_TO_MATERIAL: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  'house.fill': 'home',
  'heart.fill': 'favorite',
  'magnifyingglass': 'search',
  'gearshape.fill': 'settings',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'xmark': 'close',
  'xmark.circle.fill': 'cancel',
  'play.fill': 'play-arrow',
  'pause.fill': 'pause',
  'backward.fill': 'skip-previous',
  'forward.fill': 'skip-next',
  'shuffle': 'shuffle',
  'repeat': 'repeat',
  'repeat.1': 'repeat-one',
  'ellipsis': 'more-horiz',
  'ellipsis.circle': 'more-horiz',
  'star.fill': 'star',
  'music.note': 'music-note',
  'music.note.list': 'queue-music',
  'speaker.wave.2.fill': 'volume-up',
  'speaker.slash.fill': 'volume-off',
  'arrow.down.circle.fill': 'download',
  'arrow.clockwise': 'refresh',
  'wifi.slash': 'wifi-off',
  'wifi': 'wifi',
  'info.circle': 'info',
  'list.bullet': 'list',
  'plus': 'add',
  'minus': 'remove',
  'trash': 'delete',
  'square.and.arrow.up': 'share',

  'pause-circle': 'pause-circle-filled',
  'play-circle': 'play-circle',
  'pause': 'pause',
  'play': 'play-arrow',
  'trophy-outline': 'emoji-events',
  'close-circle': 'cancel',
  'heart': 'favorite',
  'heart-outline': 'favorite-border',
  'checkmark-circle': 'check-circle',
  'bar-chart-outline': 'bar-chart',
  'chevron-back': 'chevron-left',
  'chevron-down': 'expand-more',
  'cloud-offline-outline': 'wifi-off',
  'ellipsis-horizontal': 'more-horiz',
  'expand-outline': 'fullscreen',
  'musical-notes': 'music-note',
  'musical-notes-outline': 'music-note',
  'pencil-outline': 'edit',
  'play-skip-back': 'skip-previous',
  'play-skip-forward': 'skip-next',
  'search': 'search',
  'share-outline': 'share',
  'time': 'access-time',
  'time-outline': 'access-time',
  'list': 'list',
  'close': 'close',
  'videocam-outline': 'videocam',
  'person': 'person',
  'person-add-outline': 'person-add',
  'cellular': 'signal-cellular-alt',
  'cellular-outline': 'signal-cellular-alt',
  'reorder-two': 'reorder',
  'radio-button-on': 'radio-button-checked',
  'radio-button-off': 'radio-button-unchecked',
  'timer': 'timer',
  'timer-outline': 'timer',
  'translate': 'translate',
  'play-video': 'smart-display',
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
  const materialName = SF_TO_MATERIAL[name] ?? 'help-outline';
  return (
    <MaterialIcons
      name={materialName}
      size={size}
      color={color as string}
      style={style as any}
    />
  );
}
