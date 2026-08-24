import * as SQLite from 'expo-sqlite';

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

let database: SQLite.SQLiteDatabase | null = null;
async function getDb() {
  if (!database) database = await SQLite.openDatabaseAsync('leitor-inteligente.db');
  return database;
}

export async function initialiseStudyDb() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS study_books (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL,
      source_type TEXT NOT NULL, status TEXT NOT NULL, level TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0, cover_color TEXT NOT NULL, updated_at TEXT NOT NULL,
      plan_json TEXT NOT NULL DEFAULT '{}'
      ,chapters_json TEXT NOT NULL DEFAULT '[]', reading_chapter INTEGER NOT NULL DEFAULT 1, reading_offset INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS reading_position_queue (
      book_id TEXT PRIMARY KEY, chapter INTEGER NOT NULL, offset INTEGER NOT NULL,
      progress INTEGER NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, book_id TEXT NOT NULL REFERENCES study_books(id) ON DELETE CASCADE,
      remote_id TEXT NOT NULL, deck TEXT NOT NULL, term TEXT NOT NULL, translation TEXT NOT NULL,
      example TEXT NOT NULL, pronunciation TEXT NOT NULL, difficulty TEXT NOT NULL,
      visual_cue TEXT NOT NULL DEFAULT '', technique TEXT NOT NULL DEFAULT '',
      reviewed INTEGER NOT NULL DEFAULT 0, UNIQUE(book_id, remote_id)
    );
  `);
  // Upgrade the prototype table, which had sample cards but no book identity.
  // Those rows are removed below instead of being presented as prepared books.
  await db.runAsync('ALTER TABLE study_cards ADD COLUMN book_id TEXT').catch(() => {});
  await db.runAsync('ALTER TABLE study_cards ADD COLUMN remote_id TEXT').catch(() => {});
  await db.runAsync("ALTER TABLE study_books ADD COLUMN plan_json TEXT NOT NULL DEFAULT '{}'").catch(() => {});
  await db.runAsync("ALTER TABLE study_books ADD COLUMN chapters_json TEXT NOT NULL DEFAULT '[]'").catch(() => {});
  await db.runAsync("ALTER TABLE study_books ADD COLUMN reading_chapter INTEGER NOT NULL DEFAULT 1").catch(() => {});
  await db.runAsync("ALTER TABLE study_books ADD COLUMN reading_offset INTEGER NOT NULL DEFAULT 0").catch(() => {});
  await db.runAsync("ALTER TABLE study_cards ADD COLUMN visual_cue TEXT NOT NULL DEFAULT ''").catch(() => {});
  await db.runAsync("ALTER TABLE study_cards ADD COLUMN technique TEXT NOT NULL DEFAULT ''").catch(() => {});
  await db.runAsync('DELETE FROM study_cards WHERE book_id IS NULL OR remote_id IS NULL');
  await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS study_cards_book_remote_idx ON study_cards(book_id, remote_id);');
}


export async function getCards() {
  const db = await getDb();
  return db.getAllAsync<StudyCard>('SELECT id, book_id AS bookId, deck, term, translation, example, pronunciation, difficulty, visual_cue AS visualCue, technique, reviewed FROM study_cards ORDER BY reviewed ASC, id ASC');
}

export async function getBooks() {
  const db = await getDb();
  return db.getAllAsync<StudyBook>('SELECT id, title, author, source_type AS sourceType, status, level, progress, reading_chapter AS readingChapter, reading_offset AS readingOffset, cover_color AS coverColor, updated_at AS updatedAt FROM study_books ORDER BY updated_at DESC');
}

export async function getPreparedBooks() {
  const db = await getDb();
  const rows = await db.getAllAsync<StudyBook & { planJson: string; chaptersJson: string }>('SELECT id, title, author, source_type AS sourceType, status, level, progress, reading_chapter AS readingChapter, reading_offset AS readingOffset, cover_color AS coverColor, updated_at AS updatedAt, plan_json AS planJson, chapters_json AS chaptersJson FROM study_books ORDER BY updated_at DESC');
  return rows.map(({ planJson, chaptersJson, ...book }) => ({ ...book, plan: normalizePlan(parsePlan(planJson)), chapters: parseChapters(chaptersJson) }));
}

export async function savePreparedBooks(books: PreparedBook[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const book of books) {
      const plan = normalizePlan(book.plan);
      await db.runAsync(
        `INSERT INTO study_books (id, title, author, source_type, status, level, progress, reading_chapter, reading_offset, cover_color, updated_at, plan_json, chapters_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, author=excluded.author,
         source_type=excluded.source_type, status=excluded.status, level=excluded.level,
           progress=excluded.progress, reading_chapter=excluded.reading_chapter, reading_offset=excluded.reading_offset,
           cover_color=excluded.cover_color, updated_at=excluded.updated_at, plan_json=excluded.plan_json, chapters_json=excluded.chapters_json`,
        book.id, book.title, book.author, book.sourceType, book.status, book.level,
         book.progress, book.readingChapter ?? 1, book.readingOffset ?? 0, book.coverColor, book.updatedAt, JSON.stringify(plan), JSON.stringify(book.chapters ?? []),
      );
      const cards = [
        ...plan.vocabulary.map((item) => ({ deck: 'vocabulary' as Deck, item })),
        ...plan.idioms.map((item) => ({ deck: 'idioms' as Deck, item })),
        ...plan.phrasalVerbs.map((item) => ({ deck: 'phrasal' as Deck, item })),
        ...plan.visualCards.map((item) => ({ deck: 'visual' as Deck, item })),
      ];
      const remoteIds = cards.map(({ deck, item }) => `${deck}:${item.term}`);
      if (remoteIds.length === 0) {
        await db.runAsync('DELETE FROM study_cards WHERE book_id = ?', book.id);
      } else {
        const placeholders = remoteIds.map(() => '?').join(',');
        await db.runAsync(`DELETE FROM study_cards WHERE book_id = ? AND remote_id NOT IN (${placeholders})`, book.id, ...remoteIds);
      }
      for (const { deck, item } of cards) {
        await db.runAsync(
          `INSERT INTO study_cards (book_id, remote_id, deck, term, translation, example, pronunciation, difficulty, visual_cue, technique)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(book_id, remote_id) DO UPDATE SET deck=excluded.deck, term=excluded.term,
           translation=excluded.translation, example=excluded.example, pronunciation=excluded.pronunciation,
            difficulty=excluded.difficulty, visual_cue=excluded.visual_cue, technique=excluded.technique`,
          book.id, `${deck}:${item.term}`, deck, item.term, item.meaning, item.example,
           item.pronunciation, item.difficulty, (item as VisualStudyCard).visualCue ?? '', (item as VisualStudyCard).technique ?? '',
        );
      }
    }
  });
}
export async function updateReadingPosition(bookId: string, chapter: number, offset: number, progress: number) {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE study_books SET reading_chapter = ?, reading_offset = ?, progress = ? WHERE id = ?', chapter, offset, progress, bookId);
    await db.runAsync(
      `INSERT INTO reading_position_queue (book_id, chapter, offset, progress, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(book_id) DO UPDATE SET chapter=excluded.chapter, offset=excluded.offset,
       progress=excluded.progress, updated_at=excluded.updated_at
       WHERE excluded.updated_at >= reading_position_queue.updated_at`,
      bookId, chapter, offset, progress, updatedAt,
    );
  });
}

export async function getPendingReadingPositions(): Promise<ReadingPositionChange[]> {
  const db = await getDb();
  return db.getAllAsync<ReadingPositionChange>('SELECT book_id AS bookId, chapter, offset, progress, updated_at AS updatedAt FROM reading_position_queue ORDER BY updated_at ASC');
}

export async function removePendingReadingPosition(bookId: string, updatedAt: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM reading_position_queue WHERE book_id = ? AND updated_at = ?', bookId, updatedAt);
}

export async function toggleCard(id: number, reviewed: boolean) {
  const db = await getDb();
  await db.runAsync('UPDATE study_cards SET reviewed = ? WHERE id = ?', reviewed ? 1 : 0, id);
}

function parsePlan(value: string): Partial<StudyPlan> {
  try {
    return JSON.parse(value) as Partial<StudyPlan>;
  } catch {
    return {};
  }
}
function parseChapters(value: string): ReadingChapter[] { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }

function normalizePlan(plan: Partial<StudyPlan>): StudyPlan {
  return {
    vocabulary: Array.isArray(plan.vocabulary) ? plan.vocabulary : [],
    idioms: Array.isArray(plan.idioms) ? plan.idioms : [],
    phrasalVerbs: Array.isArray(plan.phrasalVerbs) ? plan.phrasalVerbs : [],
    visualCards: Array.isArray(plan.visualCards) ? plan.visualCards : [],
    linguisticDecks: Array.isArray(plan.linguisticDecks) ? plan.linguisticDecks : [],
    semanticMap: {
      nodes: Array.isArray(plan.semanticMap?.nodes) ? plan.semanticMap.nodes : [],
      connections: Array.isArray(plan.semanticMap?.connections) ? plan.semanticMap.connections : [],
    },
  };
}
