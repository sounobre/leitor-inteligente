import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { getLocalEpubs, LocalEpubBook, saveLocalEpubChapter } from '@/lib/local-epub';

export default function LocalReaderScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<LocalEpubBook | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  useEffect(() => { void getLocalEpubs().then((books) => { const found = books.find((item) => item.id === id) ?? null; setBook(found); setChapterIndex(found?.chapter ?? 0); }); }, [id]);
  const chapter = book?.chapters[chapterIndex];
  const words = useMemo(() => chapter?.content.split(/\s+/).filter(Boolean) ?? [], [chapter]);
  if (!book || !chapter) return <View style={[styles.empty, { backgroundColor: colors.background }]}><Stack.Screen options={{ title: 'Leitor EPUB' }} /><Feather name="book-open" size={28} color={colors.mutedForeground}/><Text style={[styles.emptyText, { color: colors.foreground }]}>Não foi possível abrir este EPUB.</Text></View>;
  const move = (next: number) => { const index = Math.max(0, Math.min(book.chapters.length - 1, next)); setChapterIndex(index); void saveLocalEpubChapter(book.id, index); };
  return <View style={[styles.screen, { backgroundColor: colors.background }]}><Stack.Screen options={{ title: book.title }} /><ScrollView contentContainerStyle={styles.container}><Text style={[styles.eyebrow, { color: colors.primary }]}>ARQUIVO DO CELULAR</Text><Text style={[styles.title, { color: colors.foreground }]}>{chapter.title}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{chapterIndex + 1} de {book.chapters.length} · {book.fileName}</Text><Text style={[styles.prose, { color: colors.foreground }]}>{words.join(' ')}</Text><View style={styles.controls}><Pressable disabled={chapterIndex === 0} onPress={() => move(chapterIndex - 1)} style={[styles.button, { borderColor: colors.border, opacity: chapterIndex === 0 ? .4 : 1 }]}><Feather name="chevron-left" size={18} color={colors.foreground}/><Text style={{ color: colors.foreground }}>Anterior</Text></Pressable><Pressable disabled={chapterIndex === book.chapters.length - 1} onPress={() => move(chapterIndex + 1)} style={[styles.button, { backgroundColor: colors.primary, opacity: chapterIndex === book.chapters.length - 1 ? .4 : 1 }]}><Text style={{ color: colors.primaryForeground }}>Próximo</Text><Feather name="chevron-right" size={18} color={colors.primaryForeground}/></Pressable></View></ScrollView></View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, container: { padding: 22, paddingBottom: 50 }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginTop: 12 }, title: { fontFamily: 'Inter_700Bold', fontSize: 28, marginTop: 8 }, meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 7 }, prose: { fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 31, marginTop: 30 }, controls: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 35, gap: 12 }, button: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 5 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25, gap: 15 }, emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' } });