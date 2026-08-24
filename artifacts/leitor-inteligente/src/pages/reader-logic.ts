export type ReaderPosition = {
  chapter: number;
  offset: number;
  progress: number;
};

export async function loadReaderBook<T>(bookId: string, request: typeof fetch = fetch): Promise<T> {
  const response = await request(`/api/books/${encodeURIComponent(bookId)}`);
  if (!response.ok) throw new Error('Livro indisponível');
  return response.json() as Promise<T>;
}

export function getInitialChapterIndex(readingChapter: number | undefined, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.min(chapterCount - 1, Math.max(0, (readingChapter || 1) - 1));
}

export function getRestoredOffset(
  readingChapter: number | undefined,
  readingOffset: number | undefined,
  chapterIndex: number,
  wordCount: number,
): number {
  const savedChapterIndex = getInitialChapterIndex(readingChapter, Number.MAX_SAFE_INTEGER);
  return chapterIndex === savedChapterIndex
    ? Math.min(Math.max(0, readingOffset || 0), Math.max(0, wordCount - 1))
    : 0;
}

export function getChapterProgress(chapterIndex: number, offset: number, wordCount: number, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.round(((chapterIndex + offset / Math.max(1, wordCount)) / chapterCount) * 100);
}

export function clampChapter(chapterIndex: number, chapterCount: number): number {
  return Math.min(Math.max(0, chapterIndex), Math.max(0, chapterCount - 1));
}