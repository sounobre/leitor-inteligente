import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { TestDictionaryCard, TestDictionaryEntry } from '@/lib/study-db';
import { getPublicDictionaryEntry, PublicDictionaryEntry, PublicDictionarySummary, searchPublicDictionary } from '@/lib/public-dictionary';

export default function DictionaryScreen() {
  const colors = useColors('dark');
  const { ready, testDictionaryEntries, syncing, syncError, lastSyncAt, lastSyncAttemptAt, setTestCardReviewed, createTestCard } = useStudy();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publicQuery, setPublicQuery] = useState('');
  const [publicResults, setPublicResults] = useState<PublicDictionarySummary[]>([]);
  const [publicSelected, setPublicSelected] = useState<PublicDictionaryEntry | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const insets = useSafeAreaInsets();
  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return testDictionaryEntries.filter((entry) => !needle || `${entry.term} ${entry.translation}`.toLocaleLowerCase().includes(needle));
  }, [query, testDictionaryEntries]);
  const selected = testDictionaryEntries.find((entry) => entry.id === selectedId) ?? null;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;
  useEffect(() => {
    if (!publicQuery.trim()) { setPublicResults([]); setPublicError(''); return; }
    const timer = setTimeout(() => { setPublicLoading(true); void searchPublicDictionary(publicQuery).then(setPublicResults).catch((error) => setPublicError(error instanceof Error ? error.message : 'Pesquisa indisponível.')).finally(() => setPublicLoading(false)); }, 350);
    return () => clearTimeout(timer);
  }, [publicQuery]);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.eyebrow, { color: colors.primary }]}>DICIONÁRIO PÚBLICO</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Inglês, palavra por palavra.</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Pesquise no acervo público. O verbete aberto fica guardado neste aparelho para consultar depois, sem baixar a base inteira.</Text>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={18} color={colors.mutedForeground} /><TextInput value={publicQuery} onChangeText={(value) => { setPublicQuery(value); setPublicSelected(null); }} placeholder="Pesquisar no dicionário público" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} testID="public-dictionary-search" /></View>
      {publicLoading && <ActivityIndicator color={colors.primary} />}
      {publicError ? <Text style={[styles.translation, { color: colors.destructive }]}>{publicError}</Text> : publicSelected ? <PublicEntryDetail entry={publicSelected} colors={colors} onBack={() => setPublicSelected(null)} /> : publicQuery.trim() ? <View style={styles.results}>{publicResults.map((entry) => <Pressable key={entry.id} onPress={() => { setPublicLoading(true); void getPublicDictionaryEntry(entry.id).then(setPublicSelected).catch((error) => setPublicError(error instanceof Error ? error.message : 'Verbete indisponível.')).finally(() => setPublicLoading(false)); }} style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.term, { color: colors.foreground }]}>{entry.term}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{entry.partOfSpeech} · {entry.senseCount} sentidos</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>)}</View> : null}
      <Text style={[styles.eyebrow, { color: colors.primary, marginTop: 26 }]}>VOCABULÁRIO LOCAL</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Seus verbetes de teste e cards continuam disponíveis abaixo.</Text>
      <DictionarySyncNotice colors={colors} syncing={syncing} syncError={syncError} lastSyncAt={lastSyncAt} lastSyncAttemptAt={lastSyncAttemptAt} />
      <View style={styles.statsRow}><Stat icon="book-open" value={`${testDictionaryEntries.length}`} label="palavras" colors={colors} /><Stat icon="wifi-off" value="local" label="offline" colors={colors} /><Stat icon="layers" value={`${testDictionaryEntries.filter((entry) => entry.cards.length > 0).length}`} label="cards" colors={colors} /></View>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar palavra ou tradução" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} testID="test-dictionary-search" />
      </View>
      {selected ? <EntryDetail entry={selected} colors={colors} onBack={() => setSelectedId(null)} onToggleCard={setTestCardReviewed} onCreateCard={createTestCard} /> : (
        <>
          <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{results.length} palavras disponíveis offline</Text>
          <View style={styles.results}>{results.map((entry) => <Pressable key={entry.id} onPress={() => setSelectedId(entry.id)} style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]} testID={`test-entry-${entry.id}`}><View style={{ flex: 1 }}><Text style={[styles.term, { color: colors.foreground }]}>{entry.term}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{entry.translation}</Text></View><View style={styles.resultMeta}><Text style={[styles.part, { color: colors.primary }]}>{entry.partOfSpeech}</Text><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></View></Pressable>)}</View>
          {results.length === 0 && <View style={[styles.empty, { borderColor: colors.border }]}><Feather name="search" size={23} color={colors.mutedForeground} /><Text style={[styles.translation, { color: colors.mutedForeground }]}>Nenhuma palavra encontrada.</Text></View>}
        </>
      )}
    </ScrollView>
  );
}

