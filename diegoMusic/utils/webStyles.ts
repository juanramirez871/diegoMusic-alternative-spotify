import { Platform } from 'react-native';

/** Web-only CSS that React Native's style types don't describe. Returns an empty style on native. */
export const webStyle = (css: Record<string, string | number>): Record<string, unknown> =>
  Platform.OS === 'web' ? css : {};

/** CSS `transition` for react-native-web. Returns an empty style on native. */
export const webTransition = (value: string): Record<string, unknown> => webStyle({ transition: value });
