import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Platform } from "react-native";
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
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import type { PlaylistMeta } from "@/interfaces/Playlist";
import { styles } from "@/styles/PlaylistsScreen.styles";

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLanguage();
  const { playlists, playlistsHydrated, reorderPlaylists } = usePlayer();
  const [createVisible, setCreateVisible] = useState(false);
  const [editing, setEditing] = useState(false);

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
  const useBigCards = sorted.length > 0 && sorted.length <= 3;
  const canReorder = rest.length >= 2;

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent />
      <LinearGradient
        colors={["#2c5af3ff", Platform.OS === 'web' ? '#121212' : '#252424ff']}
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
            <TouchableOpacity onPress={() => setCreateVisible(true)} hitSlop={12}>
              <IconSymbol name="plus" size={28} color="#fff" />
            </TouchableOpacity>
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
        ) : Platform.OS === 'web' ? (
          <ScrollView
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {sorted.map((p) => (
              <PlaylistCard key={p.id} playlist={p} onPress={() => openPlaylist(p.id)} />
            ))}
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
