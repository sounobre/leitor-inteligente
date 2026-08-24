import React, { useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { StudyCard } from '@/lib/study-db';
import { PronunciationButton } from '@/components/StudyCard';

export default function CardDetailScreen() {
  const colors = useColors('dark');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, bookId, kind } = useLocalSearchParams<{ id: string; bookId?: string; kind?: string }>();
  const { cards, preparedBooks, testDictionaryEntries, ready, favorites, archived, toggleFavorite, toggleArchived } = useStudy();
  const card = cards.find((item) => String(item.id) === id && (!bookId || item.bookId === bookId)) ?? cards.find((item) => String(item.id) === id);
  const related = useMemo(() => card ? cards.filter((item) => item.bookId === card.bookId && item.deck === card.deck && item.id !== card.id).slice(0, 5) : [], [cards, card]);
  const dictionaryEntry = testDictionaryEntries.find((entry) => entry.id === id);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  if (!card && dictionaryEntry && kind === 'dictionary') return <DictionaryDetail entry={dictionaryEntry} colors={colors} router={router} insets={insets} />;
  if (!card) return <View style={[styles.loading, { backgroundColor: colors.background }]}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Card não encontrado</Text><Pressable onPress={() => router.back()}><Text style={[styles.backText, { color: colors.primary }]}>Voltar aos cards</Text></Pressable></View>;

  const favorite = !!favorites[String(card.id)];
  const isArchived = !!archived[String(card.id)];
  const book = preparedBooks.find((item) => item.id === card.bookId);
  const planItem = [...(book?.plan.vocabulary ?? []), ...(book?.plan.idioms ?? []), ...(book?.plan.phrasalVerbs ?? []), ...(book?.plan.visualCards ?? [])].find((item) => item.term === card.term);
  const item = planItem ?? card;
  const itemWithDetails = item as StudyCard & { overview?: string; frequency?: string; background?: string; related?: string[] };
  const relatedTerms = itemWithDetails.related?.length ? itemWithDetails.related : related.map((entry) => entry.term);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: Platform.OS === 'web' ? 24 : insets.top + 14, paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]} accessibilityLabel="Voltar aos cards">
          <Feather name="arrow-left" size={19} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.kicker, { color: colors.primary }]}>DETALHE DO CARD</Text>
        <View style={styles.topActions}>
          <Pressable onPress={() => toggleFavorite(String(card.id))} accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
            <Feather name="heart" size={20} color={favorite ? colors.accent : colors.foreground} />
          </Pressable>
          <Pressable onPress={() => toggleArchived(String(card.id))} accessibilityLabel={isArchived ? 'Restaurar card arquivado' : 'Arquivar card'}>
            <Feather name="archive" size={20} color={isArchived ? colors.accent : colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.badge, { backgroundColor: colors.secondary }]}><Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>{card.deck === 'phrasal' ? 'PHRASAL VERB' : card.deck.toUpperCase()}</Text></View>
        <View style={styles.termRow}><Text style={[styles.term, { color: colors.foreground }]}>{card.term}</Text><PronunciationButton term={card.term} color={colors.mutedForeground} activeColor={colors.primary} /></View>
        <Text style={[styles.pronunciation, { color: colors.primary }]}>{card.pronunciation || 'Pronúncia em inglês'}</Text>
        <Text style={[styles.translation, { color: colors.foreground }]}>{card.translation}</Text>
        <Text style={[styles.status, { color: colors.mutedForeground }]}>{isArchived ? 'Arquivado neste aparelho' : favorite ? 'Salvo nos favoritos' : 'Material derivado para estudo'}</Text>
      </View>

      <View style={styles.sections}>
        <DetailSection icon="book-open" title="Definição" colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{card.translation}</Text></DetailSection>
        <DetailSection icon="globe" title="Tradução PT" colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{card.translation}</Text></DetailSection>
        <DetailSection icon="compass" title="Visão geral" colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{itemWithDetails.overview || card.technique || 'Uma pista visual e contextual para reconhecer este uso em inglês.'}</Text></DetailSection>
        <DetailSection icon="message-circle" title="Exemplos em ação" colors={colors}>
          <View style={[styles.example, { backgroundColor: colors.secondary }]}><Text style={[styles.exampleText, { color: colors.secondaryForeground }]}>{card.example}</Text><Text style={[styles.exampleNote, { color: colors.mutedForeground }]}>Exemplo original, criado para preparação — não é um trecho do livro.</Text></View>
        </DetailSection>
        {card.visualCue || itemWithDetails.background ? <DetailSection icon="image" title="Background" colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{itemWithDetails.background || card.visualCue}</Text></DetailSection> : null}
        <DetailSection icon="bar-chart-2" title="Frequência" colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{itemWithDetails.frequency || `Nível ${card.difficulty || 'intermediário'} · frequência estimada para este deck`}</Text></DetailSection>
        {relatedTerms.length > 0 ? <DetailSection icon="link" title="Palavras relacionadas" colors={colors}><View style={styles.related}>{relatedTerms.map((term) => <View key={term} style={[styles.relatedChip, { backgroundColor: colors.secondary }]}><Text style={[styles.relatedText, { color: colors.secondaryForeground }]}>{term}</Text></View>)}</View></DetailSection> : null}
      </View>
    </ScrollView>
  );
}

