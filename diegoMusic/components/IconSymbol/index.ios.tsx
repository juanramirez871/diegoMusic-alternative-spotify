import { SymbolView, SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

const TO_SF: Record<string, string> = {
  'pause-circle': 'pause.circle.fill',
  'play-circle': 'play.circle.fill',
  'pause': 'pause.fill',
  'play': 'play.fill',
  'trophy-outline': 'trophy',
  'close-circle': 'xmark.circle.fill',
  'heart': 'heart.fill',
  'heart-outline': 'heart',
  'checkmark-circle': 'checkmark.circle.fill',
  'bar-chart-outline': 'chart.bar',
  'chevron-back': 'chevron.left',
  'chevron-down': 'chevron.down',
  'cloud-offline-outline': 'wifi.slash',
  'ellipsis-horizontal': 'ellipsis',
  'expand-outline': 'arrow.up.left.and.arrow.down.right',
  'musical-notes': 'music.note.list',
  'musical-notes-outline': 'music.note.list',
  'pencil-outline': 'pencil',
  'play-skip-back': 'backward.fill',
  'play-skip-forward': 'forward.fill',
  'search': 'magnifyingglass',
  'share-outline': 'square.and.arrow.up',
  'time': 'clock',
  'time-outline': 'clock',
  'list': 'list.bullet',
  'close': 'xmark',
  'videocam-outline': 'video',
  'image-outline': 'photo',
  'image': 'photo',
  'radio-button-on': 'largecircle.fill.circle',
  'radio-button-off': 'circle',
  'timer': 'timer',
  'timer-outline': 'timer',
  'play-video': 'play.rectangle.fill',
  'person': 'person.fill',
  'person-add-outline': 'person.badge.plus',
  'reorder-two': 'line.3.horizontal',
  'wifi.slash': 'wifi.slash',
  'cellular': 'cellularbars',
  'cellular-outline': 'cellularbars',
  'translate': 'character.bubble',
  'auto-scroll': 'arrow.up.and.down.text.horizontal',
  'auto-scroll-off': 'text.alignleft',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: any;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const sfName = (TO_SF[name] ?? name) as any;
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={sfName}
      style={[{ width: size, height: size }, style]}
    />
  );
}
