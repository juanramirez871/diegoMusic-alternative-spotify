import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { usePlayer } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { styles } from './styles';

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const OFFSCREEN_Y = Platform.OS === "web" ? 24 : SCREEN_HEIGHT * 0.4;

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

  const overlayOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(OFFSCREEN_Y);

  const open = () => {
    overlayOpacity.value = withTiming(1, { duration: 220 });
    contentTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) });
  };
  const close = () => {
    overlayOpacity.value = withTiming(0, { duration: 160 });
    contentTranslateY.value = withTiming(OFFSCREEN_Y, { duration: 160 }, (fin) => {
      if (fin) runOnJS(onClose)();
    });
  };

  useEffect(() => {
    if (visible) {
      setName("");
      setBusy(false);
      open();
    }
    else {
      overlayOpacity.value = 0;
      contentTranslateY.value = OFFSCREEN_Y;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: contentTranslateY.value }] }));

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const id = await createPlaylist(trimmed);
    setBusy(false);
    close();
    if (id) onCreated?.(id);
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
