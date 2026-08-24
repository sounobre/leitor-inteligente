import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { StudyCard as StudyCardType } from '@/lib/study-db';
import { useColors } from '@/hooks/useColors';
import { useStudy } from '@/context/StudyContext';

export function StudyCard({ card, onToggle, saved = false, archived = false, onToggleSaved, onToggleArchived, onMore }: { card: StudyCardType; onToggle: (reviewed: boolean) => void; saved?: boolean; archived?: boolean; onToggleSaved?: () => void; onToggleArchived?: () => void; onMore?: () => void }) {
  const colors = useColors();
  const [flipped, setFlipped] = useState(false);
  const reviewed = card.reviewed === 1;

  const complete = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!reviewed);
  };

  return (
    <Pressable
      style={[styles.card, { backgroundColor: reviewed ? colors.secondary : colors.card, borderColor: reviewed ? colors.secondary : colors.border, opacity: archived ? 0.62 : 1 }]}
      onPress={() => setFlipped((value) => !value)}
      accessibilityLabel={flipped ? `Voltar o card de ${card.term} para a frente` : `Mostrar o verso do card de ${card.term}`}
      accessibilityHint="Toque em qualquer área livre do card para alternar entre frente e verso"
    >
      <View style={[styles.art, { backgroundColor: colors.muted }]}>
        <View style={styles.artControls}><View style={styles.artLabel}><Feather name="zap" size={13} color={colors.accent} /><Text style={[styles.artLabelText, { color: colors.foreground }]}>NEW WORD</Text></View><View style={styles.artControlButtons}><Pressable onPress={(event) => { event.stopPropagation(); onToggleSaved?.(); }} accessibilityLabel={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Feather name="bookmark" size={18} color={saved ? colors.accent : colors.foreground} /></Pressable><Pressable onPress={(event) => { event.stopPropagation(); onToggleArchived?.(); }} accessibilityLabel={archived ? 'Restaurar card arquivado' : 'Arquivar card'}><Feather name="archive" size={18} color={colors.foreground} /></Pressable></View></View>
        {!flipped ? <View style={styles.artCopy}><Text style={[styles.artTerm, { color: colors.foreground }]}>{card.term}</Text><Text style={[styles.artSubline, { color: colors.foreground }]}>{archived ? 'Arquivado' : 'Quer aprender?'}</Text></View> : null}
        <PronunciationButton term={card.term} color={colors.accent} activeColor={colors.foreground} compact />
      </View>
      <View style={styles.content}>
        <View style={styles.topline}>
          <View style={[styles.level, { backgroundColor: colors.muted }]}><Text style={[styles.levelText, { color: colors.mutedForeground }]}>{card.difficulty || 'REVISÃO'}</Text></View>
          <Pressable onPress={(event) => { event.stopPropagation(); complete(); }} testID={`review-card-${card.id}`} hitSlop={10} accessibilityLabel={reviewed ? 'Desmarcar como revisado' : 'Marcar como revisado'}>
            <Feather name={reviewed ? 'check-circle' : 'more-horizontal'} size={24} color={reviewed ? colors.primary : colors.mutedForeground} />
          </Pressable>
        </View>
         {!flipped ? <><View style={styles.termRow}><Text style={[styles.term, { color: colors.foreground }]}>{card.term}</Text><PronunciationButton term={card.term} color={colors.mutedForeground} activeColor={colors.primary} /></View><Text style={[styles.pronunciation, { color: colors.primary }]}>{card.pronunciation || 'inglês'}</Text>{card.visualCue ? <View style={[styles.visualCue, { backgroundColor: colors.secondary }]}><Feather name="eye" size={15} color={colors.primary} /><Text style={[styles.visualCueText, { color: colors.secondaryForeground }]}>{card.visualCue}</Text></View> : null}<Pressable onPress={(event) => { event.stopPropagation(); setFlipped((value) => !value); }} style={[styles.flipPrompt, { borderColor: colors.border }]} testID={`reveal-card-${card.id}`}><Text style={[styles.flipPromptText, { color: colors.foreground }]}>Quer aprender esta palavra?</Text><Text style={[styles.flipHint, { color: colors.mutedForeground }]}>toque para virar o card</Text></Pressable></> : <><View style={styles.termRow}><Text style={[styles.term, { color: colors.foreground }]}>{card.term}</Text><PronunciationButton term={card.term} color={colors.mutedForeground} activeColor={colors.primary} /></View><View style={[styles.backDefinition, { backgroundColor: colors.background }]}><Text style={[styles.backTranslation, { color: colors.foreground }]}>{card.translation}</Text><Text style={[styles.example, { color: colors.mutedForeground }]}>{card.example}</Text>{card.technique ? <Text style={[styles.technique, { color: colors.primary }]}>{card.technique}</Text> : null}</View><Pressable onPress={(event) => { event.stopPropagation(); setFlipped((value) => !value); }}><Text style={[styles.flipBack, { color: colors.primary }]}>Toque para voltar à frente</Text></Pressable></>}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <Pressable onPress={(event) => { event.stopPropagation(); onToggleArchived?.(); }} style={[styles.archiveButton, { borderColor: colors.border }]} accessibilityLabel={archived ? 'Restaurar card arquivado' : 'Arquivar card'}><Feather name="archive" size={16} color={colors.mutedForeground} /><Text style={[styles.archiveText, { color: colors.mutedForeground }]}>{archived ? 'Restaurar' : 'Arquivar'}</Text></Pressable>
          <Pressable onPress={(event) => { event.stopPropagation(); void Share.share({ message: `${card.term} — ${card.translation}` }); }} style={[styles.iconButton, { backgroundColor: colors.muted }]} accessibilityLabel="Compartilhar card"><Feather name="share-2" size={18} color={colors.foreground} /></Pressable>
          <Pressable onPress={(event) => { event.stopPropagation(); onMore?.(); }} style={[styles.iconButton, { backgroundColor: colors.muted }]} accessibilityLabel="Ver mais detalhes"><Feather name="more-horizontal" size={18} color={colors.foreground} /></Pressable>
            <Pressable onPress={(event) => { event.stopPropagation(); complete(); }} style={[styles.reviewButton, { borderColor: colors.primary, backgroundColor: reviewed ? colors.primary : 'transparent' }]}><Feather name={reviewed ? 'check' : 'check-circle'} size={17} color={reviewed ? colors.primaryForeground : colors.primary} /><Text style={[styles.reviewButtonText, { color: reviewed ? colors.primaryForeground : colors.primary }]}>{reviewed ? 'Aprendido' : 'Aprender'}</Text></Pressable>
        </View>
      </View>
    </Pressable>
  );
}

