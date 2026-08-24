import AsyncStorage from '@react-native-async-storage/async-storage';

export const storageKey = 'leitor-inteligente-settings';
export const preferencesExportVersion = 1;

export type AiProvider = 'ollama' | 'openrouter';
export type SpeechAccent = 'en-US' | 'en-GB';
export type Preferences = {
  provider: AiProvider;
  endpoint: string;
  model: string;
  level: string;
  dailyGoal: string;
  showPronunciation: boolean;
  gentleReminders: boolean;
  speechAccent: SpeechAccent;
};

export const defaults: Preferences = {
  provider: 'ollama',
  endpoint: 'http://localhost:11434',
  model: 'llama3.2',
  level: 'B1 · Intermédio',
  dailyGoal: '25',
  showPronunciation: true,
  gentleReminders: true,
  speechAccent: 'en-US',
};

const preferenceKeys: (keyof Preferences)[] = ['provider', 'endpoint', 'model', 'level', 'dailyGoal', 'showPronunciation', 'gentleReminders', 'speechAccent'];
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateImportedPreferences(value: unknown): { valid: true; preferences: Preferences } | { valid: false; error: string } {
  if (!isRecord(value) || value.version !== preferencesExportVersion || !isRecord(value.preferences)) {
    return { valid: false, error: 'Este ficheiro não é uma exportação de preferências reconhecida.' };
  }
  const imported = value.preferences;
  const keys = Object.keys(imported);
  if (keys.length !== preferenceKeys.length || keys.some((key) => !preferenceKeys.includes(key as keyof Preferences))) {
    return { valid: false, error: 'O ficheiro tem campos incompatíveis ou está incompleto.' };
  }
  if (imported.provider !== 'ollama' && imported.provider !== 'openrouter') {
    return { valid: false, error: 'O ficheiro indica um motor de preparação inválido.' };
  }
  if (typeof imported.endpoint !== 'string' || typeof imported.model !== 'string' || typeof imported.level !== 'string' || typeof imported.dailyGoal !== 'string') {
    return { valid: false, error: 'O ficheiro tem valores de texto incompatíveis.' };
  }
  if (typeof imported.showPronunciation !== 'boolean' || typeof imported.gentleReminders !== 'boolean') {
    return { valid: false, error: 'O ficheiro tem opções de atenção incompatíveis.' };
  }
  if (imported.speechAccent !== 'en-US' && imported.speechAccent !== 'en-GB') {
    return { valid: false, error: 'O ficheiro indica um sotaque inválido.' };
  }
  return { valid: true, preferences: imported as Preferences };
}

export async function getPreferences(): Promise<Preferences> {
  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Partial<Preferences>;
    return { ...defaults, ...parsed, speechAccent: parsed.speechAccent === 'en-GB' ? 'en-GB' : 'en-US' };
  } catch {
    return defaults;
  }
}

export async function savePreferences(preferences: Preferences): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(preferences));
}