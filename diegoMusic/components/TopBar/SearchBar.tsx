import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/constants/theme';
import { useLanguage } from '@/context/LanguageContext';
import { styles } from './styles.web';

interface Props {
  disabled: boolean;
  /** Whether the browse (search tab) page is the current route. */
  isBrowsing: boolean;
  onOpenSearch: () => void;
  onBrowse: () => void;
}

/** Pill-shaped search trigger with a browse shortcut, as in Spotify's top bar. */
export function SearchBar({ disabled, isBrowsing, onOpenSearch, onBrowse }: Props) {
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const [browseHovered, setBrowseHovered] = useState(false);
  const active = hovered && !disabled;

  return (
    <Pressable
      onPress={onOpenSearch}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      accessibilityRole="search"
      style={[styles.searchBox, active && styles.searchBoxHovered, disabled && styles.disabled]}
    >
      <IconSymbol name="magnifyingglass" size={22} color={active ? colors.text : colors.textSubdued} />
      <Text style={styles.searchPlaceholder} numberOfLines={1}>
        {disabled ? t('search.placeholderOffline') : t('search.placeholder')}
      </Text>

      <View style={styles.searchDivider} />

      <Pressable
        onPress={onBrowse}
        disabled={disabled}
        onHoverIn={() => setBrowseHovered(true)}
        onHoverOut={() => setBrowseHovered(false)}
        accessibilityRole="button"
        accessibilityLabel={t('topBar.browse')}
        style={styles.browseButton}
      >
        <IconSymbol
          name="archivebox"
          size={22}
          color={isBrowsing || browseHovered ? colors.text : colors.textSubdued}
        />
      </Pressable>
    </Pressable>
  );
}
