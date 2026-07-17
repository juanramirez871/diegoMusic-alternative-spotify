import { TranslationLanguage } from "@/interfaces/translations";
import apiFetch from "@/services/api";

const AZURE_ENDPOINT = process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_ENDPOINT ?? 'https://api.cognitive.microsofttranslator.com';
const AZURE_KEY = process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_KEY ?? '';
const AZURE_REGION = process.env.EXPO_PUBLIC_AZURE_TRANSLATOR_REGION ?? '';

export const SUPPORTED_LANGUAGES: TranslationLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

const DEFAULT_FROM = 'en';
const DEFAULT_TO = 'es';

async function translateWithAzure(
  texts: string[],
  from: string,
  to: string,
): Promise<string[]> {

  const url = `${AZURE_ENDPOINT}/translate?api-version=3.0&from=${from}&to=${to}`;
  const body = texts.map((t) => ({ Text: t }));
  const headers: Record<string, string> = {
    'Ocp-Apim-Subscription-Key': AZURE_KEY,
    'Content-Type': 'application/json',
  };

  if (AZURE_REGION) headers['Ocp-Apim-Subscription-Region'] = AZURE_REGION;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Azure respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const data = await res.json();
  return data.map((item: { translations: { text: string }[] }) => item.translations[0].text);
}

async function translateWithBackend(
  texts: string[],
  from: string,
  to: string,
): Promise<string[]> {
  const data = await apiFetch<{ texts: string[] }>('/translate', {
    method: 'POST',
    body: JSON.stringify({ texts, from, to }),
  });
  if (!Array.isArray(data?.texts) || data.texts.length !== texts.length) {
    throw new Error('Respuesta de traducción inválida del backend');
  }
  return data.texts;
}

export async function translateText(
  texts: string[],
  from: string = DEFAULT_FROM,
  to: string = DEFAULT_TO,
): Promise<string[]> {

  if (!texts.length) return [];

  if (AZURE_KEY) {
    try {
      return await translateWithAzure(texts, from, to);
    }
    catch (error) {
      console.warn('[AzureTranslator] Falló, usando backend como fallback:', error);
    }
  }

  return translateWithBackend(texts, from, to);
}

export const DEFAULT_TRANSLATION = { from: DEFAULT_FROM, to: DEFAULT_TO };
