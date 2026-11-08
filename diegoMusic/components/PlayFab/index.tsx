import { Platform, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/constants/theme';
import type { PlayFabProps } from '@/interfaces/ui';
import { styles } from './styles';

/** Round play button revealed on hover. Web only: touch devices have no hover. */
export function PlayFab({ visible, size = 48, style }: PlayFabProps) {
  if (Platform.OS !== 'web') return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.fab,
        { width: size, height: size, borderRadius: size / 2 },
        visible ? styles.visible : styles.hidden,
        style,
      ]}
    >
      <IconSymbol name="play.fill" size={size * 0.42} color={colors.onAccent} />
    </View>
  );
}
