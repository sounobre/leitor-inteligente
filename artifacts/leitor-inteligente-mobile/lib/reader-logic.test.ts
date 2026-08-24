import { describe, expect, it } from 'vitest';
import { clampChapter, getChapterProgress, getInitialChapterIndex, getReadingOffset } from './reader-logic';

describe('leitor mobile', () => {
  it('abre no capítulo inicial salvo e restaura o ponto dentro do capítulo', () => {
    expect(getInitialChapterIndex(1, 2)).toBe(0);
    expect(getInitialChapterIndex(2, 2)).toBe(1);
    expect(getReadingOffset(4, 8)).toBe(4);
    expect(getReadingOffset(99, 8)).toBe(7);
  });

  it('avança pelo capítulo seguinte sem sair dos limites', () => {
    expect(clampChapter(1, 2)).toBe(1);
    expect(clampChapter(2, 2)).toBe(1);
    expect(clampChapter(-1, 2)).toBe(0);
    expect(getChapterProgress(1, 0, 20, 2)).toBe(50);
  });
});