import { describe, expect, it } from 'vitest';
import {
  FANTASY_LEVELS,
  fantasyCatalogs,
  fantasyData,
  fantasySubgenres,
  filterFantasySections,
} from './fantasy';

describe('trilha de Fantasia', () => {
  it.each(FANTASY_LEVELS)('filtra cartões do nível %s', (level) => {
    const sections = filterFantasySections(level);
    const cards = sections.flatMap(section => section.items);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(card => card.level === level)).toBe(true);
  });

  it('retorna todos os cartões quando Todos os níveis está selecionado', () => {
    const allCards = filterFantasySections('Todos').flatMap(section => section.items);
    const catalogCards = fantasyData.flatMap(section => section.items);

    expect(allCards).toEqual(catalogCards);
    expect(allCards.length).toBeGreaterThan(10);
  });

  it('mantém exemplo e explicação em todos os cartões', () => {
    const cards = fantasyData.flatMap(section => section.items);

    expect(cards.every(card => card.example.trim().length > 0)).toBe(true);
    expect(cards.every(card => card.explanation.trim().length > 0)).toBe(true);
  });

  it('traduz os moldes derivados pelo sentido da frase, não por um rótulo genérico', () => {
    const cards = fantasyData.flatMap(section => section.items);
    const realmCards = cards.filter(card => card.term.includes('realm'));

    expect(realmCards.find(card => card.term === 'realm')?.meaning).toBe('reino, domínio');
    expect(realmCards.find(card => card.term === 'the ancient realm')?.meaning).toBe('reino, domínio de tempos antigos');
    expect(realmCards.find(card => card.term === 'the realm within')?.meaning).toBe('o interior de reino, domínio');
    expect(cards.every(card => !card.meaning.startsWith('expressão com '))).toBe(true);
  });

  it('não gera moldes gramaticais incompatíveis com os cartões', () => {
    const cards = fantasyData.flatMap(section => section.items);

    expect(cards.some(card => /the ancient (wield|draw|raise|strike|awaken|bind)\b/.test(card.term))).toBe(false);
    expect(cards.some(card => /to seek the to\b/.test(card.term))).toBe(false);
    expect(cards.some(card => /\bthe ancient ancient\b/.test(card.term))).toBe(false);
    expect(cards.some(card => /\ba (ancient|eerie|uncanny|overgrown)\b/.test(card.term))).toBe(false);
    expect(cards.some(card => /\bto (indeed|hence|therefore|alas|nay|farewell|welcome|begone)\b/.test(card.term))).toBe(false);
  });

  it('mantém cobertura ampla e todas as oito áreas da trilha', () => {
    expect(fantasyData).toHaveLength(8);
    expect(fantasyData.flatMap(section => section.items)).toHaveLength(3828);
    expect(fantasyData.every(section => section.items.length > 0)).toBe(true);
  });

  it('mantém sementes distintas e amplia cada seção com repertório próprio', () => {
    const sections = fantasyData.map(section => section.items);
    const allTerms = fantasyData.flatMap(section => section.items.map(item => item.term));

    expect(new Set(allTerms).size).toBeGreaterThan(300);
    expect(sections.every(items => new Set(items.map(item => item.term)).size >= 35)).toBe(true);
  });

  it('oferece uma seleção geral e quatro variações curadas de subgênero', () => {
    expect(fantasySubgenres.map(option => option.id)).toEqual(['geral', 'epica', 'urbana', 'sombria', 'contos']);
    expect(fantasySubgenres.every(option => option.label && option.description)).toBe(true);
    expect(Object.values(fantasyCatalogs)).toHaveLength(fantasySubgenres.length);
    expect(Object.values(fantasyCatalogs).every(catalog => catalog.length >= 4)).toBe(true);
  });

  it('mantém catálogos de subgênero claramente distintos', () => {
    const catalogTerms = Object.values(fantasyCatalogs).map(catalog => new Set(
      catalog.flatMap(section => section.items.map(item => item.term)),
    ));

    expect(catalogTerms.slice(1).every(terms => terms.size > 100)).toBe(true);
    expect(catalogTerms.slice(1).every(terms => terms.size !== catalogTerms[0].size)).toBe(true);
    expect(catalogTerms[1].has('continent')).toBe(true);
    expect(catalogTerms[2].has('subway')).toBe(true);
    expect(catalogTerms[3].has('menace')).toBe(true);
    expect(catalogTerms[4].has('once upon a time')).toBe(true);
  });

  it.each(fantasySubgenres.map(option => option.id))('filtra por nível no catálogo %s', (subgenre) => {
    const cards = filterFantasySections('Desafio', subgenre).flatMap(section => section.items);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every(card => card.level === 'Desafio')).toBe(true);
  });

  it('usa exemplos variados e neutros, sem referências identificáveis a obras', () => {
    const cards = fantasyData.flatMap(section => section.items);
    const examples = new Set(cards.map(card => card.example));

    expect(examples.size).toBeGreaterThan(300);
    expect(cards.every(card => !/\b[A-Z][a-z]+ (said|replied|ruled|was)\b/.test(card.example))).toBe(true);
    expect(cards.every(card => !/chapter|character|novel|book|king named/i.test(card.example))).toBe(true);
  });
});