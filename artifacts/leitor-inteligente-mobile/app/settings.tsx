import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useColors } from '@/hooks/useColors';
import { defaults, Preferences, validateImportedPreferences } from '@/lib/preferences';
import { useStudy } from '@/context/StudyContext';

const ACCENTS = [
  { value: 'en-US' as const, title: 'Americano', subtitle: 'English (United States)' },
  { value: 'en-GB' as const, title: 'Britânico', subtitle: 'English (United Kingdom)' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { preferences, setPreferences } = useStudy();
  const [preview, setPreview] = useState<Preferences | null>(null);
  const [message, setMessage] = useState('');
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    void setPreferences({ ...preferences, [key]: value });
  };

  const exportPreferences = async () => {
    try {
      const uri = `${FileSystem.cacheDirectory}leitor-inteligente-preferencias.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify({ version: 1, preferences }, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Exportar preferências' });
      } else {
        await Share.share({ message: JSON.stringify({ version: 1, preferences }, null, 2), title: 'Preferências do Leitor Inteligente' });
      }
    } catch {
      setMessage('Não foi possível exportar as preferências.');
    }
  };

  const importPreferences = async () => {
    setMessage('');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size && file.size > 1024 * 1024) {
        setMessage('O ficheiro é demasiado grande. Escolhe um JSON com menos de 1 MB.');
        return;
      }
      const content = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const validated = validateImportedPreferences(JSON.parse(content) as unknown);
      if (!validated.valid) {
        setMessage(validated.error);
        return;
      }
      setPreview(validated.preferences);
    } catch {
      setMessage('Não foi possível ler o ficheiro. Escolhe um JSON válido de preferências.');
    }
  };

  const applyPreview = async () => {
    if (!preview) return;
    try {
      await setPreferences(preview);
      setPreview(null);
      setMessage('Preferências importadas e guardadas neste dispositivo.');
    } catch {
      setMessage('Não foi possível guardar as preferências neste dispositivo.');
    }
  };

  const preferenceSummary = (value: Preferences) => [
    ['Motor', value.provider === 'ollama' ? 'Local · Ollama' : 'Online · OpenRouter'],
    ['Modelo', value.model],
    ['Nível', value.level],
    ['Minutos por dia', value.dailyGoal],
    ['Pronúncia', `${value.showPronunciation ? 'Visível' : 'Oculta'} · ${value.speechAccent === 'en-US' ? 'Americano' : 'Britânico'}`],
    ['Lembretes', value.gentleReminders ? 'Ativados' : 'Desativados'],
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>PREFERÊNCIAS DE ESTUDO</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Um ritmo que é seu.</Text>
        <Text style={[styles.description, { color: colors.mutedForeground }]}>As escolhas ficam neste aparelho e funcionam offline. Você pode levá-las para outro dispositivo através de um ficheiro.</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>GUARDAR E RECUPERAR</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>Use o mesmo JSON exportado pela página Preferências na web.</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => void exportPreferences()} style={[styles.action, { borderColor: colors.border }]} accessibilityLabel="Exportar preferências">
            <Feather name="download" size={17} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Exportar JSON</Text>
          </Pressable>
          <Pressable onPress={() => void importPreferences()} style={[styles.action, { borderColor: colors.border }]} accessibilityLabel="Importar preferências">
            <Feather name="upload" size={17} color={colors.primary} /><Text style={[styles.actionText, { color: colors.foreground }]}>Importar JSON</Text>
          </Pressable>
        </View>
        {message ? <Text style={[styles.message, { color: message.includes('Não') || message.includes('invál') || message.includes('incompat') ? colors.destructive : colors.secondaryForeground }]}>{message}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>SOTAQUE DA PRONÚNCIA</Text>
        {ACCENTS.map((accent) => {
          const selected = preferences.speechAccent === accent.value;
          return <Pressable key={accent.value} onPress={() => update('speechAccent', accent.value)} style={[styles.option, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]} accessibilityRole="radio" accessibilityState={{ selected }}>
            <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.mutedForeground }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}</View>
            <View style={styles.optionCopy}><Text style={[styles.optionTitle, { color: colors.foreground }]}>{accent.title}</Text><Text style={[styles.optionSubtitle, { color: colors.mutedForeground }]}>{accent.subtitle}</Text></View>
            {selected ? <Feather name="check" size={20} color={colors.primary} /> : null}
          </Pressable>;
        })}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AMBIENTE DE ESTUDO</Text>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>Estas escolhas também são levadas no ficheiro para manter web e mobile consistentes.</Text>
        <Text style={[styles.label, { color: colors.foreground }]}>Nível de inglês</Text>
        <TextInput value={preferences.level} onChangeText={(value) => update('level', value)} style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.foreground }]}>Minutos por dia</Text>
        <TextInput value={preferences.dailyGoal} onChangeText={(value) => update('dailyGoal', value)} keyboardType="number-pad" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} />
        <Toggle label="Mostrar pronúncia" value={preferences.showPronunciation} onPress={() => update('showPronunciation', !preferences.showPronunciation)} colors={colors} />
        <Toggle label="Lembretes gentis" value={preferences.gentleReminders} onPress={() => update('gentleReminders', !preferences.gentleReminders)} colors={colors} />
      </View>

      {preview ? <View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.eyebrow, { color: colors.primary }]}>PRÉ-VISUALIZAÇÃO</Text><Text style={[styles.modalTitle, { color: colors.foreground }]}>Rever preferências</Text><Text style={[styles.helper, { color: colors.mutedForeground }]}>Confirme as escolhas antes de as aplicar neste dispositivo.</Text>{preferenceSummary(preview).map(([label, value]) => <View key={label} style={styles.summaryRow}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text></View>)}<View style={styles.actions}><Pressable onPress={() => setPreview(null)} style={[styles.action, { borderColor: colors.border }]}><Text style={[styles.actionText, { color: colors.foreground }]}>Cancelar</Text></Pressable><Pressable onPress={() => void applyPreview()} style={[styles.action, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[styles.actionText, { color: colors.primaryForeground }]}>Aplicar</Text></Pressable></View></View></View> : null}
    </ScrollView>
  );
}

function Toggle({ label, value, onPress, colors }: { label: string; value: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return <Pressable onPress={onPress} style={styles.toggle} accessibilityRole="switch" accessibilityState={{ checked: value }}><Text style={[styles.label, { color: colors.foreground }]}>{label}</Text><View style={[styles.toggleTrack, { backgroundColor: value ? colors.primary : colors.muted }]}><View style={[styles.toggleThumb, { backgroundColor: colors.card, alignSelf: value ? 'flex-end' : 'flex-start' }]} /></View></Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 24, gap: 28, paddingBottom: 48 }, intro: { gap: 10 }, eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4 }, title: { fontFamily: 'Inter_700Bold', fontSize: 30, lineHeight: 34, letterSpacing: -1 }, description: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 }, section: { gap: 12, borderWidth: 1, borderRadius: 18, padding: 17 }, sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.2 }, helper: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }, actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, action: { minHeight: 44, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 }, option: { minHeight: 78, borderWidth: 1, borderRadius: 18, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 14 }, radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 12, height: 12, borderRadius: 6 }, optionCopy: { flex: 1, gap: 3 }, optionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 }, optionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 }, message: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19 }, label: { fontFamily: 'Inter_600SemiBold', fontSize: 14 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontFamily: 'Inter_400Regular', fontSize: 15 }, toggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, toggleTrack: { width: 46, height: 27, borderRadius: 14, padding: 3, justifyContent: 'center' }, toggleThumb: { width: 21, height: 21, borderRadius: 11 }, modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,25,35,0.55)', justifyContent: 'center', padding: 20 }, modal: { borderWidth: 1, borderRadius: 22, padding: 20, gap: 12 }, modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 }, summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 5 }, summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 13 }, summaryValue: { flex: 1, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});