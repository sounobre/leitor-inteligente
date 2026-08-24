import { describe, expect, it, vi } from 'vitest';
import { defaults, getSettings, saveSettings, storageKey, validateImportedPreferences } from './settings';

describe('preferências guardadas', () => {
  it('volta aos valores padrão quando o JSON guardado está corrompido', () => {
    const storage = {
      getItem: vi.fn((key: string) => (key === storageKey ? '{preferências inválidas' : null)),
    };

    expect(getSettings(storage)).toEqual(defaults);
  });

  it('mantém os valores guardados e preenche preferências ausentes', () => {
    const storage = {
      getItem: vi.fn((key: string) => (key === storageKey ? JSON.stringify({ model: 'qwen3', gentleReminders: false }) : null)),
    };

    expect(getSettings(storage)).toEqual({
      ...defaults,
      model: 'qwen3',
      gentleReminders: false,
    });
  });

  it('volta aos valores padrão quando a leitura do armazenamento falha', () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error('Storage access denied');
      }),
    };

    expect(getSettings(storage)).toEqual(defaults);
  });

  it('não lança e indica falha quando não consegue guardar', () => {
    const storage = {
      setItem: vi.fn(() => {
        throw new Error('Quota exceeded');
      }),
    };

    expect(() => saveSettings(defaults, storage)).not.toThrow();
    expect(saveSettings(defaults, storage)).toBe(false);
  });

  it('indica quando consegue guardar as preferências', () => {
    const storage = { setItem: vi.fn() };

    expect(saveSettings(defaults, storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify(defaults));
  });

  it('valida uma exportação completa de preferências', () => {
    expect(validateImportedPreferences({ version: 1, preferences: defaults })).toEqual({ valid: true, preferences: defaults });
  });

  it('rejeita uma exportação com campos desconhecidos ou ausentes', () => {
    expect(validateImportedPreferences({ version: 1, preferences: { ...defaults, extra: true } })).toEqual({
      valid: false,
      error: 'O ficheiro tem campos incompatíveis ou está incompleto.',
    });
    expect(validateImportedPreferences({ version: 1, preferences: { ...defaults, model: undefined } }).valid).toBe(false);
  });

  it('rejeita versões, tipos e valores incompatíveis sem lançar', () => {
    expect(validateImportedPreferences({ version: 2, preferences: defaults }).valid).toBe(false);
    expect(validateImportedPreferences({ version: 1, preferences: { ...defaults, provider: 'invalid' } }).valid).toBe(false);
    expect(validateImportedPreferences(null).valid).toBe(false);
  });
});