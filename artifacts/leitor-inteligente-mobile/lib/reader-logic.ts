export function getInitialChapterIndex(readingChapter: number | undefined, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.min(chapterCount - 1, Math.max(0, (readingChapter ?? 1) - 1));
}

export function getReadingOffset(readingOffset: number | undefined, wordCount: number): number {
  return Math.min(Math.max(0, readingOffset ?? 0), Math.max(0, wordCount - 1));
}

export function getChapterProgress(chapterIndex: number, offset: number, wordCount: number, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.round(((chapterIndex + offset / Math.max(1, wordCount)) / chapterCount) * 100);
}

export function clampChapter(chapterIndex: number, chapterCount: number): number {
  return Math.min(Math.max(0, chapterIndex), Math.max(0, chapterCount - 1));
}