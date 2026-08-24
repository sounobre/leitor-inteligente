import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { Link } from 'expo-router';
import { router } from 'expo-router';
import { pickAndReadEpub } from '@/lib/local-epub';

export default function LibraryScreen() {
  const colors = useColors();
  const { cards, books, syncing } = useStudy();
  const [openingLocal, setOpeningLocal] = React.useState(false);
  const insets = useSafeAreaInsets();
  const completed = cards.filter((card) => card.reviewed === 1).length;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 36 }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>BIBLIOTECA LOCAL</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Seu próximo livro{'\n'}começa aqui.</Text>
      <View style={[styles.localNote, { backgroundColor: colors.secondary }]}><Feather name="wifi-off" size={18} color={colors.secondaryForeground} /><View style={{ flex: 1 }}><Text style={[styles.noteTitle, { color: colors.secondaryForeground }]}>Pronto para ficar offline</Text><Text style={[styles.noteText, { color: colors.secondaryForeground }]}>Os seus cards ficam guardados neste aparelho. Novos livros são importados no computador.</Text></View></View>
       <View style={styles.sectionRow}><Text style={[styles.section, { color: colors.foreground }]}>Leituras</Text>{syncing && <Text style={[styles.syncing, { color: colors.mutedForeground }]}>SINCRONIZANDO</Text>}</View>
       <Pressable disabled={openingLocal} onPress={async () => { setOpeningLocal(true); try { const book = await pickAndReadEpub(); if (book) router.push(`/reader/local/${book.id}` as never); } finally { setOpeningLocal(false); } }} style={[styles.localPicker, { borderColor: colors.primary, backgroundColor: colors.card }]}><Feather name="folder" size={19} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.bookTitle, { color: colors.foreground }]}>{openingLocal ? 'Abrindo EPUB…' : 'Abrir EPUB do celular'}</Text><Text style={[styles.author, { color: colors.mutedForeground }]}>Ler um arquivo local sem preparação</Text></View><Feather name="chevron-right" size={18} color={colors.primary} /></Pressable>
       {books.length === 0 ? <View style={[styles.empty, { borderColor: colors.border }]}><Feather name="book-open" size={22} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum livro preparado ainda</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Importe e prepare um EPUB no computador para ele aparecer aqui.</Text></View> : books.map((book) => { const bookCards = cards.filter((card) => card.bookId === book.id); const reviewed = bookCards.filter((card) => card.reviewed === 1).length; return <Link key={book.id} href={`/reader/${book.id}`} asChild><Pressable style={[styles.book, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.cover, { backgroundColor: book.coverColor || colors.seafoam }]}><Text style={[styles.coverText, { color: colors.ink }]}>{book.title}</Text></View><View style={styles.bookInfo}><Text style={[styles.bookTitle, { color: colors.foreground }]}>{book.title}</Text><Text style={[styles.author, { color: colors.mutedForeground }]}>{book.author}</Text><View style={styles.pills}><View style={[styles.pill, { backgroundColor: colors.muted }]}><Text style={[styles.pillText, { color: colors.mutedForeground }]}>{book.level}</Text></View><Text style={[styles.countText, { color: colors.primary }]}>{reviewed}/{bookCards.length} cartões · tocar para ler</Text></View></View></Pressable></Link>; })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 34, letterSpacing: -1.2, marginBottom: 10 },
  localNote: { borderRadius: 20, padding: 17, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noteTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  noteText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 3, opacity: 0.85 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4, marginTop: 9 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncing: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.7 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 22, alignItems: 'center', gap: 9 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  book: { borderWidth: 1, borderRadius: 23, padding: 13, flexDirection: 'row', gap: 15 },
  localPicker: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  cover: { width: 88, height: 125, borderRadius: 14, padding: 11, justifyContent: 'flex-end' },
  coverText: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 15, letterSpacing: -0.5 },
  bookInfo: { justifyContent: 'center', flex: 1, gap: 5 },
  bookTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.5 },
  author: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 11 },
  pill: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
});