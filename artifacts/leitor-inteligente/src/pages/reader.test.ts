import { describe, expect, it } from 'vitest';
import { clampChapter, getChapterProgress, getInitialChapterIndex, getRestoredOffset, loadReaderBook } from './reader-logic';

describe('leitor web', () => {
  it('carrega o livro pela rota codificada e rejeita um livro ausente', async () => {
    const request = async (url: string) => new Response(JSON.stringify({ id: 'book/1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    await expect(loadReaderBook<{ id: string }>('book/1', request)).resolves.toEqual({ id: 'book/1' });
    expect(request).toBeDefined();
    await expect(loadReaderBook('missing', async () => new Response(null, { status: 404 }))).rejects.toThrow('Livro indisponível');
  });

  it('abre no capítulo salvo e limita a posição ao conteúdo disponível', () => {
    expect(getInitialChapterIndex(2, 3)).toBe(1);
    expect(getRestoredOffset(2, 999, 1, 12)).toBe(11);
    expect(getRestoredOffset(2, 4, 0, 12)).toBe(0);
  });

  it('navega pelo índice sem ultrapassar o primeiro ou último capítulo', () => {
    expect(clampChapter(-1, 3)).toBe(0);
    expect(clampChapter(1, 3)).toBe(1);
    expect(clampChapter(8, 3)).toBe(2);
  });

  it('calcula o progresso ao trocar de capítulo e ao avançar no texto', () => {
    expect(getChapterProgress(0, 0, 100, 2)).toBe(0);
    expect(getChapterProgress(0, 50, 100, 2)).toBe(25);
    expect(getChapterProgress(1, 0, 100, 2)).toBe(50);
    expect(getChapterProgress(1, 100, 100, 2)).toBe(100);
  });
});