const YT_HOST_RE = /^(?:https?:)?\/\/i\.ytimg\.com\/vi(?:_webp)?\/([\w-]{6,})\//i;
export type ThumbQuality = 'high' | 'low';

/**
 * Google's image CDNs serve the same files over https, so their http URLs are upgraded
 * (avoids mixed content on web). Other hosts, like the API's plain-http LAN port used
 * by the mobile app, must be left untouched or they stop loading.
 */
const HTTPS_CAPABLE_HOST_RE = /^http:\/\/([\w-]+\.)*(ytimg\.com|ggpht\.com|googleusercontent\.com)\//i;

const VARIANT: Record<ThumbQuality, string> = {
  high: 'hq720.jpg',
  low: 'mqdefault.jpg',
};

export const youtubeIdFromThumb = (raw?: string | null): string | null => {
  const url = typeof raw === 'string' ? raw.trim() : '';
  const m = url.match(YT_HOST_RE);
  return m ? m[1] : null;
};

export const normalizeThumbnailUrl = (
  raw?: string | null,
  quality: ThumbQuality = 'high',
): string => {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return '';

  const id = youtubeIdFromThumb(url);
  if (!id) return HTTPS_CAPABLE_HOST_RE.test(url) ? url.replace(/^http:\/\//i, 'https://') : url;

  return `https://i.ytimg.com/vi/${id}/${VARIANT[quality]}`;
};
