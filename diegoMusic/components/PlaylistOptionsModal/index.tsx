import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch } from "react-native";
import { showAlert, shareLink as shareLinkUtil } from "@/utils/alert";
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { ModalShell } from '@/components/ModalShell';
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import type { PlaylistMeta } from "@/interfaces/Playlist";
import { styles } from './styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  playlist: PlaylistMeta;
  onDeleted?: () => void;
}

export default function PlaylistOptionsModal({ visible, onClose, playlist, onDeleted }: Props) {
  const { t } = useLanguage();
  const { renamePlaylist, setPlaylistCover, setPlaylistDownload, deletePlaylist, setPlaylistVisibility } = usePlayer();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(playlist.name);
  const [visBusy, setVisBusy] = useState(false);
  const isPublic = playlist.visibility === 'public';
  // The default "Favoritos" playlist can't be renamed, made public, or deleted —
  // only its cover and download toggle are editable.
  const isDefault = !!playlist.isDefault;

  useEffect(() => {
    if (visible) {
      setName(playlist.name);
      setRenaming(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submitRename = async () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== playlist.name) {
      await renamePlaylist(playlist.id, trimmed);
    }
    setRenaming(false);
  };

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      const outcome = await setPlaylistCover(playlist.id, result.assets[0].uri);
      if (outcome === 'rejected') showAlert(t('playlist.cover'), t('playlist.coverRejected'));
    }
  };

  const toggleVisibility = async (next: boolean) => {
    if (visBusy) return;
    setVisBusy(true);
    await setPlaylistVisibility(playlist.id, next ? 'public' : 'private');
    setVisBusy(false);
  };

  const shareLink = () => {
    const link = `https://diegomusic.app/p/${playlist.slug || playlist.serverId || playlist.id}`;
    void shareLinkUtil(playlist.name, link);
  };

  const confirmDelete = () => {
    showAlert(
      t('playlist.delete'),
      t('playlist.deleteConfirm', { name: playlist.name }),
      [
        { text: t('errors.cancel'), style: 'cancel' },
        {
          text: t('playlist.delete'),
          style: 'destructive',
          onPress: async () => {
            await deletePlaylist(playlist.id);
            onClose();
            onDeleted?.();
          },
        },
      ],
    );
  };

  return (
    <ModalShell visible={visible} onClose={onClose} width={460}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>
      </View>

      <View style={styles.optionsList}>
        {!isDefault && (
          renaming ? (
            <View style={styles.renameRow}>
              <TextInput
                style={styles.renameInput}
                value={name}
                onChangeText={setName}
                autoFocus
                placeholder={t('playlist.rename')}
                placeholderTextColor="#8f8f8f"
                onSubmitEditing={submitRename}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={submitRename}>
                <IconSymbol name="checkmark-circle" size={26} color="#2c5af3" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.option} onPress={() => setRenaming(true)}>
              <IconSymbol name="pencil-outline" size={24} color="#fff" />
              <Text style={styles.optionText}>{t('playlist.rename')}</Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity style={styles.option} onPress={pickCover}>
          <IconSymbol name="image-outline" size={24} color="#fff" />
          <Text style={styles.optionText}>{t('playlist.cover')}</Text>
        </TouchableOpacity>
        {playlist.coverUrl ? (
          <TouchableOpacity style={styles.option} onPress={() => setPlaylistCover(playlist.id, null)}>
            <IconSymbol name="close-circle" size={24} color="#8f8f8f" />
            <Text style={[styles.optionText, { color: '#8f8f8f' }]}>{t('playlist.removeCover')}</Text>
          </TouchableOpacity>
        ) : null}

        <View style={[styles.option, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <IconSymbol
              name={playlist.downloadEnabled ? 'arrow.down.circle.fill' : 'arrow.down.circle'}
              size={24}
              color={playlist.downloadEnabled ? '#2c5af3' : '#fff'}
            />
            <Text style={styles.optionText}>{t('playlist.downloadToggle')}</Text>
          </View>
          <Switch
            value={playlist.downloadEnabled}
            onValueChange={(v) => setPlaylistDownload(playlist.id, v)}
            trackColor={{ false: '#3a3a3a', true: '#2c5af3' }}
            thumbColor="#fff"
          />
        </View>

        {!isDefault && (
          <View style={[styles.option, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 }}>
              <IconSymbol name="person" size={24} color={isPublic ? '#2c5af3' : '#fff'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{t('playlist.makePublic')}</Text>
                <Text style={{ color: '#8f8f8f', fontSize: 12, marginTop: 2 }}>
                  {isPublic
                    ? t('playlist.savedByCount', { count: playlist.savesCount ?? 0 })
                    : t('playlist.publicHint')}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={toggleVisibility}
              disabled={visBusy}
              trackColor={{ false: '#3a3a3a', true: '#2c5af3' }}
              thumbColor="#fff"
            />
          </View>
        )}

        {!isDefault && isPublic && (
          <TouchableOpacity style={styles.option} onPress={shareLink}>
            <IconSymbol name="share-outline" size={24} color="#fff" />
            <Text style={styles.optionText}>{t('playlist.shareLink')}</Text>
          </TouchableOpacity>
        )}

        {!isDefault && (
          <TouchableOpacity style={styles.option} onPress={confirmDelete}>
            <IconSymbol name="trash" size={24} color="#ff5555" />
            <Text style={[styles.optionText, { color: '#ff5555' }]}>{t('playlist.delete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ModalShell>
  );
}
