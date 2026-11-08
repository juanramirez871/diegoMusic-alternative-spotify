import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: isWeb ? 8 : 12,
  },
  titles: {
    flex: 1,
  },
  eyebrow: {
    color: colors.textSubdued,
    fontSize: isWeb ? 14 : 12,
    marginBottom: 2,
  },
  title: {
    color: colors.text,
    fontSize: isWeb ? 24 : 21,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  action: {
    color: colors.textSubdued,
    fontSize: isWeb ? 14 : 12,
    fontWeight: '700',
    paddingBottom: 3,
  },
  actionHovered: {
    color: colors.text,
    textDecorationLine: 'underline',
  },
});
