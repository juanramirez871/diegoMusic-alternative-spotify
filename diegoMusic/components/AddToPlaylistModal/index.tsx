import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { showAlert } from "@/utils/alert";
import { IconSymbol } from '@/components/IconSymbol';
import { PlaylistCover } from '@/components/PlaylistCover';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import type { SongData } from "@/interfaces/Song";
import { styles } from './styles';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const OFFSCREEN_Y = Platform.OS === 'web' ? 24 : SCREEN_HEIGHT;

interface Props {
  visible: boolean;
  onClose: () => void;
  song?: SongData;
  songs?: SongData[];
  batchTitle?: string;
  preselectDefault?: boolean;
}

export default function AddToPlaylistModal({ visible, onClose, song, songs, batchTitle, preselectDefault }: Props) {
  const { t } = useLanguage();
  const {
    playlists,
    songPlaylistIds,
    getPlaylistSongs,
    addSongToPlaylists,
    addSongsToPlaylists,
    removeSongFromPlaylist,
    createPlaylist,
    defaultPlaylistId,
  } = usePlayer();

  const batch = Array.isArray(songs) && songs.length > 0;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(OFFSCREEN_Y);

  const open = () => {
    overlayOpacity.value = withTiming(1, { duration: 240 });
    contentTranslateY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.quad) });
  };
  const close = () => {
    overlayOpacity.value = withTiming(0, { duration: 180 });
    contentTranslateY.value = withTiming(OFFSCREEN_Y, { duration: 200 }, (fin) => {
      if (fin) runOnJS(onClose)();
    });
  };

  useEffect(() => {
    if (!visible || (!song && !batch)) {
      overlayOpacity.value = 0;
      contentTranslateY.value = OFFSCREEN_Y;
      return;
    }
    if (batch) {
      setInitial(new Set());
      setSelected(new Set());
    }
    else if (song)
    {
      Promise.all(playlists.map((p) => getPlaylistSongs(p.id))).then(() => {
        const ids = new Set(songPlaylistIds(song.id));
        setInitial(ids);
        const next = new Set(ids);
        if (preselectDefault && ids.size === 0 && defaultPlaylistId) {
          next.add(defaultPlaylistId);
        }
        setSelected(next);
      });
    }
    setCreating(false);
    setNewName("");
    setBusy(false);
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, song?.id, batch, songs?.length, preselectDefault]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: contentTranslateY.value }] }));

  const sortedPlaylists = useMemo(
    () => [...playlists].sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return b.position - a.position;
    }),
    [playlists],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasChanges = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  const apply = async () => {
    if (busy) return;
    const toAdd: string[] = [];
    for (const id of selected) if (!initial.has(id)) toAdd.push(id);

    if (batch)
    {
      close();
      if (toAdd.length === 0) return;
      const total = songs!.length * toAdd.length;
      addSongsToPlaylists(songs!, toAdd)
        .then(({ failed }) => {
          if (failed > 0) {
            showAlert(
              t('addToPlaylist.batchErrorTitle'),
              t('addToPlaylist.batchErrorBody', { failed, total }),
            );
          }
        })
        .catch(() => {
          showAlert(
            t('addToPlaylist.batchErrorTitle'),
            t('addToPlaylist.batchErrorBody', { failed: total, total }),
          );
        });
      return;
    }

    if (!song) return;
    setBusy(true);
    const toRemove: string[] = [];
    for (const id of initial) if (!selected.has(id)) toRemove.push(id);

    if (toAdd.length > 0) await addSongToPlaylists(song, toAdd);
    for (const id of toRemove) await removeSongFromPlaylist(id, song.id);

    setBusy(false);
    close();
  };

  const submitNew = async () => {
    const trimmed = newName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const id = await createPlaylist(trimmed);
    setBusy(false);
    setCreating(false);
    setNewName("");
    if (id) setSelected((prev) => new Set(prev).add(id));
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={close} />
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {batch
                ? t('addToPlaylist.batchTitle', { count: songs!.length })
                : t('addToPlaylist.title')}
            </Text>
            <TouchableOpacity onPress={apply} disabled={(batch ? selected.size === 0 : !hasChanges) || busy}>
              <Text style={[styles.doneText, ((batch ? selected.size === 0 : !hasChanges) || busy) && styles.doneDisabled]}>
                {t('addToPlaylist.done')}
              </Text>
            </TouchableOpacity>
          </View>
          {batch && batchTitle ? (
            <Text style={styles.batchSubtitle} numberOfLines={1}>{batchTitle}</Text>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {creating ? (
              <View style={styles.newRow}>
                <TextInput
                  style={styles.newInput}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                  placeholder={t('addToPlaylist.newPlaylist')}
                  placeholderTextColor="#8f8f8f"
                  onSubmitEditing={submitNew}
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={submitNew}>
                  <IconSymbol name="checkmark-circle" size={26} color="#2c5af3" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.createRow} onPress={() => setCreating(true)}>
                <View style={styles.createIcon}>
                  <IconSymbol name="plus" size={22} color="#fff" />
                </View>
                <Text style={styles.optionText}>{t('addToPlaylist.newPlaylist')}</Text>
              </TouchableOpacity>
            )}

            {sortedPlaylists.map((p) => {
              const checked = selected.has(p.id);
              return (
                <TouchableOpacity key={p.id} style={styles.row} onPress={() => toggle(p.id)}>
                  <PlaylistCover
                    coverUrl={p.coverUrl}
                    previewThumbnails={p.previewThumbnails}
                    size={44}
                    borderRadius={5}
                  />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.rowMeta}>{t('playlist.songCount', { count: p.songCount })}</Text>
                  </View>
                  <IconSymbol
                    name={checked ? "checkmark-circle" : "radio-button-off"}
                    size={24}
                    color={checked ? "#2c5af3" : "#8f8f8f"}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
