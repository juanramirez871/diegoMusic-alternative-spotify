import { SUPPORTED_LANGUAGES } from '@/services/lyricsTranslation';
import type { LyricLine } from '@/interfaces/lyrics';
export interface Translations {
  tabs: {
    home: string;
    favorite: string;
    search: string;
    settings: string;
  };
  favorite: {
    title: string;
    findIn: string;
    songCount: string;
    noResults: string;
    noSongs: string;
    downloadAllDoneTitle: string;
    downloadAllDoneBody: string;
  };
  search: {
    title: string;
    placeholder: string;
    placeholderOffline: string;
    browseAll: string;
  };
  searchOverlay: {
    placeholder: string;
    cancel: string;
    noResults: string;
    noResultsSub: string;
    emptyTitle: string;
    emptySub: string;
    recentSearches: string;
    clearAll: string;
  };
  lyrics: {
    title: string;
    offline: string;
    notFound: string;
    noConnection: string;
    notAvailable: string;
    searchPlaceholder: string;
    translate: string;
    translateFrom: string;
    translateTo: string;
  };
  offline: {
    title: string;
    message: string;
  };
  settings: {
    title: string;
    language: string;
    videoQuality: string;
    videoQualityLow: string;
    videoQualityMedium: string;
    videoQualityHigh: string;
  };
  home: {
    musicTag: string;
    mostPlayedTitle: string;
    noMostPlayed: string;
  };
  stats: {
    title: string;
    totalPlays: string;
    minutes: string;
    liked: string;
    dayStreak: string;
    keepGoing: string;
    playToday: string;
    topArtists: string;
    mostPlayed: string;
    empty: string;
    plays: string;
  };
  player: {
    nowPlaying: string;
    videoOfflineTitle: string;
    videoOfflineMessage: string;
    shareMessage: string;
  };
  queue: {
    title: string;
    shuffle: string;
  };
  sleepTimer: {
    title: string;
    active: string;
    disable: string;
    minutesOption: string;
    hourOption: string;
    hoursOption: string;
  };
  genre: {
    noSongsFound: string;
  };
  download: {
    songDownloaded: string;
    notificationTitle: string;
    notificationBody: string;
    batchNotificationTitle: string;
    batchNotificationBody: string;
  };
  musicArtist: {
    forFansOf: string;
  };
  favoriteArtists: {
    title: string;
    empty: string;
  };
  songOptions: {
    untitled: string;
    addToFavorites: string;
    removeFromFavorites: string;
    addArtistToFavorites: string;
    removeArtistFromFavorites: string;
    openOriginalVideo: string;
  };
  song: {
    untitled: string;
    unknownArtist: string;
  };
  errors: {
    offlineTitle: string;
    offlineSongUnavailable: string;
    playbackTitle: string;
    playbackFailed: string;
    retry: string;
    cancel: string;
    downloadTitle: string;
    downloadFailed: string;
  };
  genres: Record<string, string>;
  login: {
    subtitle: string;
    continueWithGoogle: string;
    agreementPrefix: string;
    termsOfService: string;
    agreementMiddle: string;
    privacyPolicy: string;
  };
}

export interface TranslationPrefs {
  enabled: boolean;
  from: string;
  to: string;
}

export interface UseLyricsTranslationReturn {
  translationEnabled: boolean;
  setTranslationEnabled: (enabled: boolean) => void;
  translationFrom: string;
  setTranslationFrom: (code: string) => void;
  translationTo: string;
  setTranslationTo: (code: string) => void;
  translatedSynced: LyricLine[] | null;
  translatedPlain: string | null;
  translating: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

export interface TranslationLanguage {
  code: string;
  name: string;
}