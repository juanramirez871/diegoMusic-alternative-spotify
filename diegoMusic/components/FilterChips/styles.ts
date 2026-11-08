import { StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import { webTransition } from '@/utils/webStyles';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...webTransition('background-color 150ms ease'),
  },
  chipHovered: {
    backgroundColor: colors.surfaceHover,
  },
  chipSelected: {
    backgroundColor: colors.chipSelected,
  },
  label: {
    color: colors.text,
    fontSize: 14,
  },
  labelSelected: {
    color: colors.onChipSelected,
    fontWeight: '600',
  },
});
