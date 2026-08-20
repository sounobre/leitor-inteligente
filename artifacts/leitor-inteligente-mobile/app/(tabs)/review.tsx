import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { Deck } from '@/lib/study-db';
import { StudyCard } from '@/components/StudyCard';

const tabs: { id: Deck | 'all'; label: string }[] = [{ id: 'all', label: 'Tudo' }, { id: 'vocabulary', label: 'Palavras' }, { id: 'idioms', label: 'Expressões' }, { id: 'phrasal', label: 'Phrasal' }];

export default function ReviewScreen() {
  const colors = useColors();
  const { cards, ready, setReviewed } = useStudy();
  const [deck, setDeck] = useState<Deck | 'all'>('all');
  const insets = useSafeAreaInsets();
  const filtered = useMemo(() => deck === 'all' ? cards : cards.filter((card) => card.deck === deck), [cards, deck]);
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 36 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>REVISÃO OFFLINE</Text><Text style={[styles.title, { color: colors.foreground }]}>Cartões para{'\n'}ficar na memória.</Text></View><View style={[styles.count, { backgroundColor: colors.secondary }]}><Feather name="layers" size={20} color={colors.primary} /><Text style={[styles.countText, { color: colors.secondaryForeground }]}>{filtered.length}</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map((tab) => <Pressable key={tab.id} onPress={() => setDeck(tab.id)} style={[styles.tab, { borderColor: deck === tab.id ? colors.primary : colors.border, backgroundColor: deck === tab.id ? colors.primary : colors.card }]}><Text style={[styles.tabText, { color: deck === tab.id ? colors.primaryForeground : colors.mutedForeground }]}>{tab.label}</Text></Pressable>)}</ScrollView>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>Toque no cartão para revelar. Marque quando estiver seguro.</Text>
      <View style={styles.cards}>{filtered.map((card) => <StudyCard key={card.id} card={card} onToggle={(reviewed) => void setReviewed(card.id, reviewed)} />)}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 33, letterSpacing: -1.1, marginTop: 8 },
  count: { borderRadius: 18, minWidth: 54, padding: 12, alignItems: 'center', gap: 3 },
  countText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  tabs: { gap: 8, paddingVertical: 23 },
  tab: { borderWidth: 1, borderRadius: 100, paddingVertical: 9, paddingHorizontal: 13 },
  tabText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  cards: { gap: 12 },
});