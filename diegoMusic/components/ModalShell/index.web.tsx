import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, View } from 'react-native';
import type { ModalShellProps } from '@/interfaces/ui';
import { usePresence } from './usePresence';
import { TRANSITION_MS, styles } from './styles.web';

const DEFAULT_WIDTH = 440;

/** Centred dialog that fades and scales in over a softly blurred backdrop. */
export function ModalShell({ visible, onClose, children, contentStyle, width = DEFAULT_WIDTH }: ModalShellProps) {
  const { mounted, shown } = usePresence(visible, TRANSITION_MS);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    // Capture phase: react-native-web's TextInput stops key events from bubbling.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, onClose]);

  if (!mounted) return null;

  return createPortal(
    <View style={styles.root}>
      <Pressable
        focusable={false}
        onPress={onClose}
        style={[styles.backdrop, shown && styles.backdropShown]}
      />
      <View
        role="dialog"
        aria-modal
        style={[styles.panel, { width }, shown && styles.panelShown, contentStyle]}
      >
        {children}
      </View>
    </View>,
    document.body,
  );
}