export function PronunciationButton({ term, color, activeColor, compact = false }: { term: string; color: string; activeColor: string; compact?: boolean }) {
  const { speechAccent } = useStudy();
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const requestRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    requestRef.current += 1;
    void Speech.stop();
  }, []);

  const finish = (request: number, failed = false) => {
    if (!mountedRef.current || request !== requestRef.current) return;
    setPlaying(false);
    setUnavailable(failed);
  };

  const speak = () => {
    const text = term.trim();
    const request = requestRef.current + 1;
    requestRef.current = request;

    if (!text) {
      finish(request, true);
      return;
    }

    setPlaying(true);
    setUnavailable(false);

    try {
      // Keep speak in the original press event. On web, awaiting voice
      // discovery first can consume the browser's user-activation window.
      void Speech.stop();
      Speech.speak(text, {
        language: speechAccent,
        rate: 0.9,
        onStart: () => {
          if (mountedRef.current && request === requestRef.current) setPlaying(true);
        },
        onDone: () => finish(request),
        onStopped: () => finish(request),
        onError: () => finish(request, true),
      });
    } catch {
      finish(request, true);
    }
  };

  return <Pressable
     style={compact ? [styles.play, { borderColor: playing ? activeColor : color }] : undefined}
     onPress={(event) => {
       event.stopPropagation();
      if (playing) {
        requestRef.current += 1;
        setPlaying(false);
        void Speech.stop().catch(() => setUnavailable(true));
        return;
      }
      speak();
    }}
    hitSlop={10}
    testID={`pronounce-${term}`}
    accessibilityRole="button"
    accessibilityLabel={unavailable ? 'Pronúncia indisponível' : playing ? `Parar pronúncia de ${term}` : `Ouvir pronúncia de ${term}`}
    accessibilityHint={unavailable ? 'A síntese de voz não está disponível neste dispositivo' : playing ? 'Interrompe o áudio' : 'Reproduz o termo em inglês'}
    accessibilityState={{ busy: playing }}
  >
     <Feather name={compact && !playing ? 'play' : 'volume-2'} size={compact ? 15 : 20} color={playing ? activeColor : color} />
     {!compact && (playing ? <Text style={[styles.audioStatus, { color: activeColor }]}>Ouvindo…</Text> : unavailable ? <Text style={[styles.audioStatus, { color }]}>Áudio indisponível</Text> : null)}
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  art: { minHeight: 292, justifyContent: 'space-between', position: 'relative' },
  artControls: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  artControlButtons: { flexDirection: 'row', gap: 18 },
  artCopy: { paddingHorizontal: 18, paddingBottom: 30 },
  artTerm: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1 },
  artSubline: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 5, opacity: .9 },
  artLabel: { position: 'absolute', top: 13, left: 15, flexDirection: 'row', alignItems: 'center', gap: 5 },
  artLabelText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  play: { position: 'absolute', right: 15, bottom: 13, width: 35, height: 35, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  content: { padding: 18, gap: 7 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  levelText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 5 },
  audioStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 2 },
  term: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  pronunciation: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  visualCue: { marginTop: 10, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  visualCueText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  definition: { borderRadius: 12, padding: 13, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  definitionText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  flipPrompt: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12, alignItems: 'center', gap: 4 },
  flipPromptText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  flipHint: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  backDefinition: { borderRadius: 14, padding: 14, marginTop: 12, gap: 8 },
  backTranslation: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  flipBack: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textAlign: 'center', marginVertical: 5 },
  exampleBox: { borderTopWidth: 1, marginTop: 8, paddingTop: 13, gap: 7 },
  example: { fontFamily: 'Inter_400Regular', fontStyle: 'italic', fontSize: 14, lineHeight: 20 },
  technique: { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 16 },
  actions: { borderTopWidth: 1, marginTop: 11, paddingTop: 13, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  archiveButton: { minHeight: 39, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  archiveText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  reviewButton: { flex: 1, minHeight: 39, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  reviewButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
});