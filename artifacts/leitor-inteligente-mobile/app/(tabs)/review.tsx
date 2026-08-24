import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';
import { Deck, LinguisticDeck, SemanticNode, TestDictionaryCard } from '@/lib/study-db';
import { PronunciationButton, StudyCard } from '@/components/StudyCard';

const tabs: { id: Deck | 'all'; label: string }[] = [{ id: 'all', label: 'Tudo' }, { id: 'visual', label: 'Visuais' }, { id: 'vocabulary', label: 'Palavras' }, { id: 'idioms', label: 'Expressões' }, { id: 'phrasal', label: 'Phrasal' }];
type ViewMode = 'cards' | 'decks' | 'map';

export default function ReviewScreen() {
  return <StudyHubScreen initialView="decks" />;
}

export function CardsScreen() {
  return <StudyHubScreen initialView="cards" />;
}

function StudyHubScreen({ initialView }: { initialView: ViewMode }) {
  const colors = useColors('dark');
  const { cards, preparedBooks, testDictionaryEntries, ready, syncing, syncError, setReviewed, setTestCardReviewed, favorites, archived, toggleFavorite, toggleArchived } = useStudy();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | 'all'>('all');
  const [view, setView] = useState<ViewMode>(initialView);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queueKeys, setQueueKeys] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const swipeX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const filtered = useMemo(() => deck === 'all' ? cards : cards.filter((card) => card.deck === deck), [cards, deck]);
  const dictionaryCards = useMemo(() => testDictionaryEntries.flatMap((entry) => entry.cards), [testDictionaryEntries]);
  const reviewQueue = useMemo(() => [
    ...filtered.map((card) => ({ kind: 'book' as const, card })),
    ...dictionaryCards.map((card) => ({ kind: 'dictionary' as const, card })),
  ], [filtered, dictionaryCards]);
  const queueSignature = reviewQueue.map((item) => `${item.kind}:${item.card.id}`).join('|');
  const reviewByKey = useMemo(() => new Map(reviewQueue.map((item) => [`${item.kind}:${item.card.id}`, item])), [reviewQueue]);
  const visibleQueue = useMemo(() => queueKeys.map((key) => reviewByKey.get(key)).filter((item): item is (typeof reviewQueue)[number] => Boolean(item)), [queueKeys, reviewByKey]);
  const activeReview = visibleQueue[currentIndex];
  const activePlan = preparedBooks[0]?.plan;
  const selectedNode = activePlan?.semanticMap.nodes.find((node) => node.id === selectedNodeId) ?? activePlan?.semanticMap.nodes[0];
  const connected = activePlan?.semanticMap.connections.filter((connection) => connection.fromId === selectedNode?.id || connection.toId === selectedNode?.id) ?? [];
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;
  const isCards = initialView === 'cards';
  useEffect(() => {
    setQueueKeys(reviewQueue.map((item) => `${item.kind}:${item.card.id}`));
    setCurrentIndex(0);
  }, [deck, queueSignature]);

  const moveCard = (direction: 'left' | 'right') => {
    const activeKey = activeReview ? `${activeReview.kind}:${activeReview.card.id}` : null;
    if (!activeKey) return;
    const remainingKeys = queueKeys.filter((key) => key !== activeKey);
    const nextKeys = direction === 'right' ? [...remainingKeys, activeKey] : remainingKeys;
    const nextIndex = Math.min(currentIndex, nextKeys.length);
    setQueueKeys(nextKeys);
    setCurrentIndex(nextIndex);
    if (direction === 'left' && activeReview.kind === 'book') toggleArchived(String(activeReview.card.id));
    swipeX.setValue(0);
  };
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
    onPanResponderMove: (_, gesture) => swipeX.setValue(gesture.dx),
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 90) moveCard(gesture.dx < 0 ? 'left' : 'right');
      else Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [activeReview, currentIndex, queueKeys]);

  if (!ready) return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 36 }]} showsVerticalScrollIndicator={false}>
       <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>{isCards ? 'REVISÃO VISUAL' : 'PREPARAÇÃO OFFLINE'}</Text><Text style={[styles.title, { color: colors.foreground }]}>{isCards ? <>Seus cards.{'\n'}Sua próxima palavra.</> : <>Linguagem antes{'\n'}da leitura.</>}</Text></View><View style={[styles.count, { backgroundColor: colors.secondary }]}><Feather name={isCards ? 'star' : 'compass'} size={20} color={colors.primary} /><Text style={[styles.countText, { color: colors.secondaryForeground }]}>{activePlan?.visualCards.length ?? filtered.length + dictionaryCards.length}</Text></View></View>
       {!isCards ? <View style={styles.modeTabs}>{([{ id: 'cards', label: 'Cartões', icon: 'eye' }, { id: 'decks', label: 'Decks', icon: 'layers' }, { id: 'map', label: 'Mapa', icon: 'share-2' }] as const).map((mode) => <Pressable key={mode.id} onPress={() => setView(mode.id)} style={[styles.modeTab, { backgroundColor: view === mode.id ? colors.primary : colors.card, borderColor: view === mode.id ? colors.primary : colors.border }]} testID={`study-mode-${mode.id}`}><Feather name={mode.icon} size={15} color={view === mode.id ? colors.primaryForeground : colors.primary} /><Text style={[styles.modeText, { color: view === mode.id ? colors.primaryForeground : colors.mutedForeground }]}>{mode.label}</Text></Pressable>)}</View> : null}
       {view === 'cards' ? <><View style={styles.statusRow}><View style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="zap" size={14} color={colors.accent} /><Text style={[styles.statusText, { color: colors.foreground }]}>0 dias</Text></View><View style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="target" size={14} color={colors.primary} /><Text style={[styles.statusText, { color: colors.foreground }]}>{filtered.filter((card) => card.reviewed === 1).length}/{filtered.length + dictionaryCards.length || 5} hoje</Text></View><View style={[styles.statusPill, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="trending-up" size={14} color={colors.secondaryForeground} /><Text style={[styles.statusText, { color: colors.foreground }]}>Nível 1</Text></View></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>{tabs.map((tab) => <Pressable key={tab.id} onPress={() => setDeck(tab.id)} style={[styles.tab, { borderColor: deck === tab.id ? colors.primary : colors.border, backgroundColor: deck === tab.id ? colors.primary : colors.card }]}><Text style={[styles.tabText, { color: deck === tab.id ? colors.primaryForeground : colors.mutedForeground }]}>{tab.label}</Text></Pressable>)}</ScrollView><Text style={[styles.helper, { color: colors.mutedForeground }]}>Deslize para a esquerda para arquivar. Deslize para a direita para colocar a palavra no fim da fila.</Text>{reviewQueue.length > 0 && activeReview ? <Animated.View {...panResponder.panHandlers} style={[styles.swipeCard, { transform: [{ translateX: swipeX }] }]}>{activeReview.kind === 'book' ? <StudyCard key={`book-${activeReview.card.id}`} card={activeReview.card} onToggle={(reviewed) => void setReviewed(activeReview.card.id, reviewed)} saved={!!favorites[String(activeReview.card.id)]} archived={!!archived[String(activeReview.card.id)]} onToggleSaved={() => toggleFavorite(String(activeReview.card.id))} onToggleArchived={() => toggleArchived(String(activeReview.card.id))} onMore={() => router.push(`/card/${activeReview.card.id}?bookId=${activeReview.card.bookId}` as never)} /> : <DictionaryCardVisual key={`dictionary-${activeReview.card.id}`} card={activeReview.card} colors={colors} reviewed={activeReview.card.reviewed === 1} onToggle={setTestCardReviewed} />}</Animated.View> : reviewQueue.length > 0 ? <ReviewComplete colors={colors} /> : <ReviewEmpty syncing={syncing} syncError={syncError} colors={colors} />}</> : null}
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
  swipeCard: { width: '100%' },
  visualCard: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  visualCardArt: { minHeight: 390, justifyContent: 'space-between', position: 'relative' },
  visualCardTop: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  visualCardTopLeft: { flexDirection: 'row', gap: 19 },
  newBadge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  newBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  visualCardCopy: { paddingHorizontal: 20, paddingBottom: 45, alignItems: 'center' },
  visualCardTerm: { fontFamily: 'Inter_700Bold', fontSize: 36, letterSpacing: 1 },
  visualCardType: { fontFamily: 'Inter_500Medium', fontSize: 15, marginTop: 9 },
  visualCardFlip: { position: 'absolute', right: 16, bottom: 16, width: 38, height: 38, borderWidth: 1.5, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  visualCardPrompt: { padding: 16, paddingTop: 14, alignItems: 'center', gap: 10 },
  visualCardQuestion: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  visualCardPromptActions: { flexDirection: 'row', gap: 8, width: '100%' },
  promptButton: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  promptButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  visualCardHint: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 12 },
  visualCardBack: { padding: 17, gap: 11 },
  visualCardBackTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  visualCardBackTerm: { fontFamily: 'Inter_700Bold', fontSize: 25 },
  visualCardDefinition: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 22 },
  visualCardExample: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 14, lineHeight: 20 },
  visualCardFooter: { borderTopWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  footerIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moreButton: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  moreButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  statusRow: { flexDirection: 'row', gap: 7, marginTop: 4 },
  statusPill: { flex: 1, minHeight: 39, borderWidth: 1, borderRadius: 13, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
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
  reviewEmpty: { borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginTop: 4 },
  emptyArt: { minHeight: 238, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  emptyPlay: { position: 'absolute', right: 15, bottom: 13, width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  emptyKicker: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginHorizontal: 18, marginTop: 17 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, lineHeight: 26, letterSpacing: -0.5, marginHorizontal: 18, marginTop: 6 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginHorizontal: 18, marginTop: 6 },
  emptyHint: { margin: 18, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyHintText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16 },
});

function ReviewEmpty({ syncing, syncError, colors }: { syncing: boolean; syncError: boolean; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.reviewEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[styles.emptyArt, { backgroundColor: colors.muted }]}><Feather name="book-open" size={54} color={colors.primary} /><View style={[styles.emptyPlay, { borderColor: colors.accent }]}><Feather name="play" size={14} color={colors.accent} /></View></View>
    <Text style={[styles.emptyKicker, { color: colors.primary }]}>{syncing ? 'SINCRONIZANDO' : syncError ? 'MODO OFFLINE' : 'SUA FILA DE REVISÃO'}</Text>
    <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{syncError ? 'Estudo local preservado' : 'Prepare um livro para começar'}</Text>
    <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{syncError ? 'A conexão não está disponível agora. Os cards já baixados continuam disponíveis neste aparelho.' : 'Quando um livro estiver preparado no computador, seus cards aparecem aqui para revisão, mesmo sem internet.'}</Text>
    <View style={[styles.emptyHint, { backgroundColor: colors.secondary }]}><Feather name={syncError ? 'wifi-off' : 'download-cloud'} size={16} color={colors.secondaryForeground} /><Text style={[styles.emptyHintText, { color: colors.secondaryForeground }]}>{syncError ? 'A cópia local é a fonte desta sessão.' : 'A sincronização traz apenas material derivado.'}</Text></View>
  </View>;
}

function ReviewComplete({ colors }: { colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <Feather name="check-circle" size={28} color={colors.primary} />
    <Text style={[styles.deckTitle, { color: colors.foreground }]}>Fila concluída</Text>
    <Text style={[styles.deckPurpose, { color: colors.mutedForeground }]}>Você revisou todos os cards desta sequência.</Text>
  </View>;
}

function DictionaryCardVisual({ card, colors, reviewed, onToggle }: { card: TestDictionaryCard; colors: ReturnType<typeof useColors>; reviewed: boolean; onToggle: (id: string, reviewed: boolean) => Promise<void> }) {
  const router = useRouter();
  const [flipped, setFlipped] = useState(false);
  const [saved, setSaved] = useState(false);
  const [archived, setArchived] = useState(false);
  return <Pressable onPress={() => setFlipped((value) => !value)} accessibilityLabel={flipped ? `Voltar o card de ${card.term} para a frente` : `Mostrar o verso do card de ${card.term}`} accessibilityHint="Toque em qualquer área livre do card para alternar entre frente e verso" style={[styles.visualCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: archived ? .62 : 1 }]}>
    <View style={[styles.visualCardArt, { backgroundColor: colors.muted }]}>
       <View style={styles.visualCardTop}><View style={styles.visualCardTopLeft}><Pressable onPress={(event) => { event.stopPropagation(); setFlipped(false); }} accessibilityLabel="Voltar para a frente"><Feather name="corner-up-left" size={20} color={colors.foreground} /></Pressable><PronunciationButton term={card.term} color={colors.foreground} activeColor={colors.accent} /><Pressable onPress={(event) => event.stopPropagation()} accessibilityLabel="Configurações do card"><Feather name="settings" size={20} color={colors.foreground} /></Pressable></View><View style={[styles.newBadge, { backgroundColor: colors.card }]}><Feather name="zap" size={13} color={colors.accent} /><Text style={[styles.newBadgeText, { color: colors.foreground }]}>NEW</Text></View></View>
      {!flipped ? <View style={styles.visualCardCopy}><Text style={[styles.visualCardTerm, { color: colors.foreground }]}>{card.term.toUpperCase()}</Text><Text style={[styles.visualCardType, { color: colors.foreground }]}>vocabulário</Text></View> : null}
        <PronunciationButton term={card.term} color={colors.accent} activeColor={colors.foreground} compact />
    </View>
     {flipped ? <View style={styles.visualCardBack}><View style={styles.visualCardBackTitle}><Text style={[styles.visualCardBackTerm, { color: colors.foreground }]}>{card.term.toUpperCase()}</Text><PronunciationButton term={card.term} color={colors.mutedForeground} activeColor={colors.primary} /></View><Text style={[styles.visualCardDefinition, { color: colors.foreground }]}>Uma palavra do seu vocabulário offline. <Text style={{ color: colors.mutedForeground }}>PT</Text></Text><Text style={[styles.visualCardExample, { color: colors.mutedForeground }]}>Explore este card e reveja a tradução: <Text style={{ color: colors.foreground }}>{card.translation}</Text>.</Text></View> : <View style={styles.visualCardPrompt}><Text style={[styles.visualCardQuestion, { color: colors.foreground }]}>Quer aprender esta palavra?</Text><View style={styles.visualCardPromptActions}><Pressable onPress={() => setArchived((value) => !value)} style={[styles.promptButton, { backgroundColor: colors.muted }]} accessibilityLabel={archived ? 'Restaurar card arquivado' : 'Arquivar card'}><Feather name="archive" size={16} color={colors.foreground} /><Text style={[styles.promptButtonText, { color: colors.foreground }]}>{archived ? 'Restaurar' : 'Arquivar'}</Text></Pressable><Pressable onPress={() => void onToggle(card.id, !reviewed)} style={[styles.promptButton, { backgroundColor: colors.muted }]} accessibilityLabel={reviewed ? 'Marcar card como não aprendido' : 'Aprender card'}><Feather name={reviewed ? 'check' : 'repeat'} size={16} color={colors.foreground} /><Text style={[styles.promptButtonText, { color: colors.foreground }]}>{reviewed ? 'Aprendido' : 'Aprender'}</Text></Pressable></View><Text style={[styles.visualCardHint, { color: colors.mutedForeground }]}>toque para virar o card</Text></View>}
     <View style={[styles.visualCardFooter, { borderTopColor: colors.border }]}><Pressable onPress={(event) => { event.stopPropagation(); setSaved((value) => !value); }} style={[styles.footerIcon, { backgroundColor: saved ? colors.secondary : colors.muted }]} accessibilityLabel={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Feather name="heart" size={17} color={saved ? colors.accent : colors.foreground} /></Pressable><Pressable onPress={(event) => { event.stopPropagation(); void Share.share({ message: `${card.term} — ${card.translation}` }); }} style={[styles.footerIcon, { backgroundColor: colors.muted }]} accessibilityLabel="Compartilhar card"><Feather name="share-2" size={17} color={colors.foreground} /></Pressable><Pressable onPress={(event) => { event.stopPropagation(); router.push(`/card/${card.id}?kind=dictionary` as never); }} style={[styles.moreButton, { borderColor: colors.primary }]} accessibilityLabel="Ver mais detalhes"><Feather name="more-horizontal" size={17} color={colors.primary} /><Text style={[styles.moreButtonText, { color: colors.primary }]}>Mais</Text></Pressable></View>
   </Pressable>;
}

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