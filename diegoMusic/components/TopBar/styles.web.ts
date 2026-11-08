import { StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

export const TOP_BAR_HEIGHT = 64;

const CONTROL_SIZE = 48;
/** Home button + search bar, matching Spotify's centred search group. */
const CENTER_WIDTH = 546;

export const styles = StyleSheet.create({
  bar: {
    height: TOP_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.bar,
    zIndex: 100,
  },
  side: {
    flex: 1,
    minWidth: 64,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideEnd: {
    justifyContent: 'flex-end',
  },
  logo: {
    width: 40,
    height: 40,
    marginHorizontal: 12,
  },
  center: {
    flexBasis: CENTER_WIDTH,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleButton: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.control,
    ...webTransition('transform 150ms ease, background-color 150ms ease'),
  },
  circleButtonHovered: {
    backgroundColor: colors.controlHover,
    transform: [{ scale: 1.04 }],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  searchBox: {
    flex: 1,
    height: CONTROL_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: CONTROL_SIZE / 2,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.control,
    ...webTransition('background-color 150ms ease, border-color 150ms ease'),
  },
  searchBoxHovered: {
    backgroundColor: colors.controlHover,
    borderColor: colors.border,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    color: colors.textSubdued,
    fontSize: 16,
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.textSubdued,
    opacity: 0.6,
  },
  browseButton: {
    width: 44,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: TOP_BAR_HEIGHT,
    paddingRight: 8,
  },
  menu: {
    width: 260,
    padding: 4,
    borderRadius: 6,
    backgroundColor: colors.popover,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userText: {
    flex: 1,
  },
  userName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  userEmail: {
    marginTop: 2,
    color: colors.textSubdued,
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 4,
    backgroundColor: colors.border,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  itemHovered: {
    backgroundColor: colors.popoverHover,
  },
  itemText: {
    color: colors.text,
    fontSize: 14,
  },
});
