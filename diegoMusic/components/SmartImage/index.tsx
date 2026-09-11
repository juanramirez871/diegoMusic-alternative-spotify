import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageProps } from 'react-native';
import { normalizeThumbnailUrl, youtubeIdFromThumb } from '@/utils/thumbnailUrl';

type Props = Omit<ImageProps, 'source'> & {
  /** Remote thumbnail URL (any i.ytimg.com variant) or a `require(...)` asset. */
  uri?: string | null;
  /** Fallback when there is no usable uri or it fails to load. */
  fallback?: ImageProps['source'];
};

const DEFAULT_FALLBACK = require('@/assets/images/cover.jpg');

export const SmartImage: React.FC<Props> = ({ uri, fallback, style, resizeMode = 'cover', ...rest }) => {
  const ytId = youtubeIdFromThumb(uri);
  const [tier, setTier] = useState<'high' | 'low'>('high');
  const [failed, setFailed] = useState(false);
  const lastUriRef = useRef<string | null | undefined>(uri);
  useEffect(() => {
    if (lastUriRef.current !== uri) {
      lastUriRef.current = uri;
      setTier('high');
      setFailed(false);
    }
  }, [uri]);

  let source: ImageProps['source'];
  if (uri && !failed && ytId) {
    source = { uri: normalizeThumbnailUrl(uri, tier) };
  }
  else if (uri && !failed) {
    source = { uri: normalizeThumbnailUrl(uri) };
  }
  else {
    source = fallback ?? DEFAULT_FALLBACK;
  }

  return (
    <Image
      {...rest}
      source={source}
      style={style}
      resizeMode={resizeMode}
      onError={(e) => {
        if (ytId && tier === 'high') setTier('low');
        else setFailed(true);
        rest.onError?.(e);
      }}
    />
  );
};
