import { describe, expect, it } from 'vitest';
import {
  filterSpecialistItems,
  getReviewStatus,
  loadReviewStatuses,
  REVIEW_STORAGE_KEY,
  saveReviewStatuses,
  specialistsData,
  type StorageLike,
} from './specialist-data';

const specialist = (id: string) => specialistsData.find((definition) => definition.id === id)!;

describe('catálogo dos especialistas', () => {
  it('mantém os dez especialistas com conteúdo inicial revisado', () => {
    expect(specialistsData).toHaveLength(10);
    expect(specialistsData.every((definition) => definition.items.length > 0)).toBe(true);
    expect(specialistsData.map((definition) => definition.id)).toEqual([
      'vocabulary', 'phrasal-verbs', 'idioms', 'collocations', 'language-chunks',
      'narrative-verbs', 'atmosphere', 'register-tone', 'false-cognates', 'word-formation',
    ]);
  });

  it('oferece seis itens distintos e os três níveis para cada especialista', () => {
    for (const definition of specialistsData) {
      expect(definition.items).toHaveLength(6);
      expect(new Set(definition.items.map((item) => item.id)).size).toBe(definition.items.length);
      expect(new Set(definition.items.map((item) => item.level))).toEqual(
        new Set(['Essencial', 'Aprofundamento', 'Desafio']),
      );
    }
  });

  it('mantém cada cartão completo e alinhado às colunas do especialista', () => {
    for (const definition of specialistsData) {
      for (const item of definition.items) {
        expect(item.term.trim()).not.toBe('');
        expect(item.translation.trim()).not.toBe('');
        expect(item.example.trim()).not.toBe('');
        expect(item.explanation.trim()).not.toBe('');
        expect(Object.keys(item.details)).toEqual(definition.columns.map((column) => column.key));
      }
    }
  });

  it('preserva os campos próprios de cada especialista', () => {
    expect(specialist('phrasal-verbs').columns.map((column) => column.key)).toContain('separabilidade');
    expect(specialist('idioms').columns.map((column) => column.key)).toContain('sentidoNatural');
    expect(specialist('false-cognates').columns.map((column) => column.key)).toContain('parece');
    expect(specialist('word-formation').columns.map((column) => column.key)).toContain('estrutura');
  });

  it('busca em traduções e respeita níveis e estados de revisão', () => {
    const collocations = specialist('collocations');
    const statuses = { 'collocation-oath': 'Estudado' as const };

    expect(filterSpecialistItems(collocations, 'juramento', 'Todos', 'Todos', statuses).map((item) => item.id))
      .toEqual(['collocation-oath']);
    expect(filterSpecialistItems(collocations, '', 'Essencial', 'Estudado', statuses).map((item) => item.id))
      .toEqual(['collocation-oath']);
    expect(filterSpecialistItems(collocations, 'exercer', 'Desafio', 'Pendente', statuses).map((item) => item.id))
      .toEqual(['collocation-power']);
  });

  it('salva e recupera o progresso sem depender da API', () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    };

    saveReviewStatuses({ 'vocabulary-realm': 'Dominado' }, storage);
    expect(values.has(REVIEW_STORAGE_KEY)).toBe(true);
    expect(getReviewStatus('vocabulary-realm', loadReviewStatuses(storage))).toBe('Dominado');
    expect(getReviewStatus('unknown-item', loadReviewStatuses(storage))).toBe('Pendente');
  });
});