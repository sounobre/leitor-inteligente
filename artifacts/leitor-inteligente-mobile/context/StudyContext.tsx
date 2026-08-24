import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTestDictionaryCard, getBooks, getCards, getPreparedBooks, getPendingReadingPositions, getTestDictionaryEntries, initialiseStudyDb, PreparedBook, removePendingReadingPosition, savePreparedBooks, saveTestDictionaryEntries, StudyBook, StudyCard, TestDictionaryEntry, toggleCard, toggleTestDictionaryCard, TestDictionaryCard, updateReadingPosition } from '@/lib/study-db';
import { syncPendingReadingPositions } from '@/lib/reading-position-sync';
import { defaults, getPreferences, Preferences, savePreferences } from '@/lib/preferences';

const SYNC_METADATA_KEY = '@leitor-inteligente/study-sync-metadata';
const CARD_PREFERENCES_KEY = '@leitor-inteligente/card-preferences';

type SyncMetadata = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
};

type CardPreferences = {
  favorites: Record<string, boolean>;
  archived: Record<string, boolean>;
  speechAccent?: SpeechAccent;
};

export type SpeechAccent = 'en-US' | 'en-GB';

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return typeof value === 'object' && value !== null && Object.values(value).every((item) => typeof item === 'boolean');
}

function parseCardPreferences(value: string | null): CardPreferences {
  if (!value) return { favorites: {}, archived: {} };

  try {
    const parsed = JSON.parse(value) as Partial<CardPreferences>;
    return {
      favorites: isBooleanRecord(parsed.favorites) ? parsed.favorites : {},
      archived: isBooleanRecord(parsed.archived) ? parsed.archived : {},
    };
  } catch {
    return { favorites: {}, archived: {} };
  }
}

