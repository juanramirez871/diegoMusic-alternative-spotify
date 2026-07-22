import React from 'react';
import { TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
  size?: number;
  color?: string;
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  isListening,
  onPress,
  size = 22,
  color = '#b3b3b3',
  activeColor = '#2c5af3',
  style,
}) => (
  <TouchableOpacity onPress={onPress} hitSlop={10} style={style}>
    <IconSymbol name="mic" size={size} color={isListening ? activeColor : color} />
  </TouchableOpacity>
);
