import { Children, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SectionHeader } from '@/components/SectionHeader';
import { useLanguage } from '@/context/LanguageContext';
import type { ShelfProps } from '@/interfaces/ui';
import { styles } from './styles';

/**
 * A titled section with a horizontally scrolling row of cards.
 * "Show all" appears only when the row overflows and expands it into a wrapped grid.
 */
export function Shelf({ children, emptyText, expandable = true, ...header }: ShelfProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const isEmpty = Children.count(children) === 0;
  if (isEmpty && !emptyText) return null;

  const overflows = contentWidth > viewportWidth + 1;
  const canToggle = expandable && !isEmpty && (expanded || overflows);

  return (
    <View>
      <SectionHeader
        {...header}
        actionLabel={canToggle ? t(expanded ? 'home.showLess' : 'home.showAll') : undefined}
        onAction={() => setExpanded((value) => !value)}
      />

      {isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : expanded ? (
        <View style={styles.grid}>{children}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.row}
          contentContainerStyle={styles.rowContent}
          onLayout={(event) => setViewportWidth(event.nativeEvent.layout.width)}
          onContentSizeChange={(width) => setContentWidth(width)}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}
