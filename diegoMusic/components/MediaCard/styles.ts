import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

const isWeb = Platform.OS === 'web';

/** Inner padding of a card; rows offset it so covers align with section titles. */
export const CARD_PADDING = isWeb ? 12 : 0;
export const IMAGE_SIZE = isWeb ? 176 : 140;

export const styles = StyleSheet.create({
  card: {
    width: IMAGE_SIZE + CARD_PADDING * 2,
    padding: CARD_PADDING,
    borderRadius: 8,
    ...webTransition('background-color 200ms ease'),
  },
  cardHovered: {
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: isWeb ? 1 : 0.7,
    backgroundColor: isWeb ? colors.surfaceHover : 'transparent',
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 6,
    backgroundColor: colors.placeholder,
  },
  imageCircle: {
    borderRadius: IMAGE_SIZE / 2,
  },
  playFab: {
    position: 'absolute',
    right: 8,
    bottom: 8,
  },
  title: {
    marginTop: isWeb ? 10 : 8,
    color: colors.text,
    fontSize: isWeb ? 16 : 13,
    fontWeight: isWeb ? '400' : '600',
    lineHeight: isWeb ? 22 : 18,
  },
  subtitle: {
    marginTop: 2,
    color: colors.textSubdued,
    fontSize: isWeb ? 14 : 12,
  },
  skeletonTitle: {
    marginTop: 12,
  },
  skeletonSubtitle: {
    marginTop: 6,
  },
});
