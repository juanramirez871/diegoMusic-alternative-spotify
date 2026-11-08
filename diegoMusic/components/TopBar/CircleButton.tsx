import { type ReactNode, useState } from 'react';
import { Pressable } from 'react-native';
import { styles } from './styles.web';

interface Props {
  onPress: () => void;
  accessibilityLabel: string;
  /** Receives the hover state so the content can highlight itself. */
  children: (hovered: boolean) => ReactNode;
}

/** 48px round button of the top bar (home, avatar). */
export function CircleButton({ onPress, accessibilityLabel, children }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.circleButton, hovered && styles.circleButtonHovered]}
    >
      {children(hovered)}
    </Pressable>
  );
}
