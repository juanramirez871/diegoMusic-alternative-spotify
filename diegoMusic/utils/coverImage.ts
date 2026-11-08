import * as FileSystem from '@/utils/fileSystem';

const PENDING_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}pending-covers/` : null;

const mimeFor = (uri: string) => {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
};

/**
 * Copies a picked image out of the picker's cache, which the OS may purge, so a
 * queued upload still finds the file after a restart.
 */
export async function persistPickedCover(uri: string): Promise<string> {
  if (!PENDING_DIR) return uri;
  try {
    await FileSystem.makeDirectoryAsync(PENDING_DIR, { intermediates: true });
    const ext = mimeFor(uri).split('/')[1].replace('jpeg', 'jpg');
    const target = `${PENDING_DIR}${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: uri, to: target });
    return target;
  }
  catch (err) {
    console.warn('[Cover] could not persist picked image:', err);
    return uri;
  }
}

/** Deletes a persisted copy once it has been uploaded or discarded. */
export async function releasePickedCover(uri: string): Promise<void> {
  if (!PENDING_DIR || !uri.startsWith(PENDING_DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

/** Multipart body for the cover upload, or null when the local file is gone. */
export async function coverFormData(uri: string): Promise<FormData | null> {
  const info = await FileSystem.getInfoAsync(uri).catch(() => null);
  if (uri.startsWith('file:') && !info?.exists) return null;

  const form = new FormData();
  // React Native's FormData accepts this file descriptor in place of a Blob.
  const file = { uri, name: uri.split('/').pop() || 'cover.jpg', type: mimeFor(uri) };
  form.append('cover', file as unknown as Blob);
  return form;
}
