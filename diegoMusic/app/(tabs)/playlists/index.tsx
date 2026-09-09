import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCard } from '@/components/PlaylistCard';
import { PlaylistBigCard } from '@/components/PlaylistBigCard';
import { PlaylistWebCard } from '@/components/PlaylistWebCard';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import type { PlaylistMeta } from "@/interfaces/Playlist";
import { styles } from "@/styles/PlaylistsScreen.styles";

const WEB_MAX_WIDTH = 1280;
const WEB_H_PADDING = 32;
const WEB_GRID_GAP = 8;
const WEB_MIN_TILE = 200;

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const { playlists, playlistsHydrated, reorderPlaylists } = usePlayer();
  const [createVisible, setCreateVisible] = useState(false);
  const [editing, setEditing] = useState(false);

  const isWeb = Platform.OS === 'web';

  const openPlaylist = (id: string) => {
    router.push(`/playlists/${id}` as any);
  };

  const sorted = useMemo(
    () => [...playlists].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return b.position - a.position;
    }),
    [playlists],
  );

  const defaultPlaylist = sorted.find((p) => p.isDefault) ?? null;
  const rest = useMemo(() => sorted.filter((p) => !p.isDefault), [sorted]);
  const useBigCards = !isWeb && sorted.length > 0 && sorted.length <= 3;
  const canReorder = rest.length >= 2;
  const grid = useMemo(() => {
    const contentWidth = Math.min(width, WEB_MAX_WIDTH) - WEB_H_PADDING * 2;
    const columns = Math.max(
      1,
      Math.floor((contentWidth + WEB_GRID_GAP) / (WEB_MIN_TILE + WEB_GRID_GAP)),
    );
    const tileWidth = Math.floor(
      (contentWidth - WEB_GRID_GAP * (columns - 1)) / columns,
    );

    return { contentWidth, columns, tileWidth };
  }, [width]);

  const handleDragEnd = useCallback(
    ({ data }: { data: PlaylistMeta[] }) => {
      const ordered = [
        ...(defaultPlaylist ? [defaultPlaylist.id] : []),
        ...[...data].reverse().map((p) => p.id),
      ];
      reorderPlaylists(ordered);
    },
    [defaultPlaylist, reorderPlaylists],
  );

  const renderDragItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<PlaylistMeta>) => (
      <ScaleDecorator>
        <PlaylistCard
          playlist={item}
          onPress={() => (editing ? undefined : openPlaylist(item.id))}
          onLongPress={editing ? drag : undefined}
          dragging={isActive}
          showHandle={editing}
        />
      </ScaleDecorator>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editing],
  );

  const plusButton = (
    <TouchableOpacity onPress={() => setCreateVisible(true)} hitSlop={12}>
      <IconSymbol name="plus" size={28} color="#fff" />
    </TouchableOpacity>
  );

  if (isWeb) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent />
        <LinearGradient
          colors={["#2c5af3ff", "#121212"]}
          style={[styles.headerGradient, { height: insets.top + 260 }]}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.webInner, { maxWidth: WEB_MAX_WIDTH }]}>
            <View style={[styles.webHeader, { paddingTop: insets.top + 40 }]}>
              <View style={styles.webHeaderText}>
                <Text style={styles.webKicker}>{t('tabs.playlists')}</Text>
                <Text style={styles.webTitle}>{t('library.title')}</Text>
                <Text style={styles.webSubtitle}>
                  {t('playlist.songCount', { count: sorted.length })}
                </Text>
              </View>
              <View style={styles.webHeaderActions}>
                {canReorder && (
                  <TouchableOpacity
                    onPress={() => setEditing((e) => !e)}
                    hitSlop={12}
                    style={[styles.webReorderBtn, editing && styles.webReorderBtnActive]}
                  >
                    <IconSymbol
                      name={editing ? 'checkmark' : 'reorder-two'}
                      size={16}
                      color={editing ? '#121212' : '#fff'}
                    />
                    <Text style={[styles.webReorderText, editing && styles.webReorderTextActive]}>
                      {editing ? t('playlist.done') : t('playlist.reorder')}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setCreateVisible(true)}
                  style={styles.webCreateBtn}
                >
                  <IconSymbol name="plus" size={18} color="#fff" />
                  <Text style={styles.webCreateText}>{t('library.createPlaylist')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {!playlistsHydrated ? null : sorted.length === 0 ? (
              <View style={styles.empty}>
                <IconSymbol name="music.note.list" size={56} color="#333" />
                <Text style={styles.emptyText}>{t('library.emptyTitle')}</Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setCreateVisible(true)}
                >
                  <Text style={styles.emptyBtnText}>{t('library.createPlaylist')}</Text>
                </TouchableOpacity>
              </View>
            ) : editing ? (
              // Reorder mode falls back to the compact draggable list.
              <View style={styles.webReorderList}>
                {defaultPlaylist && (
                  <PlaylistCard
                    playlist={defaultPlaylist}
                    onPress={() => openPlaylist(defaultPlaylist.id)}
                  />
                )}
                <DraggableFlatList
                  data={rest}
                  keyExtractor={(p) => p.id}
                  renderItem={renderDragItem}
                  onDragEnd={handleDragEnd}
                  activationDistance={8}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : (
              <View style={[styles.webGrid, { gap: WEB_GRID_GAP }]}>
                {sorted.map((p) => (
                  <PlaylistWebCard
                    key={p.id}
                    playlist={p}
                    width={grid.tileWidth}
                    onPress={() => openPlaylist(p.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <CreatePlaylistModal
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={["#2c5af3ff", "#252424ff"]}
        style={[styles.headerGradient, { height: insets.top + 120 }]}
      />

      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t('library.title')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {canReorder && !useBigCards && (
              <TouchableOpacity onPress={() => setEditing((e) => !e)} hitSlop={12}>
                <Text style={[styles.editBtn, editing && styles.editBtnActive]}>
                  {editing ? t('playlist.done') : t('playlist.reorder')}
                </Text>
              </TouchableOpacity>
            )}
            {plusButton}
          </View>
        </View>

        {!playlistsHydrated ? null : sorted.length === 0 ? (
          <View style={styles.empty}>
            <IconSymbol name="music.note.list" size={56} color="#333" />
            <Text style={styles.emptyText}>{t('library.emptyTitle')}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setCreateVisible(true)}>
              <Text style={styles.emptyBtnText}>{t('library.createPlaylist')}</Text>
            </TouchableOpacity>
          </View>
        ) : useBigCards ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.bigList}>
              {sorted.map((p) => (
                <PlaylistBigCard key={p.id} playlist={p} onPress={() => openPlaylist(p.id)} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.list}>
            {defaultPlaylist && (
              <PlaylistCard
                playlist={defaultPlaylist}
                onPress={() => openPlaylist(defaultPlaylist.id)}
              />
            )}
            <DraggableFlatList
              data={rest}
              keyExtractor={(p) => p.id}
              renderItem={renderDragItem}
              onDragEnd={handleDragEnd}
              // Drag only starts from the long-press we wire in reorder mode.
              activationDistance={20}
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      <CreatePlaylistModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
      />
    </View>
  );
}
