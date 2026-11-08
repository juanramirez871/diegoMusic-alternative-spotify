import { type ReactNode, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { styles } from './styles';

interface Props {
  title: string;
  subtitle?: string;
  active?: boolean;
  onPress: () => void;
  onHoverStart: (target: View | null, title: string, subtitle?: string) => void;
  onHoverEnd: () => void;
  children: ReactNode;
}

/** Square hit area of the collapsed sidebar that highlights on hover and when active. */
export function SidebarItem({ title, subtitle, active = false, onPress, onHoverStart, onHoverEnd, children }: Props) {
  const ref = useRef<View>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onHoverIn={() => {
        setHovered(true);
        onHoverStart(ref.current, title, subtitle);
      }}
      onHoverOut={() => {
        setHovered(false);
        onHoverEnd();
      }}
      accessibilityRole="link"
      accessibilityLabel={title}
      style={[styles.item, hovered && styles.itemHovered, active && styles.itemActive]}
    >
      {children}
    </Pressable>
  );
}
