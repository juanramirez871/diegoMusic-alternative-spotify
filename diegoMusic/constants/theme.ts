import { Platform } from 'react-native';

/** Shared design tokens for the Spotify-style UI. */
export const colors = {
  background: '#121212',
  backgroundNative: '#252424',
  text: '#ffffff',
  textSubdued: '#b3b3b3',
  accent: '#2c5af3',
  onAccent: '#ffffff',
  surface: 'rgba(255, 255, 255, 0.07)',
  surfaceHover: 'rgba(255, 255, 255, 0.12)',
  tile: 'rgba(255, 255, 255, 0.1)',
  tileHover: 'rgba(255, 255, 255, 0.2)',
  chipSelected: '#ffffff',
  onChipSelected: '#000000',
  placeholder: '#333333',
  bar: '#000000',
  control: '#1f1f1f',
  controlHover: '#2a2a2a',
  popover: '#282828',
  popoverHover: '#3e3e3e',
  border: 'rgba(255, 255, 255, 0.1)',
} as const;

export const layout = {
  /** Horizontal padding of a tab screen's content. */
  pagePadding: Platform.OS === 'web' ? 24 : 16,
} as const;
