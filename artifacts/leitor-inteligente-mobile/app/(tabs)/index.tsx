import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';

export default function TabOneScreen() {
  const colors = useColors();
  const { cards, books, ready } = useStudy();
  const currentBook = books[0];
  const insets = useSafeAreaInsets();
  const complete = cards.filter((card) => card.reviewed === 1).length;
  const pending = cards.length - complete;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;

  if (!ready) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 36 }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>SEU RITUAL DE LEITURA</Text>
      <Text style={[styles.greeting, { color: colors.foreground }]}>Boa noite.{'\n'}Vamos abrir espaço{'\n'}para o inglês.</Text>

      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroTop}>
          <View><Text style={[styles.heroLabel, { color: colors.primaryForeground }]}>HOJE</Text><Text style={[styles.heroNumber, { color: colors.primaryForeground }]}>{pending}</Text><Text style={[styles.heroSmall, { color: colors.primaryForeground }]}>cartões esperam por você</Text></View>
          <View style={[styles.bookMark, { borderColor: colors.accent }]}><Feather name="book-open" color={colors.accent} size={26} /></View>
        </View>
        <Pressable onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/review'); }} style={[styles.heroButton, { backgroundColor: colors.accent }]} testID="start-preparation">
          <Text style={[styles.heroButtonText, { color: colors.accentForeground }]}>Abrir preparação</Text><Feather name="arrow-up-right" color={colors.accentForeground} size={18} />
        </Pressable>
      </View>

      <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>A leitura de agora</Text><Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>OFFLINE</Text></View>
      <View style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cover, { backgroundColor: colors.seafoam }]}><Text style={[styles.coverTitle, { color: colors.ink }]}>Wuthering{'\n'}Heights</Text><Text style={[styles.coverSmall, { color: colors.ink }]}>EMILY BRONTË</Text></View>
        <View style={styles.bookInfo}><Text style={[styles.bookKicker, { color: colors.primary }]}>PREPARAÇÃO DE LEITURA</Text><Text style={[styles.bookTitle, { color: colors.foreground }]}>{currentBook?.title ?? 'Nenhum livro preparado'}</Text><Text style={[styles.bookBody, { color: colors.mutedForeground }]}>{currentBook ? `${currentBook.author} · ${currentBook.level}` : 'Importe e prepare um livro no computador para começar.'}</Text><View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.orange, width: `${currentBook?.progress ?? 0}%` }]} /></View><Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{currentBook ? `${currentBook.progress}% preparado` : 'Aguardando preparação'}</Text></View>
      </View>

      <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seu avanço</Text><Text style={[styles.sectionMeta, { color: colors.mutedForeground }]}>SEM PRESSA</Text></View>
      <View style={styles.metrics}>
        <Metric label="REVISADOS" value={`${complete}/${cards.length}`} color={colors.primary} colors={colors} />
        <Metric label="SEQUÊNCIA" value="4 dias" color={colors.orange} colors={colors} />
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, color, colors }: { label: string; value: string; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.metricValue, { color }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 20, gap: 16 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 32, lineHeight: 35, letterSpacing: -1.3, marginBottom: 9 },
  hero: { borderRadius: 26, padding: 22, gap: 23, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  heroLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, opacity: 0.7 },
  heroNumber: { fontFamily: 'Inter_700Bold', fontSize: 48, lineHeight: 54, letterSpacing: -2, marginTop: 4 },
  heroSmall: { fontFamily: 'Inter_400Regular', fontSize: 13, opacity: 0.8 },
  bookMark: { width: 54, height: 54, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.4 },
  sectionMeta: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  bookCard: { borderWidth: 1, borderRadius: 24, overflow: 'hidden', flexDirection: 'row' },
  cover: { width: 115, minHeight: 202, padding: 14, justifyContent: 'space-between' },
  coverTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 19, letterSpacing: -0.7 },
  coverSmall: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.7, opacity: 0.7 },
  bookInfo: { flex: 1, padding: 17, justifyContent: 'center' },
  bookKicker: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  bookTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, lineHeight: 22, letterSpacing: -0.5, marginTop: 7 },
  bookBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 6 },
  progressTrack: { height: 7, borderRadius: 10, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 10 },
  progressLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 6 },
  metrics: { flexDirection: 'row', gap: 11 },
  metric: { flex: 1, borderWidth: 1, borderRadius: 19, padding: 16, gap: 10 },
  metricLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.9 },
  metricValue: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.8 },
});
