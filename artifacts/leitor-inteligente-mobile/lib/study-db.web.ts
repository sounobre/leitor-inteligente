export type Deck = 'vocabulary' | 'idioms' | 'phrasal';
export type StudyCard = {
  id: number; bookId: string; deck: Deck; term: string; translation: string;
  example: string; pronunciation: string; difficulty: string; reviewed: number;
};
export type StudyBook = {
  id: string; title: string; author: string; sourceType: string; status: string;
  level: string; progress: number; coverColor: string; updatedAt: string;
};
export type StudyPlanItem = { term: string; meaning: string; example: string; pronunciation: string; difficulty: string };
export type PreparedBook = StudyBook & {
  plan: { vocabulary: StudyPlanItem[]; idioms: StudyPlanItem[]; phrasalVerbs: StudyPlanItem[] };
};

let cards: StudyCard[] = [];
let books: StudyBook[] = [];
export async function initialiseStudyDb() {}
export async function getCards() { return cards; }
export async function getBooks() { return books; }
export async function savePreparedBooks(prepared: PreparedBook[]) {
  books = prepared.map(({ plan: _plan, ...book }) => book);
  cards = prepared.flatMap((book) => [
    ...book.plan.vocabulary.map((item, index) => ({ ...item, id: index + 1, bookId: book.id, deck: 'vocabulary' as const, translation: item.meaning, reviewed: 0 })),
    ...book.plan.idioms.map((item, index) => ({ ...item, id: index + 1001, bookId: book.id, deck: 'idioms' as const, translation: item.meaning, reviewed: 0 })),
    ...book.plan.phrasalVerbs.map((item, index) => ({ ...item, id: index + 2001, bookId: book.id, deck: 'phrasal' as const, translation: item.meaning, reviewed: 0 })),
  ]);
}
export async function toggleCard(id: number, reviewed: boolean) {
  cards = cards.map((card) => card.id === id ? { ...card, reviewed: reviewed ? 1 : 0 } : card);
}