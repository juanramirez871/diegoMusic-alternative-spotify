import { API_URL } from '@/services/apiUrl';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');
const UPLOADED_COVER_RE = /\/uploads\/playlist-covers\/([\w.-]+)$/;
const LOCAL_URI_RE = /^(file|content|blob|data|ph|assets-library):/i;

/** True for images that still live on this device and have to be uploaded. */
export const isLocalImageUri = (uri: string): boolean => LOCAL_URI_RE.test(uri);

/**
 * Points uploaded covers at the API this app is currently talking to. The server
 * builds absolute URLs from the request host, so a URL saved on another device or
 * network (another LAN IP, http vs https) would otherwise stop loading.
 */
export const resolveCoverUrl = (raw?: string | null): string | null => {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return null;
  if (isLocalImageUri(url)) return url;

  const uploaded = url.match(UPLOADED_COVER_RE);
  return uploaded ? `${API_ORIGIN}/uploads/playlist-covers/${uploaded[1]}` : url;
};
