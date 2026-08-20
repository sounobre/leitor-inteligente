import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { Deck, LinguisticDeck, SemanticNode } from '@/lib/study-db';
import { StudyCard } from '@/components/StudyCard';

const tabs: { id: Deck | 'all'; label: string }[] = [{ id: 'all', label: 'Tudo' }, { id: 'visual', label: 'Visuais' }, { id: 'vocabulary', label: 'Palavras' }, { id: 'idioms', label: 'Expressões' }, { id: 'phrasal', label: 'Phrasal' }];
type ViewMode = 'cards' | 'decks' | 'map';

export default function ReviewScreen() {
  const colors = useColors();
  const { cards, preparedBooks, ready, setReviewed } = useStudy();
  const [deck, setDeck] = useState<Deck | 'all'>('all');
  const [view, setView] = useState<ViewMode>('cards');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const filtered = useMemo(() => deck === 'all' ? cards : cards.filter((card) => card.deck === deck), [cards, deck]);
  const activePlan = preparedBooks[0]?.plan;
  const selectedNode = activePlan?.semanticMap.nodes.find((node) => node.id === selectedNodeId) ?? activePlan?.semanticMap.nodes[0];
  const connected = activePlan?.semanticMap.connections.filter((connection) => connection.fromId === selectedNode?.id || connection.toId === selectedNode?.id) ?? [];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 36 }]} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>PREPARAÇÃO OFFLINE</Text><Text style={[styles.title, { color: colors.foreground }]}>Linguagem antes{'\n'}da leitura.</Text></View><View style={[styles.count, { backgroundColor: colors.secondary }]}><Feather name="compass" size={20} color={colors.primary} /><Text style={[styles.countText, { color: colors.secondaryForeground }]}>{activePlan?.visualCards.length ?? filtered.length}</Text></View></View>
      <View style={styles.modeTabs}>{([{ id: 'cards', label: 'Cartões', icon: 'eye' }, { id: 'decks', label: 'Decks', icon: 'layers' }, { id: 'map', label: 'Mapa', icon: 'share-2' }] as const).map((mode) => <Pressable key={mode.id} onPress={() => setView(mode.id)} style={[styles.modeTab, { backgroundColor: view === mode.id ? colors.primary : colors.card, borderColor: view === mode.id ? colors.primary : colors.border }]} testID={`study-mode-${mode.id}`}><Feather name={mode.icon} size={15} color={view === mode.id ? colors.primaryForeground : colors.primary} /><Text style={[styles.modeText, { color: view === mode.id ? colors.primaryForeground : colors.mutedForeground }]}>{mode.label}</Text></Pressable>)}</View>
      {view === 'cards' ? <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map((tab) => <Pressable key={tab.id} onPress={() => setDeck(tab.id)} style={[styles.tab, { borderColor: deck === tab.id ? colors.primary : colors.border, backgroundColor: deck === tab.id ? colors.primary : colors.card }]}><Text style={[styles.tabText, { color: deck === tab.id ? colors.primaryForeground : colors.mutedForeground }]}>{tab.label}</Text></Pressable>)}</ScrollView><Text style={[styles.helper, { color: colors.mutedForeground }]}>Os exemplos são originais e não revelam cenas do livro.</Text><View style={styles.cards}>{filtered.map((card) => <StudyCard key={card.id} card={card} onToggle={(reviewed) => void setReviewed(card.id, reviewed)} />)}</View></> : null}
      {view === 'decks' ? <DecksView decks={activePlan?.linguisticDecks ?? []} colors={colors} /> : null}
      {view === 'map' ? <SemanticMapView nodes={activePlan?.semanticMap.nodes ?? []} selectedNode={selectedNode} connections={connected} onSelect={setSelectedNodeId} colors={colors} /> : null}
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
  modeTabs: { flexDirection: 'row', gap: 8, marginTop: 23 },
  modeTab: { flex: 1, borderWidth: 1, borderRadius: 15, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  modeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  cards: { gap: 12 },
  materials: { gap: 12, marginTop: 22 },
  deckCard: { borderWidth: 1, borderRadius: 20, padding: 17, gap: 8 },
  deckTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deckTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.3 },
  deckCount: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  deckPurpose: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  chip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  chipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  nodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  node: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  nodeLabel: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  mapDetail: { borderRadius: 20, padding: 18, gap: 8, marginTop: 3 },
  connection: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 3 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 25, alignItems: 'center', gap: 12, marginTop: 22 },
});

function DecksView({ decks, colors }: { decks: LinguisticDeck[]; colors: ReturnType<typeof useColors> }) {
  if (decks.length === 0) return <EmptyMaterial icon="layers" label="Os decks aparecem quando este livro receber uma preparação nova." colors={colors} />;
  return <View style={styles.materials}>{decks.map((deck) => <View key={deck.id} style={[styles.deckCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.deckTop}><Text style={[styles.deckTitle, { color: colors.foreground }]}>{deck.title}</Text><Text style={[styles.deckCount, { color: colors.primary }]}>{deck.items.length}</Text></View><Text style={[styles.deckPurpose, { color: colors.mutedForeground }]}>{deck.purpose}</Text><View style={styles.chips}>{deck.items.slice(0, 5).map((item) => <View key={item.term} style={[styles.chip, { backgroundColor: colors.secondary }]}><Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{item.term}</Text></View>)}</View></View>)}</View>;
}

function SemanticMapView({ nodes, selectedNode, connections, onSelect, colors }: { nodes: SemanticNode[]; selectedNode?: SemanticNode; connections: { fromId: string; toId: string; relationship: string }[]; onSelect: (id: string) => void; colors: ReturnType<typeof useColors> }) {
  if (nodes.length === 0) return <EmptyMaterial icon="share-2" label="O mapa de relações aparece quando este livro receber uma preparação nova." colors={colors} />;
  return <View style={styles.materials}><Text style={[styles.helper, { color: colors.mutedForeground }]}>Toque em um conceito para ver como ele se conecta aos outros.</Text><View style={styles.nodeGrid}>{nodes.map((node) => <Pressable key={node.id} onPress={() => onSelect(node.id)} style={[styles.node, { backgroundColor: selectedNode?.id === node.id ? colors.primary : colors.card, borderColor: selectedNode?.id === node.id ? colors.primary : colors.border }]} testID={`semantic-node-${node.id}`}><Text style={[styles.nodeLabel, { color: selectedNode?.id === node.id ? colors.primaryForeground : colors.foreground }]}>{node.label}</Text></Pressable>)}</View>{selectedNode ? <View style={[styles.mapDetail, { backgroundColor: colors.secondary }]}><Text style={[styles.deckTitle, { color: colors.secondaryForeground }]}>{selectedNode.label}</Text><Text style={[styles.deckPurpose, { color: colors.secondaryForeground }]}>{selectedNode.description}</Text>{connections.map((connection, index) => <Text key={`${connection.fromId}-${connection.toId}-${index}`} style={[styles.connection, { color: colors.primary }]}>{connection.relationship}</Text>)}</View> : null}</View>;
}

function EmptyMaterial({ icon, label, colors }: { icon: 'layers' | 'share-2'; label: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={25} color={colors.primary} /><Text style={[styles.deckPurpose, { color: colors.mutedForeground }]}>{label}</Text></View>;
}