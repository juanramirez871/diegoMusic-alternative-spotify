import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { GenreOverlay } from '@/components/GenreOverlay';
import { MinimizedPlayer } from '@/components/minimizedPlayer';
import { MaximazedPlayer } from '@/components/maximazedPlayer';
import { TopBar } from '@/components/TopBar';
import { usePlayerUI } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/interfaces/language';
import { styles } from '@/styles/TabLayoutWeb.styles';

const SHOW_LABELS = false;

const NAV_ITEMS = [
  { route: '/',          name: 'house.fill',     labelKey: 'tabs.home'     },
  { route: '/search',    name: 'magnifyingglass', labelKey: 'tabs.search'   },
  { route: '/favorite',  name: 'heart.fill',      labelKey: 'tabs.favorite' },
  { route: '/settings',  name: 'gearshape.fill',  labelKey: 'tabs.settings' },
] as const;

function NavItem({ item, isActive, onNavigate }: { item: typeof NAV_ITEMS[number]; isActive: boolean; onNavigate: () => void }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [hovered, setHovered] = useState(false);
  const highlighted = isActive || hovered;

  return (
    <Pressable
      onPress={() => { onNavigate(); router.push(item.route as any); }}
      // @ts-ignore — web-only props
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={[styles.navItem, highlighted && styles.navItemHighlighted]}
    >
      <IconSymbol
        name={item.name}
        size={24}
        color={highlighted ? '#fff' : '#b3b3b3'}
      />
      {SHOW_LABELS ? (
        <Text style={[styles.navLabel, highlighted && styles.navLabelHighlighted]}>
          {t(item.labelKey as TranslationKey)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <View style={styles.navCard}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.route === '/'
            ? pathname === '/' || pathname === '/index'
            : pathname.startsWith(item.route);
          return <NavItem key={item.route} item={item} isActive={isActive} onNavigate={onNavigate} />;
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { pendingArtistOverlay, closeArtistOverlay, isMaximized, setIsMaximized } = usePlayerUI();
  const artistFadeAnim = useRef(new Animated.Value(0)).current;
  const prevArtistRef = useRef<string | null>(null);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname && pendingArtistOverlay) {
      prevPathnameRef.current = pathname;
      Animated.timing(artistFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        prevArtistRef.current = null;
        closeArtistOverlay();
      });
    } else {
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  if (pendingArtistOverlay && prevArtistRef.current !== pendingArtistOverlay.id) {
    prevArtistRef.current = pendingArtistOverlay.id;
    artistFadeAnim.setValue(0);
    Animated.timing(artistFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  const handleCloseArtist = () => {
    Animated.timing(artistFadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      prevArtistRef.current = null;
      closeArtistOverlay();
    });
  };

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.body}>
        <Sidebar onNavigate={() => setIsMaximized(false)} />
        <View style={styles.content}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          />
          <MaximazedPlayer visible={isMaximized} onClose={() => setIsMaximized(false)} />
        </View>
      </View>
      {!isMaximized && (
        <MinimizedPlayer
          onPress={() => setIsMaximized(true)}
          style={styles.minimizedPlayer}
        />
      )}
      <GenreOverlay
        isVisible={!!pendingArtistOverlay}
        onClose={handleCloseArtist}
        genreTitle={pendingArtistOverlay?.name ?? ''}
        channelId={pendingArtistOverlay?.id}
        fadeAnim={artistFadeAnim}
        bottomOffset={0}
      />
    </View>
  );
}

