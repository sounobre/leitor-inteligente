import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  filterSpecialistItems,
  getReviewStatus,
  specialistsData,
  type ReviewStatus,
  type ReviewStatusMap,
  type SpecialistItem,
  type StudyLevel,
} from '@/lib/specialist-data';

const REVIEW_STORAGE_KEY = 'leitor-inteligente:specialist-review-statuses';
const levels: Array<StudyLevel | 'Todos'> = ['Todos', 'Essencial', 'Aprofundamento', 'Desafio'];
const reviews: Array<ReviewStatus | 'Todos'> = ['Todos', 'Pendente', 'Estudado', 'Dominado'];
const nextReviewStatus: Record<ReviewStatus, ReviewStatus> = {
  Pendente: 'Estudado',
  Estudado: 'Dominado',
  Dominado: 'Pendente',
};

export default function SpecialistsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedSpecialistId, setSelectedSpecialistId] = useState(specialistsData[0].id);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<StudyLevel | 'Todos'>('Todos');
  const [review, setReview] = useState<ReviewStatus | 'Todos'>('Todos');
  const [statuses, setStatuses] = useState<ReviewStatusMap>({});
  const [selectedItem, setSelectedItem] = useState<SpecialistItem | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(REVIEW_STORAGE_KEY).then((value) => {
      try {
        const parsed = value ? JSON.parse(value) as unknown : {};
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const valid = Object.fromEntries(Object.entries(parsed).filter(([, status]) => (
            status === 'Pendente' || status === 'Estudado' || status === 'Dominado'
          ))) as ReviewStatusMap;
          setStatuses(valid);
        }
      } catch {
        // A malformed local value should not prevent the offline catalog from opening.
      } finally {
        setReady(true);
      }
    }).catch(() => setReady(true));
  }, []);

  const activeSpecialist = specialistsData.find(({ id }) => id === selectedSpecialistId) ?? specialistsData[0];
  const items = useMemo(
    () => filterSpecialistItems(activeSpecialist, query, level, review, statuses),
    [activeSpecialist, level, query, review, statuses],
  );
  const studiedCount = activeSpecialist.items.filter((item) => getReviewStatus(item.id, statuses) !== 'Pendente').length;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top + 18;

  const selectSpecialist = (id: string) => {
    setSelectedSpecialistId(id);
    setQuery('');
    setLevel('Todos');
    setReview('Todos');
  };

  const advanceReviewStatus = (itemId: string) => {
    setStatuses((current) => {
      const next = { ...current, [itemId]: nextReviewStatus[getReviewStatus(itemId, current)] };
      void AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  if (!ready) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: topPadding, paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.eyebrow, { color: colors.primary }]}>ESTUDO OFFLINE</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Aprenda por{'\n'}especialidade.</Text>
      <View style={[styles.localNote, { backgroundColor: colors.secondary }]}>
        <Feather name="wifi-off" size={17} color={colors.secondaryForeground} />
        <Text style={[styles.localNoteText, { color: colors.secondaryForeground }]}>Catálogo e progresso salvos neste aparelho.</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Especialistas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
        {specialistsData.map((specialist) => (
          <Pressable
            key={specialist.id}
            onPress={() => selectSpecialist(specialist.id)}
            style={[styles.pickerItem, {
              backgroundColor: activeSpecialist.id === specialist.id ? colors.primary : colors.card,
              borderColor: activeSpecialist.id === specialist.id ? colors.primary : colors.border,
            }]}
            testID={`specialist-${specialist.id}`}
          >
            <Text style={[styles.pickerTitle, { color: activeSpecialist.id === specialist.id ? colors.primaryForeground : colors.foreground }]}>{specialist.title}</Text>
            <Text style={[styles.pickerCount, { color: activeSpecialist.id === specialist.id ? colors.primaryForeground : colors.mutedForeground }]}>{specialist.items.length} itens</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryKicker, { color: colors.primary }]}>ESPECIALISTA SELECIONADO</Text>
            <Text style={[styles.summaryTitle, { color: colors.foreground }]}>{activeSpecialist.title}</Text>
            <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{activeSpecialist.summary}</Text>
          </View>
          <Text style={[styles.progressNumber, { color: colors.primary }]}>{studiedCount}/{activeSpecialist.items.length}</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}><View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${activeSpecialist.items.length ? (studiedCount / activeSpecialist.items.length) * 100 : 0}%` }]} /></View>
        <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>itens estudados</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Buscar termo, tradução ou explicação"
        placeholderTextColor={colors.mutedForeground}
        style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        testID="input-specialist-search"
      />
      <FilterRow label="Nível" options={levels} selected={level} onSelect={(value) => setLevel(value as StudyLevel | 'Todos')} colors={colors} />
      <FilterRow label="Revisão" options={reviews} selected={review} onSelect={(value) => setReview(value as ReviewStatus | 'Todos')} colors={colors} />
      <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>Mostrando {items.length} de {activeSpecialist.items.length} {activeSpecialist.itemNoun}</Text>

      {items.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border }]}><Feather name="search" size={22} color={colors.mutedForeground} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhum item corresponde aos filtros.</Text></View>
      ) : items.map((item) => <SpecialistCard key={item.id} item={item} status={getReviewStatus(item.id, statuses)} colors={colors} onOpen={() => setSelectedItem(item)} onAdvance={() => advanceReviewStatus(item.id)} />)}

      <Modal visible={Boolean(selectedItem)} transparent animationType="slide" onRequestClose={() => setSelectedItem(null)}>
        {selectedItem && <DetailModal item={selectedItem} specialistTitle={activeSpecialist.title} status={getReviewStatus(selectedItem.id, statuses)} colors={colors} onClose={() => setSelectedItem(null)} onAdvance={() => advanceReviewStatus(selectedItem.id)} />}
      </Modal>
    </ScrollView>
  );
}

function FilterRow({ label, options, selected, onSelect, colors }: { label: string; options: string[]; selected: string; onSelect: (value: string) => void; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.filterRow}><Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>{options.map((option) => <Pressable key={option} onPress={() => onSelect(option)} style={[styles.filter, { backgroundColor: selected === option ? colors.primary : colors.card, borderColor: selected === option ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: selected === option ? colors.primaryForeground : colors.mutedForeground }]}>{option}</Text></Pressable>)}</ScrollView></View>;
}

function SpecialistCard({ item, status, colors, onOpen, onAdvance }: { item: SpecialistItem; status: ReviewStatus; colors: ReturnType<typeof useColors>; onOpen: () => void; onAdvance: () => void }) {
  return <Pressable onPress={onOpen} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={[styles.term, { color: colors.foreground }]}>{item.term}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{item.translation}</Text></View><Pressable onPress={onAdvance} style={[styles.status, { backgroundColor: status === 'Pendente' ? colors.muted : colors.secondary }]}><Feather name={status === 'Pendente' ? 'circle' : status === 'Estudado' ? 'check-circle' : 'check'} size={13} color={status === 'Pendente' ? colors.mutedForeground : colors.secondaryForeground} /><Text style={[styles.statusText, { color: status === 'Pendente' ? colors.mutedForeground : colors.secondaryForeground }]}>{status}</Text></Pressable></View><Text style={[styles.example, { color: colors.foreground }]}>“{item.example}”</Text><View style={styles.cardBottom}><Text style={[styles.level, { color: colors.primary }]}>{item.level}</Text><Text style={[styles.detailsLink, { color: colors.mutedForeground }]}>Ver detalhes <Feather name="arrow-up-right" size={12} /></Text></View></Pressable>;
}

function DetailModal({ item, specialistTitle, status, colors, onClose, onAdvance }: { item: SpecialistItem; specialistTitle: string; status: ReviewStatus; colors: ReturnType<typeof useColors>; onClose: () => void; onAdvance: () => void }) {
  return <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.background }]}><View style={styles.modalHandle} /><View style={styles.modalTop}><View style={{ flex: 1 }}><Text style={[styles.summaryKicker, { color: colors.primary }]}>{specialistTitle.toUpperCase()}</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>{item.term}</Text><Text style={[styles.translation, { color: colors.mutedForeground }]}>{item.translation}</Text></View><Pressable onPress={onClose} style={[styles.close, { backgroundColor: colors.card }]}><Feather name="x" size={19} color={colors.foreground} /></Pressable></View><View style={[styles.explanation, { backgroundColor: colors.secondary }]}><Feather name="info" size={16} color={colors.secondaryForeground} /><Text style={[styles.explanationText, { color: colors.secondaryForeground }]}>{item.explanation}</Text></View><Text style={[styles.example, { color: colors.foreground }]}>“{item.example}”</Text><View style={styles.details}>{Object.entries(item.details).map(([key, value]) => <View key={key} style={styles.detailRow}><Text style={[styles.detailKey, { color: colors.mutedForeground }]}>{key}</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text></View>)}</View><Pressable onPress={onAdvance} style={[styles.advance, { backgroundColor: colors.primary }]}><Feather name="check-circle" size={17} color={colors.primaryForeground} /><Text style={[styles.advanceText, { color: colors.primaryForeground }]}>Status: {status}</Text></Pressable></View></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 20, gap: 13 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 31, lineHeight: 34, letterSpacing: -1.2, marginBottom: 3 },
  localNote: { borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  localNoteText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  picker: { gap: 8, paddingVertical: 2 },
  pickerItem: { borderWidth: 1, borderRadius: 15, paddingVertical: 10, paddingHorizontal: 13, minWidth: 115 },
  pickerTitle: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  pickerCount: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  summary: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 3 },
  summaryTop: { flexDirection: 'row', gap: 10 },
  summaryKicker: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  summaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 5 },
  summaryText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 4 },
  progressNumber: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  progressTrack: { height: 6, borderRadius: 10, overflow: 'hidden', marginTop: 13 },
  progressFill: { height: 6, borderRadius: 10 },
  progressLabel: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 5 },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, width: 48 },
  filterOptions: { gap: 6 },
  filter: { borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 7 },
  filterText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  resultCount: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 19, padding: 15, gap: 11 },
  cardTop: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  term: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  translation: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  status: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  example: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  detailsLink: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 25, alignItems: 'center', gap: 9 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20, 25, 35, 0.42)' },
  modal: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34, gap: 16, maxHeight: '88%' },
  modalHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 4, backgroundColor: '#b8b2a5' },
  modalTop: { flexDirection: 'row', gap: 10 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 29, marginTop: 6 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  explanation: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 9 },
  explanationText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  details: { gap: 10 },
  detailRow: { borderBottomWidth: 1, borderBottomColor: '#dfd8c7', paddingBottom: 8, gap: 3 },
  detailKey: { fontFamily: 'Inter_700Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  detailValue: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  advance: { borderRadius: 14, padding: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  advanceText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
});