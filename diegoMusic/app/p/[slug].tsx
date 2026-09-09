import { Redirect, useLocalSearchParams } from 'expo-router';

/** Shareable short link: /p/<slug> → the public playlist screen. */
export default function ShortLinkRedirect() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  if (!slug) return <Redirect href="/playlists" />;
  return <Redirect href={`/playlists/public/${slug}` as any} />;
}