function DictionaryDetail({ entry, colors, router, insets }: { entry: { term: string; translation: string; partOfSpeech: string; senses: { definition: string; translation: string }[]; examples: { sentence: string; translation: string; explanation: string }[] }; colors: ReturnType<typeof useColors>; router: ReturnType<typeof useRouter>; insets: { top: number } }) {
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: Platform.OS === 'web' ? 24 : insets.top + 14, paddingBottom: 40 }]}><View style={styles.topbar}><Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.card }]} accessibilityLabel="Voltar aos cards"><Feather name="arrow-left" size={19} color={colors.foreground} /></Pressable><Text style={[styles.kicker, { color: colors.primary }]}>DETALHE DO CARD</Text><View /></View><View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.badge, { backgroundColor: colors.secondary }]}><Text style={[styles.badgeText, { color: colors.secondaryForeground }]}>DICIONÁRIO · OFFLINE</Text></View><Text style={[styles.term, { color: colors.foreground, marginTop: 22 }]}>{entry.term}</Text><Text style={[styles.pronunciation, { color: colors.primary }]}>{entry.partOfSpeech}</Text><Text style={[styles.translation, { color: colors.foreground }]}>{entry.translation}</Text><Text style={[styles.status, { color: colors.mutedForeground }]}>Referência privada mantida neste aparelho</Text></View><View style={styles.sections}>{entry.senses.map((sense, index) => <DetailSection key={sense.definition} icon="book-open" title={index === 0 ? 'Definição' : `Definição ${index + 1}`} colors={colors}><Text style={[styles.body, { color: colors.foreground }]}>{sense.definition}</Text><Text style={[styles.exampleNote, { color: colors.mutedForeground }]}>{sense.translation}</Text></DetailSection>)}{entry.examples.length > 0 ? <DetailSection icon="message-circle" title="Exemplos em ação" colors={colors}>{entry.examples.map((example) => <View key={example.sentence} style={[styles.example, { backgroundColor: colors.secondary }]}><Text style={[styles.exampleText, { color: colors.secondaryForeground }]}>{example.sentence}</Text><Text style={[styles.exampleNote, { color: colors.mutedForeground }]}>{example.translation}</Text>{example.explanation ? <Text style={[styles.exampleNote, { color: colors.mutedForeground }]}>{example.explanation}</Text> : null}</View>)}</DetailSection> : null}</View></ScrollView>;
}

function DetailSection({ icon, title, colors, children }: { icon: React.ComponentProps<typeof Feather>['name']; title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.sectionTitle}><Feather name={icon} size={17} color={colors.primary} /><Text style={[styles.sectionHeading, { color: colors.foreground }]}>{title}</Text></View>{children}</View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  container: { paddingHorizontal: 18 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backText: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 10 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.2 },
  topActions: { flexDirection: 'row', gap: 18 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 20, marginBottom: 14 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: .8 },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22 },
  term: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1 },
  pronunciation: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 5 },
  translation: { fontFamily: 'Inter_600SemiBold', fontSize: 20, marginTop: 24 },
  status: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 16 },
  sections: { gap: 11 },
  section: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 11 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeading: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  example: { padding: 13, borderRadius: 13, gap: 8 },
  exampleText: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 14, lineHeight: 21 },
  exampleNote: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  related: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relatedChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  relatedText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
});