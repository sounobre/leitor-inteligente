import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

export type LocalEpubChapter = { id: string; title: string; content: string };
export type LocalEpubBook = { id: string; title: string; fileName: string; chapters: LocalEpubChapter[]; chapter: number; updatedAt: string };
const STORAGE_KEY = 'leitor-inteligente:local-epubs';

export async function pickAndReadEpub(): Promise<LocalEpubBook | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/epub+zip', copyToCacheDirectory: true });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path=["']([^"']+)["']/i)?.[1] ?? 'OEBPS/content.opf';
  const opf = await zip.file(opfPath)?.async('string');
  if (!opf) throw new Error('Este arquivo não contém um pacote EPUB válido.');
  const basePath = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const manifest = new Map<string, string>();
  for (const match of opf.matchAll(/<item\b[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) manifest.set(match[1], resolveZipPath(basePath, match[2]));
  const chapters: LocalEpubChapter[] = [];
  for (const match of opf.matchAll(/<itemref\b[^>]*idref=["']([^"']+)["'][^>]*>/gi)) {
    const path = manifest.get(match[1]);
    const html = path ? await zip.file(path)?.async('string') : undefined;
    if (!html) continue;
    const content = htmlToText(html);
    if (content) chapters.push({ id: `${asset.name}-${chapters.length}`, title: firstHeading(html) || `Capítulo ${chapters.length + 1}`, content });
  }
  if (!chapters.length) throw new Error('Não encontrei capítulos legíveis neste EPUB.');
  const books = await getLocalEpubs();
  const existing = books.find((book) => book.fileName === asset.name);
  const book: LocalEpubBook = { id: existing?.id ?? `local-${Date.now()}`, title: asset.name.replace(/\.epub$/i, ''), fileName: asset.name, chapters, chapter: existing?.chapter ?? 0, updatedAt: new Date().toISOString() };
  await saveLocalEpubs([book, ...books.filter((item) => item.id !== book.id)]);
  return book;
}

export async function getLocalEpubs(): Promise<LocalEpubBook[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { const books = JSON.parse(raw) as LocalEpubBook[]; return Array.isArray(books) ? books : []; } catch { return []; }
}
export async function saveLocalEpubs(books: LocalEpubBook[]) { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(books)); }
export async function saveLocalEpubChapter(id: string, chapter: number) {
  const books = await getLocalEpubs();
  await saveLocalEpubs(books.map((book) => book.id === id ? { ...book, chapter, updatedAt: new Date().toISOString() } : book));
}
function resolveZipPath(base: string, href: string) { return `${base}${decodeURIComponent(href.split('#')[0])}`.replace(/\/\.\//g, '/').replace(/[^/]+\/\.\.\//g, ''); }
function htmlToText(html: string) { return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|section|article)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/[ \t\r]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim(); }
function firstHeading(html: string) { return html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''; }