function DictionarySyncNotice({
  colors,
  syncing,
  syncError,
  lastSyncAt,
  lastSyncAttemptAt,
}: {
  colors: ReturnType<typeof useColors>;
  syncing: boolean;
  syncError: boolean;
  lastSyncAt: string | null;
  lastSyncAttemptAt: string | null;
}) {
  const statusTitle = syncing
    ? 'Cópia local disponível · verificando atualizações'
    : syncError
      ? 'Sem conexão · usando a cópia local'
      : 'Resultados locais disponíveis';
  const statusDetail = syncing
    ? 'Você pode continuar estudando enquanto a sincronização é tentada.'
    : syncError
      ? lastSyncAt
        ? `Não foi possível atualizar agora. Última sincronização: ${formatSyncDate(lastSyncAt)}.`
        : 'Não foi possível sincronizar ainda. Os resultados salvos neste aparelho continuam disponíveis.'
      : lastSyncAt
        ? `Última sincronização: ${formatSyncDate(lastSyncAt)}.`
        : lastSyncAttemptAt
          ? 'A primeira sincronização ainda não terminou. Mostrando o que está salvo neste aparelho.'
          : 'Esta tela usa os resultados salvos neste aparelho.';

  return (
    <View style={[styles.syncNotice, { backgroundColor: syncError ? colors.muted : colors.secondary, borderColor: syncError ? colors.border : colors.secondary }]}>
      <Feather name={syncError ? 'wifi-off' : syncing ? 'refresh-cw' : 'check-circle'} size={18} color={syncError ? colors.destructive : colors.secondaryForeground} />
      <View style={styles.syncNoticeCopy}>
        <Text style={[styles.syncNoticeTitle, { color: syncError ? colors.foreground : colors.secondaryForeground }]}>{statusTitle}</Text>
        <Text style={[styles.syncNoticeText, { color: syncError ? colors.mutedForeground : colors.secondaryForeground }]}>{statusDetail}</Text>
      </View>
    </View>
  );
}

function formatSyncDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function PublicEntryDetail({ entry, colors, onBack }: { entry: PublicDictionaryEntry; colors: ReturnType<typeof useColors>; onBack: () => void }) {
  return <View style={styles.detail}>
    <Pressable onPress={onBack} style={styles.back}><Feather name="arrow-left" size={16} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Voltar à pesquisa pública</Text></Pressable>
    <Text style={[styles.detailTerm, { color: colors.primary }]}>{entry.term}</Text>
    <Text style={[styles.translation, { color: colors.mutedForeground }]}>{entry.partOfSpeech} · {entry.source.version}</Text>
    <Text style={[styles.label, { color: colors.mutedForeground }]}>DEFINIÇÕES</Text>
    {entry.senses.map((sense) => <View key={sense.id} style={[styles.sense, { borderLeftColor: colors.primary }]}><Text style={[styles.senseText, { color: colors.foreground }]}>{sense.definition}</Text></View>)}
    {entry.forms.length > 0 && <Text style={[styles.translation, { color: colors.mutedForeground }]}>Formas: {entry.forms.map((form) => form.form).join(', ')}</Text>}
    <Text style={[styles.translation, { color: colors.mutedForeground, marginTop: 14 }]}>Fonte: {entry.source.attribution}</Text>
  </View>;
}

