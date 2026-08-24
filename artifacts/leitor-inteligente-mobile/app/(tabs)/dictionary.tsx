import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getPublicDictionaryEntry, PublicDictionaryEntry, PublicDictionarySummary, searchPublicDictionary } from '@/lib/public-dictionary';

export default function DictionaryScreen() {
  const colors = useColors('dark');
  const ready = true;
  const [bilingual, setBilingual] = useState(false);
  const [publicQuery, setPublicQuery] = useState('');
  const [publicResults, setPublicResults] = useState<PublicDictionarySummary[]>([]);
  const [publicSelected, setPublicSelected] = useState<PublicDictionaryEntry | null>(null);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState('');
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;
  useEffect(() => {
    if (!publicQuery.trim()) { setPublicResults([]); setPublicError(''); return; }
    const timer = setTimeout(() => { setPublicLoading(true); void searchPublicDictionary(publicQuery, bilingual).then(setPublicResults).catch((error) => setPublicError(error instanceof Error ? error.message : 'Pesquisa indisponível.')).finally(() => setPublicLoading(false)); }, 350);
    return () => clearTimeout(timer);
  }, [publicQuery, bilingual]);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.modeRow}>
        <Pressable onPress={() => { setBilingual(false); setPublicSelected(null); }} style={[styles.modeButton, { backgroundColor: !bilingual ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: !bilingual ? colors.primaryForeground : colors.mutedForeground }}>Dicionário público</Text></Pressable>
        <Pressable onPress={() => { setBilingual(true); setPublicSelected(null); }} style={[styles.modeButton, { backgroundColor: bilingual ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: bilingual ? colors.primaryForeground : colors.mutedForeground }}>EN–PT-BR</Text></Pressable>
      </View>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{bilingual ? 'DICIONÁRIO EN–PT-BR' : 'DICIONÁRIO PÚBLICO'}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{bilingual ? 'Inglês para português do Brasil.' : 'Inglês, palavra por palavra.'}</Text>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>Pesquise no acervo público. O verbete aberto fica guardado neste aparelho para consultar depois, sem baixar a base inteira.</Text>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={18} color={colors.mutedForeground} /><TextInput value={publicQuery} onChangeText={(value) => { setPublicQuery(value); setPublicSelected(null); }} placeholder={bilingual ? 'Pesquisar tradução EN–PT-BR' : 'Pesquisar no dicionário público'} placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} testID="public-dictionary-search" /></View>
      {publicLoading && <ActivityIndicator color={colors.primary} />}
      {publicError ? <Text style={[styles.translation, { color: colors.destructive }]}>{publicError}</Text> : publicSelected ? <PublicEntryDetail entry={publicSelected} colors={colors} onBack={() => setPublicSelected(null)} /> : publicQuery.trim() ? <View style={styles.results}>{publicResults.map((entry) => <Pressable key={entry.id} onPress={() => { setPublicLoading(true); void getPublicDictionaryEntry(entry.id, bilingual).then(setPublicSelected).catch((error) => setPublicError(error instanceof Error ? error.message : 'Verbete indisponível.')).finally(() => setPublicLoading(false)); }} style={[styles.result, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.term, { color: colors.foreground }]}>{entry.term}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{entry.partOfSpeech} · {entry.senseCount} sentidos</Text></View><Feather name="chevron-right" size={18} color={colors.mutedForeground} /></Pressable>)}</View> : null}
    </ScrollView>
  );
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

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 20, gap: 14 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  modeButton: { flex: 1, minHeight: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
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