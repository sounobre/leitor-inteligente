export type Deck = 'vocabulary' | 'idioms' | 'phrasal' | 'visual';
export type StudyCard = {
  id: number;
  bookId: string;
  deck: Deck;
  term: string;
  translation: string;
  example: string;
  pronunciation: string;
  difficulty: string;
  visualCue: string;
  technique: string;
  reviewed: number;
};
export type StudyBook = { id: string; title: string; author: string; sourceType: string; status: string; level: string; progress: number; readingChapter: number; readingOffset: number; coverColor: string; updatedAt: string };
export type ReadingChapter = { id: string; position: number; title: string; content: string; wordCount: number };
export type StudyPlanItem = {
  term: string; meaning: string; example: string; pronunciation: string; difficulty: string;
  overview?: string; frequency?: string; background?: string; related?: string[];
};
export type VisualStudyCard = StudyPlanItem & { visualCue: string; technique: string };
export type LinguisticDeck = { id: string; title: string; purpose: string; items: StudyPlanItem[] };
export type SemanticNode = { id: string; label: string; description: string };
export type SemanticConnection = { fromId: string; toId: string; relationship: string };
export type StudyPlan = { vocabulary: StudyPlanItem[]; idioms: StudyPlanItem[]; phrasalVerbs: StudyPlanItem[]; visualCards: VisualStudyCard[]; linguisticDecks: LinguisticDeck[]; semanticMap: { nodes: SemanticNode[]; connections: SemanticConnection[] } };
export type PreparedBook = StudyBook & { plan: StudyPlan; chapters: ReadingChapter[] };
export type ReadingPositionChange = { bookId: string; chapter: number; offset: number; progress: number; updatedAt: string };

export function initialiseStudyDb(): Promise<void>;
export function getCards(): Promise<StudyCard[]>;
export function getBooks(): Promise<StudyBook[]>;
export function getPreparedBooks(): Promise<PreparedBook[]>;
export function savePreparedBooks(books: PreparedBook[]): Promise<void>;
export function toggleCard(id: number, reviewed: boolean): Promise<void>;
export function updateReadingPosition(bookId: string, chapter: number, offset: number, progress: number): Promise<void>;
export function getPendingReadingPositions(): Promise<ReadingPositionChange[]>;
export function removePendingReadingPosition(bookId: string, updatedAt: string): Promise<void>;