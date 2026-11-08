import { Image, Platform, Pressable, View } from 'react-native';
import { FilterChips } from '@/components/FilterChips';
import { IconSymbol } from '@/components/IconSymbol';
import { DEFAULT_USER_AVATAR } from '@/constants/images';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { HomeFilter, HomeHeaderProps } from '@/interfaces/home';
import type { FilterChipOption } from '@/interfaces/ui';
import { styles } from './styles';

const isWeb = Platform.OS === 'web';

export function HomeHeader({ filter, onFilterChange, onOpenStats, onOpenDrawer }: HomeHeaderProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const options: FilterChipOption<HomeFilter>[] = [
    { value: 'all', label: t('home.allTag') },
    { value: 'music', label: t('home.musicTag') },
    { value: 'artists', label: t('home.artistsTag') },
  ];

  return (
    <View style={styles.row}>
      {!isWeb && (
        <Pressable onPress={onOpenDrawer} style={styles.avatar} accessibilityRole="button">
          <Image
            source={user?.avatar ? { uri: user.avatar } : DEFAULT_USER_AVATAR}
            style={styles.avatarImage}
          />
        </Pressable>
      )}

      <FilterChips options={options} selected={filter} onSelect={onFilterChange} />

      <Pressable
        onPress={onOpenStats}
        style={({ pressed }) => [styles.statsButton, pressed && styles.statsButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel={t('stats.title')}
      >
        <IconSymbol name="trophy-outline" size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}
