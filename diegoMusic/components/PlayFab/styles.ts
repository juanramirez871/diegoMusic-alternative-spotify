import { StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

export const styles = StyleSheet.create({
  fab: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 },
    ...webTransition('opacity 200ms ease, transform 200ms ease'),
  },
  hidden: {
    opacity: 0,
    transform: [{ translateY: 8 }],
  },
  visible: {
    opacity: 1,
    transform: [{ translateY: 0 }],
  },
});
