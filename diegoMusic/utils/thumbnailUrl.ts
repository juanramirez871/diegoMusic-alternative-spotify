const YT_HOST_RE = /^(?:https?:)?\/\/i\.ytimg\.com\/vi(?:_webp)?\/([\w-]{6,})\//i;
export type ThumbQuality = 'high' | 'low';

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
  if (!id) return url.replace(/^http:\/\//i, 'https://');

  return `https://i.ytimg.com/vi/${id}/${VARIANT[quality]}`;
};
