import AsyncStorage from '@react-native-async-storage/async-storage';

export type PublicDictionaryEntry = {
  id: string;
  term: string;
  partOfSpeech: string;
  senses: { id: string; definition: string; position: number }[];
  forms: { id: string; form: string; tags: string }[];
  sounds: { id: string; ipa: string; audioUrl: string }[];
  source: { name: string; version: string; license: string; attribution: string };
};
export type PublicDictionarySummary = { id: string; term: string; partOfSpeech: string; senseCount: number };

const CACHE_PREFIX = '@leitor-inteligente/public-dictionary/';

function apiBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return (process.env.EXPO_PUBLIC_API_URL ?? (domain ? `https://${domain}` : '')).replace(/\/+$/, '');
}

export async function getPublicDictionaryEntry(entryId: string, bilingual = false): Promise<PublicDictionaryEntry> {
  const endpoint = bilingual ? 'public-dictionary-en-ptbr' : 'public-dictionary';
  const key = `${CACHE_PREFIX}${endpoint}/${entryId}`;
  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    try {
      return JSON.parse(cached) as PublicDictionaryEntry;
    } catch {
      await AsyncStorage.removeItem(key);
    }
  }
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error('A API do dicionário público não está configurada.');
  const response = await fetch(`${baseUrl}/api/${endpoint}/${encodeURIComponent(entryId)}`);
  if (!response.ok) throw new Error('Não foi possível carregar o verbete público.');
  const entry = await response.json() as PublicDictionaryEntry;
  await AsyncStorage.setItem(key, JSON.stringify(entry));
  return entry;
}

export async function searchPublicDictionary(query: string, bilingual = false): Promise<PublicDictionarySummary[]> {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error('A API do dicionário público não está configurada.');
  const endpoint = bilingual ? 'public-dictionary-en-ptbr' : 'public-dictionary';
  const response = await fetch(`${baseUrl}/api/${endpoint}?query=${encodeURIComponent(query.trim())}&limit=30`);
  if (!response.ok) throw new Error('Não foi possível pesquisar o dicionário público.');
  return await response.json() as PublicDictionarySummary[];
}