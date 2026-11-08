import { Platform, StyleSheet } from 'react-native';
import { CARD_PADDING } from '@/components/MediaCard/styles';
import { colors, layout } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export const styles = StyleSheet.create({
  // Web: pull the row out by the card padding so covers line up with the title.
  // Native: bleed to the screen edges so cards scroll edge to edge.
  row: {
    marginHorizontal: isWeb ? -CARD_PADDING : -layout.pagePadding,
  },
  rowContent: {
    gap: isWeb ? 0 : 12,
    paddingHorizontal: isWeb ? 0 : layout.pagePadding,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: isWeb ? 8 : 20,
    columnGap: isWeb ? 0 : 12,
    marginHorizontal: isWeb ? -CARD_PADDING : 0,
  },
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSubdued,
    fontSize: 14,
    textAlign: 'center',
  },
});
