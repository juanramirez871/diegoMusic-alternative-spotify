import { Alert, Platform, Share } from 'react-native';

type Btn = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: Btn[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length === 0) {
    window.alert(text);
    return;
  }

  const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
  const cancelBtn = buttons.find((b) => b.style === 'cancel');

  if (buttons.length === 1) {
    window.alert(text);
    confirmBtn.onPress?.();
    return;
  }

  const ok = window.confirm(text);
  if (ok) confirmBtn.onPress?.();
  else cancelBtn?.onPress?.();
}

export async function shareLink(message: string, url: string): Promise<void> {
  if (Platform.OS !== 'web') {
    try { await Share.share({ message: `${message} — ${url}` }); } catch { /* dismissed */ }
    return;
  }
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      await (navigator as any).share({ text: message, url });
      return;
    }
  }
  catch { /* fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(url);
    window.alert(`Link copied:\n${url}`);
  } catch {
    window.prompt('Copy this link:', url);
  }
}