type StudyContextValue = {
  cards: StudyCard[];
  books: StudyBook[];
  preparedBooks: PreparedBook[];
  ready: boolean;
  syncing: boolean;
  syncError: boolean;
  lastSyncAttemptAt: string | null;
  lastSyncAt: string | null;
  testDictionaryEntries: TestDictionaryEntry[];
  refresh: () => Promise<void>;
  setReviewed: (id: number, reviewed: boolean) => Promise<void>;
  setTestCardReviewed: (id: string, reviewed: boolean) => Promise<void>;
  createTestCard: (entry: TestDictionaryEntry) => Promise<TestDictionaryCard>;
  favorites: Record<string, boolean>;
  archived: Record<string, boolean>;
  toggleFavorite: (id: string) => void;
  toggleArchived: (id: string) => void;
  speechAccent: SpeechAccent;
  setSpeechAccent: (accent: SpeechAccent) => void;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => Promise<void>;
  saveReadingPosition: (bookId: string, chapter: number, offset: number, progress: number) => Promise<void>;
  pendingReadingPositions: number;
  readingPositionSyncError: boolean;
  retryReadingPositions: () => Promise<void>;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [books, setBooks] = useState<StudyBook[]>([]);
  const [preparedBooks, setPreparedBooks] = useState<PreparedBook[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncAttemptAt, setLastSyncAttemptAt] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [pendingReadingPositions, setPendingReadingPositions] = useState(0);
  const [readingPositionSyncError, setReadingPositionSyncError] = useState(false);
  const [testDictionaryEntries, setTestDictionaryEntries] = useState<TestDictionaryEntry[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState<Record<string, boolean>>({});
  const [speechAccent, setSpeechAccent] = useState<SpeechAccent>('en-US');
  const [preferences, setPreferencesState] = useState<Preferences>(defaults);
  const [cardPreferencesHydrated, setCardPreferencesHydrated] = useState(false);

  const refresh = async () => {
    const items = await getCards();
    setCards(items);
    setBooks(await getBooks());
    setPreparedBooks(await getPreparedBooks());
    setTestDictionaryEntries(await getTestDictionaryEntries());
  };

  useEffect(() => {
    void (async () => {
      await initialiseStudyDb();
      await refresh();
       try {
        const savedPreferences = parseCardPreferences(await AsyncStorage.getItem(CARD_PREFERENCES_KEY));
        const savedSettingsJson = await AsyncStorage.getItem('leitor-inteligente-settings');
        const savedSettings = await getPreferences();
        setPreferencesState(savedSettings);
        setFavorites(savedPreferences.favorites);
        setArchived(savedPreferences.archived);
        if (savedPreferences.speechAccent === 'en-US' || savedPreferences.speechAccent === 'en-GB') {
          setSpeechAccent(savedPreferences.speechAccent);
        }
        if (savedSettingsJson && (savedSettings.speechAccent === 'en-US' || savedSettings.speechAccent === 'en-GB')) setSpeechAccent(savedSettings.speechAccent);
      } catch {
        // A missing preferences history must not prevent the local library from opening.
      } finally {
        setCardPreferencesHydrated(true);
      }
      let storedLastSuccessAt: string | null = null;
      try {
        const savedMetadata = await AsyncStorage.getItem(SYNC_METADATA_KEY);
        if (savedMetadata) {
          const metadata = JSON.parse(savedMetadata) as Partial<SyncMetadata>;
          setLastSyncAttemptAt(typeof metadata.lastAttemptAt === 'string' ? metadata.lastAttemptAt : null);
          storedLastSuccessAt = typeof metadata.lastSuccessAt === 'string' ? metadata.lastSuccessAt : null;
          setLastSyncAt(storedLastSuccessAt);
        }
      } catch {
        // A missing sync history must not prevent the local dictionary from opening.
      }
      setSyncing(true);
      const attemptAt = new Date().toISOString();
      setLastSyncAttemptAt(attemptAt);
      void AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify({
        lastAttemptAt: attemptAt,
        lastSuccessAt: storedLastSuccessAt,
      } satisfies SyncMetadata));
      try {
        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? (domain ? `https://${domain}` : '');
        if (!baseUrl) throw new Error('API URL is not configured');
        const apiBase = baseUrl.replace(/\/+$/, '');
        const pendingPositions = await getPendingReadingPositions();
         setPendingReadingPositions(pendingPositions.length);
         await syncPendingReadingPositions(pendingPositions, async (position) => {
           const response = await fetch(`${apiBase}/api/books/${encodeURIComponent(position.bookId)}/reading-position`, {
             method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(position), signal: AbortSignal.timeout(10000),
           });
           return response.ok;
         }, async (position) => {
           await removePendingReadingPosition(position.bookId, position.updatedAt);
           setPendingReadingPositions((current) => Math.max(0, current - 1));
         });
        const response = await fetch(`${apiBase}/api/study/sync`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Study sync failed: ${response.status}`);
        const payload = await response.json() as { books: PreparedBook[] };
        if (!Array.isArray(payload.books)) throw new Error('Invalid study sync payload');
        await savePreparedBooks(payload.books.filter((book) => book.status === 'READY'));
        const dictionaryResponse = await fetch(`${apiBase}/api/test-dictionary/sync`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!dictionaryResponse.ok) throw new Error(`Test dictionary sync failed: ${dictionaryResponse.status}`);
        const dictionaryPayload = await dictionaryResponse.json() as TestDictionaryEntry[];
        if (!Array.isArray(dictionaryPayload)) throw new Error('Invalid test dictionary sync payload');
        await saveTestDictionaryEntries(dictionaryPayload);
        await refresh();
        setSyncError(false);
        const successAt = new Date().toISOString();
        setLastSyncAt(successAt);
        await AsyncStorage.setItem(SYNC_METADATA_KEY, JSON.stringify({
          lastAttemptAt: attemptAt,
          lastSuccessAt: successAt,
        } satisfies SyncMetadata));
      } catch {
        setSyncError(true);
         setReadingPositionSyncError(true);
      } finally {
        setSyncing(false);
      }
      setReady(true);
    })();
  }, []);

  const retryReadingPositions = async () => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? (domain ? `https://${domain}` : '');
    if (!baseUrl) {
      setReadingPositionSyncError(true);
      return;
    }
    const apiBase = baseUrl.replace(/\/+$/, '');
    const pendingPositions = await getPendingReadingPositions();
    setPendingReadingPositions(pendingPositions.length);
    try {
      await syncPendingReadingPositions(pendingPositions, async (position) => {
        const response = await fetch(`${apiBase}/api/books/${encodeURIComponent(position.bookId)}/reading-position`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(position), signal: AbortSignal.timeout(10000),
        });
        return response.ok;
      }, async (position) => {
        await removePendingReadingPosition(position.bookId, position.updatedAt);
        setPendingReadingPositions((current) => Math.max(0, current - 1));
      });
      setReadingPositionSyncError(false);
    } catch {
      setReadingPositionSyncError(true);
    }
  };

  useEffect(() => {
    if (!cardPreferencesHydrated) return;
    void AsyncStorage.setItem(CARD_PREFERENCES_KEY, JSON.stringify({ favorites, archived, speechAccent } satisfies CardPreferences));
  }, [favorites, archived, speechAccent, cardPreferencesHydrated]);

  const setPreferences = async (next: Preferences) => {
    await savePreferences(next);
    setPreferencesState(next);
    setSpeechAccent(next.speechAccent);
  };

  const value = useMemo(() => ({
    cards, books, preparedBooks, testDictionaryEntries, ready, syncing, syncError, lastSyncAttemptAt, lastSyncAt, pendingReadingPositions, readingPositionSyncError, retryReadingPositions, refresh,
    setReviewed: async (id: number, reviewed: boolean) => {
      await toggleCard(id, reviewed);
      setCards((current) => current.map((card) => card.id === id ? { ...card, reviewed: reviewed ? 1 : 0 } : card));
    },
    setTestCardReviewed: async (id: string, reviewed: boolean) => {
      await toggleTestDictionaryCard(id, reviewed);
      setTestDictionaryEntries((current) => current.map((entry) => ({
        ...entry,
        cards: entry.cards.map((card) => card.id === id ? { ...card, reviewed: reviewed ? 1 : 0 } : card),
      })));
    },
    createTestCard: async (entry: TestDictionaryEntry) => {
      const card = await createTestDictionaryCard(entry);
      setTestDictionaryEntries((current) => current.map((item) => item.id === entry.id && !item.cards.some((saved) => saved.id === card.id) ? { ...item, cards: [card, ...item.cards] } : item));
      return card;
    },
    favorites, archived,
    toggleFavorite: (id: string) => setFavorites((current) => ({ ...current, [id]: !current[id] })),
    toggleArchived: (id: string) => setArchived((current) => ({ ...current, [id]: !current[id] })),
    speechAccent,
    setSpeechAccent,
    preferences,
    setPreferences,
    saveReadingPosition: async (bookId: string, chapter: number, offset: number, progress: number) => {
      await updateReadingPosition(bookId, chapter, offset, progress);
      setBooks((current) => current.map((book) => book.id === bookId ? { ...book, readingChapter: chapter, readingOffset: offset, progress } : book));
      setPreparedBooks((current) => current.map((book) => book.id === bookId ? { ...book, readingChapter: chapter, readingOffset: offset, progress } : book));
    },
  }), [cards, books, preparedBooks, testDictionaryEntries, ready, syncing, syncError, lastSyncAttemptAt, lastSyncAt, favorites, archived, speechAccent, preferences]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used inside StudyProvider');
  return context;
}