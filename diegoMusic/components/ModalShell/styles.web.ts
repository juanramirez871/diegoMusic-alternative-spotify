import { StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { webStyle, webTransition } from '@/utils/webStyles';

export const TRANSITION_MS = 220;

export const styles = StyleSheet.create({
  root: {
    position: 'fixed' as ViewStyle['position'],
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2000,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    opacity: 0,
    ...webStyle({ backdropFilter: 'blur(4px)', cursor: 'default' }),
    ...webTransition(`opacity ${TRANSITION_MS}ms ease`),
  },
  backdropShown: {
    opacity: 1,
  },
  panel: {
    maxWidth: '100%',
    maxHeight: '85%',
    padding: 24,
    borderRadius: 12,
    backgroundColor: colors.popover,
    overflow: 'hidden',
    opacity: 0,
    transform: [{ translateY: 12 }, { scale: 0.96 }],
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    ...webTransition(
      `opacity ${TRANSITION_MS}ms ease, transform ${TRANSITION_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
    ),
  },
  panelShown: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
  },
});
