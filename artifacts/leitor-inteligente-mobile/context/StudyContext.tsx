import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getBooks, getCards, getPreparedBooks, initialiseStudyDb, PreparedBook, savePreparedBooks, StudyBook, StudyCard, toggleCard } from '@/lib/study-db';

type StudyContextValue = {
  cards: StudyCard[];
  books: StudyBook[];
  preparedBooks: PreparedBook[];
  ready: boolean;
  syncing: boolean;
  syncError: boolean;
  refresh: () => Promise<void>;
  setReviewed: (id: number, reviewed: boolean) => Promise<void>;
};

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [books, setBooks] = useState<StudyBook[]>([]);
  const [preparedBooks, setPreparedBooks] = useState<PreparedBook[]>([]);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const refresh = async () => {
    const items = await getCards();
    setCards(items);
    setBooks(await getBooks());
    setPreparedBooks(await getPreparedBooks());
  };

  useEffect(() => {
    void (async () => {
      await initialiseStudyDb();
      await refresh();
      setSyncing(true);
      try {
        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? (domain ? `https://${domain}` : '');
        if (!baseUrl) throw new Error('API URL is not configured');
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/study/sync`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`Study sync failed: ${response.status}`);
        const payload = await response.json() as { books: PreparedBook[] };
        if (!Array.isArray(payload.books)) throw new Error('Invalid study sync payload');
        await savePreparedBooks(payload.books.filter((book) => book.status === 'READY'));
        await refresh();
        setSyncError(false);
      } catch {
        setSyncError(true);
      } finally {
        setSyncing(false);
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo(() => ({
    cards, books, preparedBooks, ready, syncing, syncError, refresh,
    setReviewed: async (id: number, reviewed: boolean) => {
      await toggleCard(id, reviewed);
      setCards((current) => current.map((card) => card.id === id ? { ...card, reviewed: reviewed ? 1 : 0 } : card));
    },
  }), [cards, books, preparedBooks, ready, syncing, syncError]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used inside StudyProvider');
  return context;
}