function EntryDetail({ entry, colors, onBack, onToggleCard, onCreateCard }: { entry: TestDictionaryEntry; colors: ReturnType<typeof useColors>; onBack: () => void; onToggleCard: (id: string, reviewed: boolean) => Promise<void>; onCreateCard: (entry: TestDictionaryEntry) => Promise<unknown> }) {
  return <View style={styles.detail}>
    <Pressable onPress={onBack} style={styles.back}><Feather name="arrow-left" size={16} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Voltar ao vocabulário</Text></Pressable>
    <View style={[styles.detailArt, { backgroundColor: colors.muted }]}><Feather name="book-open" size={55} color={colors.primary} /><View style={[styles.detailArtBadge, { borderColor: colors.accent }]}><Feather name="volume-2" size={15} color={colors.accent} /></View></View>
    <Text style={[styles.detailTerm, { color: colors.primary }]}>{entry.term}</Text>
    <View style={styles.detailMeta}><Text style={[styles.part, { color: colors.primary }]}>{entry.partOfSpeech}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{entry.translation}</Text></View>
    <Pressable onPress={() => void onCreateCard(entry)} style={[styles.createCard, { backgroundColor: colors.primary }]}><Feather name={entry.cards.length > 0 ? 'check' : 'plus-square'} size={17} color={colors.primaryForeground} /><Text style={[styles.createCardText, { color: colors.primaryForeground }]}>{entry.cards.length > 0 ? 'Card criado · revisar agora' : 'Transformar em card de estudo'}</Text></Pressable>
    <Text style={[styles.label, { color: colors.mutedForeground }]}>SENTIDOS</Text>
    {entry.senses.map((sense) => <View key={sense.id} style={[styles.sense, { borderLeftColor: colors.primary }]}><Text style={[styles.senseText, { color: colors.foreground }]}>{sense.translation || sense.definition}</Text></View>)}
    {entry.examples.length > 0 && <><Text style={[styles.label, { color: colors.mutedForeground }]}>EXEMPLOS SALVOS</Text>{entry.examples.map((example) => <View key={example.id} style={[styles.example, { backgroundColor: colors.secondary }]}><Text style={[styles.exampleText, { color: colors.secondaryForeground }]}>{example.sentence}</Text><Text style={[styles.translation, { color: colors.secondaryForeground }]}>{example.translation}</Text></View>)}</>}
    {entry.cards.length > 0 && <><Text style={[styles.label, { color: colors.mutedForeground }]}>CARTÕES DE ESTUDO</Text>{entry.cards.map((card) => <OfflineCard key={card.id} card={card} colors={colors} onToggle={onToggleCard} />)}</>}
  </View>;
}

