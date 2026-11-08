import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

const isWeb = Platform.OS === 'web';
const TILE_HEIGHT = isWeb ? 64 : 56;

export const styles = StyleSheet.create({
  grid: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    height: TILE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.tile,
    ...webTransition('background-color 200ms ease'),
  },
  tileActive: {
    backgroundColor: colors.tileHover,
  },
  tileEmpty: {
    opacity: 0.4,
  },
  image: {
    width: TILE_HEIGHT,
    height: TILE_HEIGHT,
    backgroundColor: colors.placeholder,
  },
  title: {
    flex: 1,
    paddingHorizontal: isWeb ? 12 : 8,
    color: colors.text,
    fontSize: isWeb ? 14 : 12,
    fontWeight: '700',
  },
  playFab: {
    marginRight: 8,
  },
});
