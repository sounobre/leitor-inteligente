import * as SQLite from 'expo-sqlite';

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
export type StudyBook = {
  id: string; title: string; author: string; sourceType: string; status: string;
  level: string; progress: number; coverColor: string; updatedAt: string;
};
export type StudyPlanItem = { term: string; meaning: string; example: string; pronunciation: string; difficulty: string };
export type PreparedBook = StudyBook & {
  plan: { vocabulary: StudyPlanItem[]; idioms: StudyPlanItem[]; phrasalVerbs: StudyPlanItem[] };
};

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
      progress INTEGER NOT NULL DEFAULT 0, cover_color TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT, book_id TEXT NOT NULL REFERENCES study_books(id) ON DELETE CASCADE,
      remote_id TEXT NOT NULL, deck TEXT NOT NULL, term TEXT NOT NULL, translation TEXT NOT NULL,
      example TEXT NOT NULL, pronunciation TEXT NOT NULL, difficulty TEXT NOT NULL,
      reviewed INTEGER NOT NULL DEFAULT 0, UNIQUE(book_id, remote_id)
    );
  `);
  // Upgrade the prototype table, which had sample cards but no book identity.
  // Those rows are removed below instead of being presented as prepared books.
  await db.runAsync('ALTER TABLE study_cards ADD COLUMN book_id TEXT').catch(() => {});
  await db.runAsync('ALTER TABLE study_cards ADD COLUMN remote_id TEXT').catch(() => {});
  await db.runAsync('DELETE FROM study_cards WHERE book_id IS NULL OR remote_id IS NULL');
  await db.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS study_cards_book_remote_idx ON study_cards(book_id, remote_id);');
}

export async function getCards() {
  const db = await getDb();
  return db.getAllAsync<StudyCard>('SELECT id, book_id AS bookId, deck, term, translation, example, pronunciation, difficulty, reviewed FROM study_cards ORDER BY reviewed ASC, id ASC');
}

export async function getBooks() {
  const db = await getDb();
  return db.getAllAsync<StudyBook>('SELECT id, title, author, source_type AS sourceType, status, level, progress, cover_color AS coverColor, updated_at AS updatedAt FROM study_books ORDER BY updated_at DESC');
}

export async function savePreparedBooks(books: PreparedBook[]) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const book of books) {
      await db.runAsync(
        `INSERT INTO study_books (id, title, author, source_type, status, level, progress, cover_color, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, author=excluded.author,
         source_type=excluded.source_type, status=excluded.status, level=excluded.level,
         progress=excluded.progress, cover_color=excluded.cover_color, updated_at=excluded.updated_at`,
        book.id, book.title, book.author, book.sourceType, book.status, book.level,
        book.progress, book.coverColor, book.updatedAt,
      );
      const cards = [
        ...book.plan.vocabulary.map((item) => ({ deck: 'vocabulary' as Deck, item })),
        ...book.plan.idioms.map((item) => ({ deck: 'idioms' as Deck, item })),
        ...book.plan.phrasalVerbs.map((item) => ({ deck: 'phrasal' as Deck, item })),
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
          `INSERT INTO study_cards (book_id, remote_id, deck, term, translation, example, pronunciation, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(book_id, remote_id) DO UPDATE SET deck=excluded.deck, term=excluded.term,
           translation=excluded.translation, example=excluded.example, pronunciation=excluded.pronunciation,
           difficulty=excluded.difficulty`,
          book.id, `${deck}:${item.term}`, deck, item.term, item.meaning, item.example,
          item.pronunciation, item.difficulty,
        );
      }
    }
  });
}

export async function toggleCard(id: number, reviewed: boolean) {
  const db = await getDb();
  await db.runAsync('UPDATE study_cards SET reviewed = ? WHERE id = ?', reviewed ? 1 : 0, id);
}