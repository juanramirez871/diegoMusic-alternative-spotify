import { StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

export const SIDEBAR_WIDTH = 76;
export const COVER_SIZE = 48;
const ITEM_SIZE = 60;

export const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    // Matches the main content panel of the web layout.
    borderRadius: 12,
    backgroundColor: colors.background,
    // Lets the tooltip render above the main content panel.
    zIndex: 10,
  },
  list: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...webTransition('background-color 150ms ease'),
  },
  itemHovered: {
    backgroundColor: colors.control,
  },
  itemActive: {
    backgroundColor: colors.controlHover,
  },
  favoritesCover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistCover: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    borderRadius: COVER_SIZE / 2,
    backgroundColor: colors.placeholder,
  },
  divider: {
    width: 32,
    height: 1,
    marginVertical: 6,
    backgroundColor: colors.border,
  },
  tooltip: {
    position: 'absolute',
    left: SIDEBAR_WIDTH + 8,
    maxWidth: 280,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: colors.popover,
    transform: [{ translateY: '-50%' }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  tooltipTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipSubtitle: {
    marginTop: 2,
    color: colors.textSubdued,
    fontSize: 12,
  },
});
