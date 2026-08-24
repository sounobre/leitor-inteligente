import { describe, expect, it } from 'vitest';
import {
  DICTIONARY_CARD,
  DICTIONARY_ROUTE,
  EN_PTBR_DICTIONARY_CARD,
  EN_PTBR_DICTIONARY_ROUTE,
  FANTASY_TRAIL_CARD,
  FANTASY_TRAIL_ROUTE,
  SPECIALISTS_CARD,
  SPECIALISTS_ROUTE,
} from './routes';

describe('entrada da trilha de Fantasia', () => {
  it('aponta a entrada da Biblioteca para a rota da trilha', () => {
    expect(FANTASY_TRAIL_CARD.href).toBe(FANTASY_TRAIL_ROUTE);
    expect(FANTASY_TRAIL_ROUTE).toBe('/trails/fantasy');
  });

  it('mantém título e descrição da entrada da Biblioteca', () => {
    expect(FANTASY_TRAIL_CARD.title).toBe('Fantasia');
    expect(FANTASY_TRAIL_CARD.description).toMatch(/atmosfera/);
    expect(FANTASY_TRAIL_CARD.description.trim().length).toBeGreaterThan(0);
  });
});

describe('entrada dos especialistas de estudo', () => {
  it('aponta a Biblioteca para a área de especialistas', () => {
    expect(SPECIALISTS_CARD.href).toBe(SPECIALISTS_ROUTE);
    expect(SPECIALISTS_ROUTE).toBe('/specialists');
  });

  it('explica as áreas de estudo sem depender de uma obra', () => {
    expect(SPECIALISTS_CARD.title).toBe('Especialistas de estudo');
    expect(SPECIALISTS_CARD.description).toMatch(/phrasal verbs/i);
  });
});

describe('entrada do dicionário pessoal', () => {
  it('aponta a Biblioteca para a área privada de referências', () => {
    expect(DICTIONARY_CARD.href).toBe(DICTIONARY_ROUTE);
    expect(DICTIONARY_ROUTE).toBe('/dictionary');
  });

  it('deixa claro que os exemplos usam Ollama local', () => {
    expect(DICTIONARY_CARD.title).toBe('Dicionário pessoal');
    expect(DICTIONARY_CARD.description).toMatch(/Ollama local/i);
  });
});

describe('entrada do dicionário inglês-português', () => {
  it('aponta para a área pública EN–PT-BR', () => {
    expect(EN_PTBR_DICTIONARY_CARD.href).toBe(EN_PTBR_DICTIONARY_ROUTE);
    expect(EN_PTBR_DICTIONARY_CARD.title).toBe('Dicionário EN–PT-BR');
  });
});