function Stat({ icon, value, label, colors }: { icon: 'book-open' | 'wifi-off' | 'layers'; value: string; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={14} color={colors.primary} /><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text></View>;
}

function OfflineCard({ card, colors, onToggle }: { card: TestDictionaryCard; colors: ReturnType<typeof useColors>; onToggle: (id: string, reviewed: boolean) => Promise<void> }) {
  const [flipped, setFlipped] = useState(false);
  const [archived, setArchived] = useState(false);
  const reviewed = card.reviewed === 1;
  return <Pressable onPress={() => setFlipped((value) => !value)} accessibilityLabel={flipped ? `Voltar o card de ${card.term} para a frente` : `Mostrar o verso do card de ${card.term}`} accessibilityHint="Toque em qualquer área livre do card para alternar entre frente e verso" style={[styles.card, { backgroundColor: reviewed ? colors.secondary : colors.card, borderColor: colors.border, opacity: archived ? .62 : 1 }]}>
    <View style={[styles.cardArt, { backgroundColor: colors.muted }]}><View style={styles.cardArtTop}><Text style={[styles.cardArtLabel, { color: colors.foreground }]}>NEW WORD</Text><Pressable onPress={(event) => { event.stopPropagation(); setArchived((value) => !value); }} accessibilityLabel={archived ? 'Restaurar card arquivado' : 'Arquivar card'}><Feather name="archive" size={18} color={colors.foreground} /></Pressable></View>{!flipped ? <View style={styles.cardArtCopy}><Text style={[styles.cardArtTerm, { color: colors.foreground }]}>{card.term}</Text><Text style={[styles.cardArtQuestion, { color: colors.foreground }]}>{archived ? 'Arquivado' : 'Quer aprender?'}</Text></View> : null}<Pressable onPress={(event) => { event.stopPropagation(); setFlipped((value) => !value); }} style={[styles.cardPlay, { borderColor: colors.accent }]}><Feather name="chevron-down" size={17} color={colors.accent} /></Pressable></View>
     <View style={styles.cardContent}>
       <View style={styles.cardTop}><Text style={[styles.part, { color: colors.primary }]}>CARD · OFFLINE</Text><Pressable onPress={(event) => { event.stopPropagation(); void onToggle(card.id, !reviewed); }} testID={`test-card-${card.id}`} accessibilityLabel={reviewed ? 'Desmarcar card revisado' : 'Marcar card como revisado'}><Feather name={reviewed ? 'check-circle' : 'more-horizontal'} size={23} color={reviewed ? colors.accent : colors.mutedForeground} /></Pressable></View>
       {!flipped ? <><Text style={[styles.cardTerm, { color: colors.foreground }]}>{card.term}</Text><Text style={[styles.cardPart, { color: colors.mutedForeground }]}>vocabulário</Text><Pressable onPress={(event) => { event.stopPropagation(); setFlipped((value) => !value); }} style={[styles.cardFlipPrompt, { borderColor: colors.border }]}><Text style={[styles.cardFlipTitle, { color: colors.foreground }]}>Quer aprender esta palavra?</Text><Text style={[styles.cardFlipHint, { color: colors.mutedForeground }]}>toque para virar o card</Text></Pressable></> : <><Text style={[styles.cardTerm, { color: colors.foreground }]}>{card.term}</Text><View style={[styles.cardTranslation, { backgroundColor: colors.background }]}><Text style={[styles.cardTranslationText, { color: colors.foreground }]}>{card.translation}</Text></View><Pressable onPress={(event) => { event.stopPropagation(); setFlipped((value) => !value); }}><Text style={[styles.cardFlipBack, { color: colors.primary }]}>Toque para voltar à frente</Text></Pressable></>}
        <View style={styles.cardActions}><Pressable onPress={(event) => { event.stopPropagation(); setArchived((value) => !value); }} style={[styles.archiveButton, { borderColor: colors.border }]}><Feather name="archive" size={15} color={colors.mutedForeground} /><Text style={[styles.archiveText, { color: colors.mutedForeground }]}>{archived ? 'Restaurar' : 'Arquivar'}</Text></Pressable><Pressable onPress={(event) => { event.stopPropagation(); void onToggle(card.id, !reviewed); }} style={[styles.learnButton, { borderColor: colors.primary, backgroundColor: reviewed ? colors.primary : 'transparent' }]}><Feather name={reviewed ? 'check' : 'repeat'} size={16} color={reviewed ? colors.primaryForeground : colors.primary} /><Text style={[styles.learnButtonText, { color: reviewed ? colors.primaryForeground : colors.primary }]}>{reviewed ? 'Aprendido' : 'Aprender'}</Text></Pressable></View>
    </View>
   </Pressable>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 20, gap: 14 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, letterSpacing: -1.2 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 7, marginTop: 1 },
  stat: { flex: 1, minHeight: 58, borderWidth: 1, borderRadius: 14, padding: 9, justifyContent: 'center', gap: 2 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, textTransform: 'uppercase', letterSpacing: .7 },
  syncNotice: { borderWidth: 1, borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  syncNoticeCopy: { flex: 1, gap: 3 },
  syncNoticeTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, lineHeight: 17 },
  syncNoticeText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  searchBox: { borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, minHeight: 48, fontFamily: 'Inter_400Regular', fontSize: 14 },
  resultLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: .8, marginTop: 9 },
  results: { gap: 8 },
  result: { borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center' },
  term: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  translation: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 3 },
  resultMeta: { alignItems: 'flex-end', gap: 6 },
  part: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: .8, textTransform: 'uppercase' },
  empty: { borderWidth: 1, borderRadius: 18, alignItems: 'center', padding: 24, gap: 9 },
  detail: { gap: 13 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 4 },
  backText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  detailArt: { minHeight: 238, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  detailArtBadge: { position: 'absolute', right: 14, bottom: 13, width: 34, height: 34, borderWidth: 1.5, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  createCard: { minHeight: 46, borderRadius: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  createCardText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  detailTerm: { fontFamily: 'Inter_700Bold', fontSize: 38, letterSpacing: -1.5, marginTop: 5 },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1, marginTop: 16 },
  sense: { borderLeftWidth: 2, paddingLeft: 13 },
  senseText: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 },
  example: { borderRadius: 14, padding: 13, gap: 3 },
  exampleText: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  cardArt: { minHeight: 220, justifyContent: 'space-between', position: 'relative' },
  cardArtTop: { padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardArtLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  cardArtCopy: { paddingHorizontal: 16, paddingBottom: 24 },
  cardArtTerm: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -.8 },
  cardArtQuestion: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 4 },
  cardPlay: { position: 'absolute', right: 14, bottom: 12, width: 34, height: 34, borderWidth: 1.5, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  cardContent: { padding: 16, gap: 9 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTerm: { fontFamily: 'Inter_700Bold', fontSize: 23, marginTop: 3 },
  cardPart: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  cardFlipPrompt: { borderWidth: 1, borderRadius: 13, padding: 14, marginTop: 8, alignItems: 'center', gap: 4 },
  cardFlipTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  cardFlipHint: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  cardTranslation: { borderRadius: 13, padding: 14, marginTop: 8 },
  cardTranslationText: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  cardFlipBack: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center', marginVertical: 3 },
  learnButton: { minHeight: 42, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  learnButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  archiveButton: { minHeight: 42, borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  archiveText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
});