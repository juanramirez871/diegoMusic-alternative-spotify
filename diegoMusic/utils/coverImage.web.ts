const MAX_SIZE = 640;
const JPEG_QUALITY = 0.85;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not read the selected image'));
    image.src = src;
  });

/**
 * The web picker ignores `allowsEditing`/`aspect`, so crop to a centred square and
 * downscale here. Returns a data URL: unlike the picker's blob: URL it survives a
 * reload, so a queued upload can still be sent later.
 */
export async function persistPickedCover(uri: string): Promise<string> {
  try {
    const image = await loadImage(uri);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const size = Math.min(side, MAX_SIZE);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context || side === 0) return uri;

    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) / 2;
    context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }
  catch (err) {
    console.warn('[Cover] could not prepare picked image:', err);
    return uri;
  }
  finally {
    if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
  }
}

/** Data URLs need no cleanup. */
export async function releasePickedCover(_uri: string): Promise<void> {}

/** Multipart body for the cover upload, or null when the image can't be read anymore. */
export async function coverFormData(uri: string): Promise<FormData | null> {
  try {
    const blob = await (await fetch(uri)).blob();
    const type = blob.type || 'image/jpeg';
    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const form = new FormData();
    form.append('cover', blob, `cover.${ext}`);
    return form;
  }
  catch {
    return null;
  }
}
