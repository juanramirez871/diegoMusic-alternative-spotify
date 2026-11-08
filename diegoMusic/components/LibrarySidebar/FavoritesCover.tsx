import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/constants/theme';
import { COVER_SIZE, styles } from './styles';

const GRADIENT = ['#1d3fd8', '#7aa2ff'] as const;

/** Cover of the default favorites playlist, in the style of Spotify's "Liked Songs". */
export function FavoritesCover() {
  return (
    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.favoritesCover}>
      <IconSymbol name="heart.fill" size={COVER_SIZE * 0.4} color={colors.text} />
    </LinearGradient>
  );
}
