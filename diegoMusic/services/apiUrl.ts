import { Platform } from 'react-native';
import Constants from 'expo-constants';

const WEB_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.diegomusic.com:47821/api';
const NATIVE_PORT = 47823;
const getDevServerHost = (): string | null => {
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri?.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
};

const getNativeApiUrl = (): string => {
  const devHost = getDevServerHost();
  if (devHost) return `http://${devHost}:${NATIVE_PORT}/api`;
  if (process.env.EXPO_PUBLIC_API_URL_NATIVE) return process.env.EXPO_PUBLIC_API_URL_NATIVE;
  if (Platform.OS === 'ios') return `http://Juans-MacBook-Pro.local:${NATIVE_PORT}/api`;

  return `http://192.168.1.34:${NATIVE_PORT}/api`;
};

export const API_URL = Platform.OS === 'web' ? WEB_API_URL : getNativeApiUrl();
