export type VoiceSessionOwner = 'manual' | 'wake' | null;

export const VOICE_IOS_CATEGORY = {
  category: 'playAndRecord',
  categoryOptions: ['mixWithOthers', 'defaultToSpeaker', 'allowBluetoothA2DP'],
  mode: 'default',
} as const;

let owner: VoiceSessionOwner = null;
let sessionStartedAt = 0;

const STALE_EVENT_WINDOW_MS = 800;
export const setVoiceSessionOwner = (next: VoiceSessionOwner): void => {
  owner = next;
};

export const getVoiceSessionOwner = (): VoiceSessionOwner => owner;
export const markVoiceSessionStarted = (): void => {
  sessionStartedAt = Date.now();
};

export const isStaleSessionEvent = (): boolean =>
  Date.now() - sessionStartedAt < STALE_EVENT_WINDOW_MS;

let manualDuckedVolume: number | null = null;
export const getManualDuckedVolume = (): number | null => manualDuckedVolume;
export const setManualDuckedVolume = (value: number | null): void => {
  manualDuckedVolume = value;
};
