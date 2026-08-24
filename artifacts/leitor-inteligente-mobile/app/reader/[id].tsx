import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { clampChapter, getChapterProgress, getInitialChapterIndex, getReadingOffset } from '@/lib/reader-logic';

export default function ReaderScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { preparedBooks, saveReadingPosition, pendingReadingPositions, readingPositionSyncError, retryReadingPositions } = useStudy();
  const book = preparedBooks.find((item) => item.id === id);
  const [chapterIndex, setChapterIndex] = useState(() => getInitialChapterIndex(book?.readingChapter, book?.chapters.length ?? 0));
  const [readingOffset, setReadingOffset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const wordPositions = useRef<Record<number, number>>({});
  const proseTop = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPosition = useRef<{ chapter: number; offset: number; progress: number } | null>(null);
  const initializedBook = useRef<string | null>(null);
  const chapter = book?.chapters?.[chapterIndex];
  const words = useMemo(() => chapter?.content?.trim().split(/\s+/).filter(Boolean) ?? [], [chapter]);
  useEffect(() => {
    if (book && initializedBook.current !== book.id) {
      initializedBook.current = book.id;
      const initialChapter = getInitialChapterIndex(book.readingChapter, book.chapters.length);
      setChapterIndex(initialChapter);
      setReadingOffset(getReadingOffset(book.readingOffset, book.chapters[initialChapter]?.wordCount ?? 0));
    }
  }, [book]);
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (book && pendingPosition.current) {
      const position = pendingPosition.current;
      void saveReadingPosition(book.id, position.chapter, position.offset, position.progress);
    }
  }, [book, saveReadingPosition]);
  if (!book || !chapter) return <View style={[styles.empty, { backgroundColor: colors.background }]}><Stack.Screen options={{ title: 'Leitura' }} /><Feather name="book-open" size={28} color={colors.mutedForeground}/><Text style={[styles.emptyText, { color: colors.foreground }]}>Este livro ainda não foi sincronizado para leitura offline.</Text></View>;
  const persist = (offset: number, immediate = false, targetChapterIndex = chapterIndex) => {
    const progress = getChapterProgress(targetChapterIndex, offset, words.length, book.chapters.length);
    pendingPosition.current = { chapter: chapterIndex + 1, offset, progress };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const save = () => {
      const position = pendingPosition.current;
      if (position) void saveReadingPosition(book.id, position.chapter, position.offset, position.progress);
    };
    if (immediate) save(); else saveTimer.current = setTimeout(save, 450);
  };
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    let offset = 0;
    for (let index = 0; index < words.length; index += 1) {
      if ((wordPositions.current[index] ?? Number.POSITIVE_INFINITY) + proseTop.current <= y + 40) offset = index;
      else break;
    }
    if (offset !== readingOffset) { setReadingOffset(offset); persist(offset); }
  };
  const restore = () => {
    const offset = Math.min(readingOffset, Math.max(0, words.length - 1));
    const y = Math.max(0, proseTop.current + (wordPositions.current[offset] ?? 0) - 20);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  };
  const move = (next: number) => { const index = clampChapter(next, book.chapters.length); setChapterIndex(index); setReadingOffset(0); persist(0, true, index); requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false })); };
   return <View style={[styles.screen, { backgroundColor: colors.background }]}><Stack.Screen options={{ title: book.title }} /><ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={200} onContentSizeChange={restore} contentContainerStyle={styles.container}><Text style={[styles.eyebrow, { color: colors.primary }]}>LEITURA OFFLINE</Text><Text style={[styles.title, { color: colors.foreground }]}>{chapter.title || `Capítulo ${chapterIndex + 1}`}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{chapterIndex + 1} de {book.chapters.length} · {book.progress}% concluído</Text>{readingPositionSyncError && pendingReadingPositions > 0 && <View style={[styles.saveWarning, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive }]}><Text style={[styles.warningText, { color: colors.destructive }]}>A posição não foi enviada ({pendingReadingPositions} pendente{pendingReadingPositions === 1 ? '' : 's'}).</Text><Pressable onPress={() => void retryReadingPositions} style={[styles.retryButton, { borderColor: colors.destructive }]}><Feather name="refresh-cw" size={14} color={colors.destructive}/><Text style={{ color: colors.destructive }}>Tentar novamente</Text></Pressable></View>}<View style={styles.prose} onLayout={(event: LayoutChangeEvent) => { proseTop.current = event.nativeEvent.layout.y; }}><View style={styles.wordFlow}>{words.map((word, index) => <Text key={`${index}-${word}`} onLayout={(event) => { wordPositions.current[index] = event.nativeEvent.layout.y; }} style={[styles.word, { color: colors.foreground }]}>{word} </Text>)}</View></View><View style={styles.controls}><Pressable disabled={chapterIndex === 0} onPress={() => move(chapterIndex - 1)} style={[styles.button, { borderColor: colors.border, opacity: chapterIndex === 0 ? .4 : 1 }]}><Feather name="chevron-left" size={18} color={colors.foreground}/><Text style={{ color: colors.foreground }}>Anterior</Text></Pressable><Pressable disabled={chapterIndex === book.chapters.length - 1} onPress={() => move(chapterIndex + 1)} style={[styles.button, { backgroundColor: colors.primary, opacity: chapterIndex === book.chapters.length - 1 ? .4 : 1 }]}><Text style={{ color: colors.primaryForeground }}>Próximo</Text><Feather name="chevron-right" size={18} color={colors.primaryForeground}/></Pressable></View></ScrollView></View>;
}
  const styles = StyleSheet.create({ screen: { flex: 1 }, container: { padding: 22, paddingBottom: 50 }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginTop: 12 }, title: { fontFamily: 'Inter_700Bold', fontSize: 28, marginTop: 8 }, meta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 7 }, saveWarning: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 18, gap: 10 }, warningText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 }, retryButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6 }, prose: { marginTop: 30 }, wordFlow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 }, word: { fontFamily: 'Inter_400Regular', fontSize: 18, lineHeight: 31 }, controls: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 35, gap: 12 }, button: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 5 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25, gap: 15 }, emptyText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' } });