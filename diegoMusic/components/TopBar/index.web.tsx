import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { SearchOverlay } from '@/components/SearchOverlay';
import { DEFAULT_USER_AVATAR } from '@/constants/images';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useNetwork } from '@/context/NetworkContext';
import { usePlayerUI } from '@/context/PlayerContext';
import { CircleButton } from './CircleButton';
import { SearchBar } from './SearchBar';
import { UserMenu } from './UserMenu';
import { useSearchOverlay } from './useSearchOverlay';
import { styles } from './styles.web';

type Route = '/' | '/search' | '/settings';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isOnline, isNetworkChecked, isApiReachable } = useNetwork();
  const { isMaximized, setIsMaximized } = usePlayerUI();
  const search = useSearchOverlay();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isSearchDisabled = (isNetworkChecked && !isOnline) || !isApiReachable;
  const isHome = pathname === '/' || pathname === '/index';

  const { isOpen: isSearchOpen, close: closeSearch } = search;
  useEffect(() => {
    if (isMaximized && isSearchOpen) closeSearch();
  }, [isMaximized, isSearchOpen, closeSearch]);

  const navigate = (route: Route) => {
    if (search.isOpen) search.close();
    setIsMaximized(false);
    router.push(route);
  };

  const openSearch = () => {
    if (isSearchDisabled) return;
    setIsMaximized(false);
    search.open();
  };

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.side}>
          <Pressable onPress={() => navigate('/')} accessibilityRole="link" accessibilityLabel={t('tabs.home')}>
            <Image source={require('@/assets/images/favicon.png')} style={styles.logo} />
          </Pressable>
        </View>

        <View style={styles.center}>
          <CircleButton onPress={() => navigate('/')} accessibilityLabel={t('tabs.home')}>
            {(hovered) => (
              <IconSymbol
                name={isHome ? 'house.fill' : 'house'}
                size={24}
                color={isHome || hovered ? colors.text : colors.textSubdued}
              />
            )}
          </CircleButton>
          <SearchBar
            disabled={isSearchDisabled}
            isBrowsing={pathname.startsWith('/search')}
            onOpenSearch={openSearch}
            onBrowse={() => navigate('/search')}
          />
        </View>

        <View style={[styles.side, styles.sideEnd]}>
          <CircleButton onPress={() => setIsUserMenuOpen(true)} accessibilityLabel={user?.name ?? ''}>
            {() => (
              <Image source={user?.avatar ? { uri: user.avatar } : DEFAULT_USER_AVATAR} style={styles.avatar} />
            )}
          </CircleButton>
        </View>
      </View>

      <UserMenu
        visible={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        onOpenSettings={() => navigate('/settings')}
      />

      <SearchOverlay
        isVisible={search.isOpen}
        onClose={search.close}
        fadeAnim={search.fadeAnim}
        searchQuery={search.query}
        setSearchQuery={search.setQuery}
        recentSearches={search.recentSearches}
        setRecentSearches={search.updateRecentSearches}
      />
    </>
  );
}
