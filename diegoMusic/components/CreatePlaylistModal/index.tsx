import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity } from "react-native";
import { ModalShell } from "@/components/ModalShell";
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { styles } from './styles';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string) => void;
}

export default function CreatePlaylistModal({ visible, onClose, onCreated }: Props) {
  const { t } = useLanguage();
  const { createPlaylist } = usePlayer();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setName("");
      setBusy(false);
    }
  }, [visible]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const id = await createPlaylist(trimmed);
    setBusy(false);
    onClose();
    if (id) onCreated?.(id);
  };

  return (
    <ModalShell visible={visible} onClose={onClose} width={420} contentStyle={styles.content}>
      <Text style={styles.title}>{t('library.createPlaylist')}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder={t('addToPlaylist.newPlaylist')}
        placeholderTextColor="#8f8f8f"
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <TouchableOpacity
        style={[styles.button, (!name.trim() || busy) && styles.buttonDisabled]}
        onPress={submit}
        disabled={!name.trim() || busy}
      >
        <Text style={styles.buttonText}>{t('addToPlaylist.done')}</Text>
      </TouchableOpacity>
    </ModalShell>
  );
}
