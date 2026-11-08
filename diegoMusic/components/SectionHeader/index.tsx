import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { SectionHeaderProps } from '@/interfaces/ui';
import { styles } from './styles';

export function SectionHeader({ title, eyebrow, leading, actionLabel, onAction }: SectionHeaderProps) {
  const [actionHovered, setActionHovered] = useState(false);

  return (
    <View style={styles.row}>
      {leading}
      <View style={styles.titles}>
        {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          onHoverIn={() => setActionHovered(true)}
          onHoverOut={() => setActionHovered(false)}
          hitSlop={8}
          accessibilityRole="button"
        >
          <Text style={[styles.action, actionHovered && styles.actionHovered]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
