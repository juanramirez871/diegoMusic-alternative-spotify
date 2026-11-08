import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './apiUrl';
import { authEvents } from './authEvents';

const BASE_URL = API_URL;
const API_TIMEOUT_MS = 8000;

/** Error thrown for non-2xx responses, carrying the HTTP status. */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * True when retrying the request cannot succeed: a client error other than
 * auth (fixed by signing in again), timeouts and rate limiting.
 */
export const isPermanentFailure = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  ![401, 408, 429].includes(error.status);

export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('@auth_token');
  }
  catch {
    return null;
  }
};

const apiFetch = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const token = await getToken();
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // The stored session is no longer valid: sign out so nothing keeps failing silently.
      if (response.status === 401 && token) authEvents.notifySessionExpired();
      throw new ApiError((data as any).error || `HTTP ${response.status}`, response.status);
    }

    return data as T;
  }
  catch (error) {
    console.error(`API Fetch Error [${endpoint}]:`, error);
    throw error;
  }
  finally {
    clearTimeout(timeoutId);
  }
};

export default apiFetch;
