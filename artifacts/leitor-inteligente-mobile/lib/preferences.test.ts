import { describe, expect, it } from 'vitest';
import { defaults, validateImportedPreferences } from './preferences';

describe('exportação de preferências compatível com a web', () => {
  it('aceita o envelope completo da exportação web', () => {
    expect(validateImportedPreferences({ version: 1, preferences: defaults })).toEqual({ valid: true, preferences: defaults });
  });

  it('recusa ficheiros incompletos ou de outra versão', () => {
    expect(validateImportedPreferences({ version: 2, preferences: defaults }).valid).toBe(false);
    expect(validateImportedPreferences({ version: 1, preferences: { ...defaults, model: undefined } }).valid).toBe(false);
  });
});