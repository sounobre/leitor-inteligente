import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StudyCard as StudyCardType } from '@/lib/study-db';
import { useColors } from '@/hooks/useColors';

export function StudyCard({ card, onToggle }: { card: StudyCardType; onToggle: (reviewed: boolean) => void }) {
  const colors = useColors();
  const [revealed, setRevealed] = useState(false);
  const reviewed = card.reviewed === 1;

  const complete = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!reviewed);
  };

  return (
    <View style={[styles.card, { backgroundColor: reviewed ? colors.secondary : colors.card, borderColor: reviewed ? colors.secondary : colors.border }]}>
      <View style={styles.topline}>
        <View style={[styles.level, { backgroundColor: colors.muted }]}>
          <Text style={[styles.levelText, { color: colors.mutedForeground }]}>{card.difficulty}</Text>
        </View>
        <Pressable onPress={complete} testID={`review-card-${card.id}`} hitSlop={10}>
          <Feather name={reviewed ? 'check-circle' : 'circle'} size={24} color={reviewed ? colors.primary : colors.mutedForeground} />
        </Pressable>
      </View>
      <Text style={[styles.term, { color: colors.foreground }]}>{card.term}</Text>
      <Text style={[styles.pronunciation, { color: colors.primary }]}>{card.pronunciation}</Text>
      <Pressable onPress={() => setRevealed((value) => !value)} style={[styles.reveal, { backgroundColor: colors.background }]} testID={`reveal-card-${card.id}`}>
        <Text style={[styles.revealText, { color: colors.foreground }]}>{revealed ? card.translation : 'Toque para revelar'}</Text>
      </Pressable>
      {revealed && <Text style={[styles.example, { color: colors.mutedForeground }]}>{card.example}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 7 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  levelText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  term: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.8, marginTop: 6 },
  pronunciation: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  reveal: { borderRadius: 12, padding: 13, marginTop: 12 },
  revealText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, textAlign: 'center' },
  example: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 14, lineHeight: 20, marginTop: 4 },
});