export type Deck = 'vocabulary' | 'idioms' | 'phrasal' | 'visual';
export type StudyCard = {
  id: number; bookId: string; deck: Deck; term: string; translation: string;
  example: string; pronunciation: string; difficulty: string; visualCue: string; technique: string; reviewed: number;
};
export type StudyBook = {
  id: string; title: string; author: string; sourceType: string; status: string;
  level: string; progress: number; coverColor: string; updatedAt: string;
};
export type StudyPlanItem = { term: string; meaning: string; example: string; pronunciation: string; difficulty: string };
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
};

let cards: StudyCard[] = [];
let books: StudyBook[] = [];
let preparedBooks: PreparedBook[] = [];
export async function initialiseStudyDb() {}
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