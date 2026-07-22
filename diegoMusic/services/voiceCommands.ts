import type { Locale } from '@/interfaces/language';

export type VoiceCommand =
  | 'next'
  | 'previous'
  | 'pause'
  | 'play'
  | 'shuffle'
  | 'repeat'
  | 'favorite';

export interface VoiceParseResult {
  command: VoiceCommand | null;
  query: string;
}

export const localeToSpeechLang: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
  ja: 'ja-JP',
};

const COMMAND_PHRASES: Record<Locale, Record<VoiceCommand, string[]>> = {
  es: {
    next: ['siguiente', 'siguiente cancion', 'proxima', 'proxima cancion', 'salta', 'saltar', 'adelante'],
    previous: ['anterior', 'cancion anterior', 'atras', 'regresa', 'volver', 'retrocede'],
    pause: ['pausa', 'pausar', 'para', 'parar', 'detener', 'detente'],
    play: ['reproduce', 'reproducir', 'play', 'continua', 'continuar', 'reanuda'],
    shuffle: ['aleatorio', 'mezcla', 'mezclar', 'shuffle', 'modo aleatorio'],
    repeat: ['repetir', 'repite', 'repeticion', 'modo repeticion'],
    favorite: ['favorito', 'favoritos', 'me gusta', 'anade a favoritos', 'agrega a favoritos', 'guarda'],
  },
  en: {
    next: ['next', 'next song', 'skip', 'skip song', 'forward'],
    previous: ['previous', 'previous song', 'back', 'go back', 'rewind'],
    pause: ['pause', 'stop', 'halt'],
    play: ['play', 'resume', 'continue', 'unpause'],
    shuffle: ['shuffle', 'random', 'shuffle mode', 'mix'],
    repeat: ['repeat', 'loop', 'repeat mode'],
    favorite: ['favorite', 'favourite', 'like', 'add to favorites', 'save'],
  },
  ja: {
    next: ['次', '次の曲', 'スキップ', 'つぎ'],
    previous: ['前', '前の曲', '戻る', 'まえ'],
    pause: ['一時停止', '停止', 'ストップ', 'とめて'],
    play: ['再生', 'プレイ', '続き', 'つづき'],
    shuffle: ['シャッフル', 'ランダム'],
    repeat: ['リピート', '繰り返し', 'くりかえし'],
    favorite: ['お気に入り', 'いいね', '好き'],
  },
};

const SEARCH_PREFIXES: Record<Locale, string[]> = {
  es: ['busca', 'buscar', 'reproduce', 'reproducir', 'pon', 'poner', 'quiero escuchar', 'canciones de', 'musica de'],
  en: ['search', 'search for', 'play', 'find', 'i want to hear', 'songs by', 'music by'],
  ja: ['検索', 'を再生', 'をかけて', 'を探して'],
};

const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos
    .replace(/[¿?¡!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const WAKE_PHRASES = [
  'hey diego music',
  'hola diego music',
  'oye diego music',
  'diego music',
  'hey diego',
  'hola diego',
  'oye diego',
  'ey diego',
  'e diego',
  'el diego',
  'diego',
].map((p) => p.replace(/[̀-ͯ]/g, ''));

export const detectWakeWord = (rawText: string): { rest: string } | null => {

  const text = normalize(rawText);
  if (!text) return null;
  const phrases = [...WAKE_PHRASES].sort((a, b) => b.length - a.length);

  for (const phrase of phrases) {
    const idx = text.indexOf(phrase);
    if (idx !== -1) {
      const rest = text.slice(idx + phrase.length).trim();
      return { rest };
    }
  }
  return null;
};

export const parseVoiceInput = (rawText: string, locale: Locale): VoiceParseResult => {

  const text = normalize(rawText);
  if (!text) return { command: null, query: '' };
  const commands = COMMAND_PHRASES[locale] ?? COMMAND_PHRASES.en;

  for (const [command, phrases] of Object.entries(commands) as [VoiceCommand, string[]][]) {
    if (phrases.some((phrase) => text === normalize(phrase))) {
      return { command, query: '' };
    }
  }

  const prefixes = [...(SEARCH_PREFIXES[locale] ?? SEARCH_PREFIXES.en)]
    .map(normalize)
    .sort((a, b) => b.length - a.length);

  let query = text;
  for (const prefix of prefixes) {
    if (text === prefix) return { command: null, query: '' };
    if (text.startsWith(prefix + ' ')) {
      query = text.slice(prefix.length + 1).trim();
      break;
    }
  }

  return { command: null, query };
};
