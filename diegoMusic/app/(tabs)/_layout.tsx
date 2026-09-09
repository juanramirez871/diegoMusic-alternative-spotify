import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, Animated, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { GenreOverlay } from '@/components/GenreOverlay';
import { usePlayerUI } from '@/context/PlayerContext';
import { useLanguage } from '@/context/LanguageContext';

export default function TabLayout() {

  const { pendingArtistOverlay, closeArtistOverlay } = usePlayerUI();
  const { t } = useLanguage();
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
    }
    else {
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
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#888888',
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 10 : 4,
          elevation: 0,
          height: Platform.OS === 'ios' ? 78 : 55,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="playlists"
        options={{
          title: t('tabs.playlists'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="music.note.list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorite"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.search'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
      <GenreOverlay
        isVisible={!!pendingArtistOverlay}
        onClose={handleCloseArtist}
        genreTitle={pendingArtistOverlay?.name ?? ''}
        channelId={pendingArtistOverlay?.id}
        fadeAnim={artistFadeAnim}
        bottomOffset={Platform.OS === 'ios' ? 78 : 55}
      />
    </View>
  );
}
