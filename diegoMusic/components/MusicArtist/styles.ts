import { Platform, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

const AVATAR_SIZE = Platform.OS === 'web' ? 48 : 40;

export const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.placeholder,
  },
});
