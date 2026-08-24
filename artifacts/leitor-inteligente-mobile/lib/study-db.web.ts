import AsyncStorage from '@react-native-async-storage/async-storage';

export type Deck = 'vocabulary' | 'idioms' | 'phrasal' | 'visual';
export type StudyCard = {
  id: number; bookId: string; deck: Deck; term: string; translation: string;
  example: string; pronunciation: string; difficulty: string; visualCue: string; technique: string; reviewed: number;
};
export type StudyBook = {
  id: string; title: string; author: string; sourceType: string; status: string;
  level: string; progress: number; readingChapter: number; readingOffset: number; coverColor: string; updatedAt: string;
};
export type ReadingChapter = { id: string; position: number; title: string; content: string; wordCount: number };
export type StudyPlanItem = {
  term: string; meaning: string; example: string; pronunciation: string; difficulty: string;
  overview?: string; frequency?: string; background?: string; related?: string[];
};
export type VisualStudyCard = StudyPlanItem & { visualCue: string; technique: string };
export type LinguisticDeck = { id: string; title: string; purpose: string; items: StudyPlanItem[] };
export type SemanticNode = { id: string; label: string; description: string };
export type SemanticConnection = { fromId: string; toId: string; relationship: string };
export type StudyPlan = {
  vocabulary: StudyPlanItem[];
  idioms: StudyPlanItem[];
  phrasalVerbs: StudyPlanItem[];
  visualCards: VisualStudyCard[];
  linguisticDecks: LinguisticDeck[];
  semanticMap: { nodes: SemanticNode[]; connections: SemanticConnection[] };
};
export type PreparedBook = StudyBook & {
  plan: StudyPlan;
  chapters: ReadingChapter[];
};
export type ReadingPositionChange = { bookId: string; chapter: number; offset: number; progress: number; updatedAt: string };

let cards: StudyCard[] = [];
let books: StudyBook[] = [];
let preparedBooks: PreparedBook[] = [];
const READING_POSITION_QUEUE_KEY = 'leitor-inteligente:reading-position-queue';
let databaseLoaded = false;
let readingPositionQueue: ReadingPositionChange[] = [];

export async function initialiseStudyDb() {
  if (databaseLoaded) return;
  const queued = await AsyncStorage.getItem(READING_POSITION_QUEUE_KEY);
  if (queued) {
    try {
      const parsed = JSON.parse(queued);
      readingPositionQueue = Array.isArray(parsed) ? parsed : [];
    } catch {
      readingPositionQueue = [];
    }
  }
  databaseLoaded = true;
}
export async function getCards() { return cards; }
export async function getBooks() { return books; }
export async function getPreparedBooks() { return preparedBooks; }
export async function savePreparedBooks(prepared: PreparedBook[]) {
  preparedBooks = prepared.map((book) => ({ ...book, plan: normalizePlan(book.plan) }));
  books = preparedBooks.map(({ plan: _plan, ...book }) => book);
  cards = preparedBooks.flatMap((book) => [
    ...book.plan.vocabulary.map((item, index) => ({ ...item, id: index + 1, bookId: book.id, deck: 'vocabulary' as const, translation: item.meaning, visualCue: '', technique: '', reviewed: 0 })),
    ...book.plan.idioms.map((item, index) => ({ ...item, id: index + 1001, bookId: book.id, deck: 'idioms' as const, translation: item.meaning, visualCue: '', technique: '', reviewed: 0 })),
    ...book.plan.phrasalVerbs.map((item, index) => ({ ...item, id: index + 2001, bookId: book.id, deck: 'phrasal' as const, translation: item.meaning, visualCue: '', technique: '', reviewed: 0 })),
    ...book.plan.visualCards.map((item, index) => ({ ...item, id: index + 3001, bookId: book.id, deck: 'visual' as const, translation: item.meaning, reviewed: 0 })),
  ]);
}
export async function updateReadingPosition(bookId: string, chapter: number, offset: number, progress: number) {
  const change: ReadingPositionChange = { bookId, chapter, offset, progress, updatedAt: new Date().toISOString() };
  preparedBooks = preparedBooks.map((book) => book.id === bookId ? { ...book, readingChapter: chapter, readingOffset: offset, progress } : book);
  books = preparedBooks.map(({ plan: _plan, chapters: _chapters, ...book }) => book);
  const previous = readingPositionQueue.find((item) => item.bookId === bookId);
  if (!previous || previous.updatedAt <= change.updatedAt) {
    readingPositionQueue = [...readingPositionQueue.filter((item) => item.bookId !== bookId), change];
    await AsyncStorage.setItem(READING_POSITION_QUEUE_KEY, JSON.stringify(readingPositionQueue));
  }
}

export async function getPendingReadingPositions(): Promise<ReadingPositionChange[]> {
  return [...readingPositionQueue].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export async function removePendingReadingPosition(bookId: string, updatedAt: string) {
  readingPositionQueue = readingPositionQueue.filter((item) => !(item.bookId === bookId && item.updatedAt === updatedAt));
  await AsyncStorage.setItem(READING_POSITION_QUEUE_KEY, JSON.stringify(readingPositionQueue));
}

function normalizePlan(plan: Partial<StudyPlan>): StudyPlan {
  return {
    vocabulary: plan.vocabulary ?? [],
    idioms: plan.idioms ?? [],
    phrasalVerbs: plan.phrasalVerbs ?? [],
    visualCards: plan.visualCards ?? [],
    linguisticDecks: plan.linguisticDecks ?? [],
    semanticMap: {
      nodes: plan.semanticMap?.nodes ?? [],
      connections: plan.semanticMap?.connections ?? [],
    },
  };
}
export async function toggleCard(id: number, reviewed: boolean) {
  cards = cards.map((card) => card.id === id ? { ...card, reviewed: reviewed ? 1 : 0 } : card);
}