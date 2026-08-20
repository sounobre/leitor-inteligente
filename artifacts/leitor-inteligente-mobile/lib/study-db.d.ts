export type Deck = 'vocabulary' | 'idioms' | 'phrasal';
export type StudyCard = {
  id: number;
  bookId: string;
  deck: Deck;
  term: string;
  translation: string;
  example: string;
  pronunciation: string;
  difficulty: string;
  reviewed: number;
};
export type StudyBook = { id: string; title: string; author: string; sourceType: string; status: string; level: string; progress: number; coverColor: string; updatedAt: string };
export type StudyPlanItem = { term: string; meaning: string; example: string; pronunciation: string; difficulty: string };
export type PreparedBook = StudyBook & { plan: { vocabulary: StudyPlanItem[]; idioms: StudyPlanItem[]; phrasalVerbs: StudyPlanItem[] } };

export function initialiseStudyDb(): Promise<void>;
export function getCards(): Promise<StudyCard[]>;
export function getBooks(): Promise<StudyBook[]>;
export function savePreparedBooks(books: PreparedBook[]): Promise<void>;
export function toggleCard(id: number, reviewed: boolean): Promise<void>;