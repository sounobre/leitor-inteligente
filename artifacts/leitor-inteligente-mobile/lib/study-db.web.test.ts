import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestDictionaryEntry } from './study-db.web';
import { syncPendingReadingPositions } from './reading-position-sync';

const storage = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
  },
}));

const entry: TestDictionaryEntry = {
  id: 'offline-entry',
  term: 'serendipity',
  translation: 'serendipidade',
  partOfSpeech: 'noun',
  senses: [{ id: 'sense-1', definition: 'A happy discovery', translation: 'Uma descoberta feliz' }],
  examples: [{
    id: 'example-1',
    sentence: 'The meeting led to serendipity.',
    translation: 'A reunião levou a uma serendipidade.',
    explanation: 'Unexpected good fortune.',
    createdAt: '2026-08-22T00:00:00Z',
  }],
  cards: [{ id: 'card-1', entryId: 'offline-entry', exampleId: 'example-1', term: 'serendipity', translation: 'serendipidade', reviewed: 0 }],
};

async function loadDatabase() {
  vi.resetModules();
  return import('./study-db.web');
}

describe('dicionário offline após reabrir o app', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('recupera a cópia sincronizada e mantém o cartão revisado após reabrir', async () => {
    const firstSession = await loadDatabase();
    await firstSession.initialiseStudyDb();
    await firstSession.saveTestDictionaryEntries([entry]);
    expect((await firstSession.getTestDictionaryEntries())[0]?.term).toBe('serendipity');

    await firstSession.toggleTestDictionaryCard('card-1', true);

    const reopenedSession = await loadDatabase();
    await reopenedSession.initialiseStudyDb();
    const entries = await reopenedSession.getTestDictionaryEntries();
    const searchResult = entries.filter((item) => `${item.term} ${item.translation}`.toLocaleLowerCase().includes('serendipity'));

    expect(searchResult).toHaveLength(1);
    expect(searchResult[0]?.senses[0]?.translation).toBe('Uma descoberta feliz');
    expect(searchResult[0]?.cards[0]?.reviewed).toBe(1);
  });

  it('mantém apenas a posição mais recente na fila offline', async () => {
    const database = await loadDatabase();
    await database.initialiseStudyDb();
    await database.updateReadingPosition('book-offline', 2, 14, 42);
    await database.updateReadingPosition('book-offline', 3, 2, 67);

    const reopenedDatabase = await loadDatabase();
    await reopenedDatabase.initialiseStudyDb();
    expect(await reopenedDatabase.getPendingReadingPositions()).toEqual([
      expect.objectContaining({ bookId: 'book-offline', chapter: 3, offset: 2, progress: 67 }),
    ]);

    const [pending] = await reopenedDatabase.getPendingReadingPositions();
    await reopenedDatabase.removePendingReadingPosition(pending.bookId, pending.updatedAt);
    expect(await reopenedDatabase.getPendingReadingPositions()).toEqual([]);
  });

  it('mantém a posição quando a rede falha e a remove após uma nova tentativa', async () => {
    const position = { bookId: 'book-retry', chapter: 2, offset: 8, progress: 38, updatedAt: '2026-08-23T00:00:00.000Z' };
    const removed: string[] = [];
    let attempts = 0;
    const send = async () => {
      attempts += 1;
      return attempts > 1;
    };
    await expect(syncPendingReadingPositions([position], send, async (item) => { removed.push(item.bookId); })).rejects.toThrow('Reading position sync failed');
    expect(removed).toEqual([]);
    await syncPendingReadingPositions([position], send, async (item) => { removed.push(item.bookId); });
    expect(attempts).toBe(2);
    expect(removed).toEqual(['book-retry']);
  });
});