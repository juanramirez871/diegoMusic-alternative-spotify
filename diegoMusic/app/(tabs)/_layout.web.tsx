import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { GenreOverlay } from '@/components/GenreOverlay';
import { LibrarySidebar } from '@/components/LibrarySidebar';
import { MinimizedPlayer } from '@/components/minimizedPlayer';
import { MaximazedPlayer } from '@/components/maximazedPlayer';
import { TopBar } from '@/components/TopBar';
import { usePlayerUI } from '@/context/PlayerContext';
import { styles } from '@/styles/TabLayoutWeb.styles';

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
        <LibrarySidebar />
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

