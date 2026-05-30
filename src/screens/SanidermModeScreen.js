import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const STORAGE_KEY = 'saniderm_mode_state_v1';

export default function SanidermModeScreen() {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(false);
  const [appliedAt, setAppliedAt] = useState('');
  const [removedAt, setRemovedAt] = useState('');
  const [leak, setLeak] = useState(false);
  const [secondWrap, setSecondWrap] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        setEnabled(!!saved.enabled);
        setAppliedAt(saved.appliedAt || '');
        setRemovedAt(saved.removedAt || '');
        setLeak(!!saved.leak);
        setSecondWrap(!!saved.secondWrap);
      } catch {}
    });
  }, []);

  const save = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, appliedAt, removedAt, leak, secondWrap }));
    Alert.alert('Saved', 'Saniderm mode settings saved.');
  };

  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Saniderm mode"
          title="Track wrap timing without guessing."
          subtitle="Save wrap times, leak status, and second wrap notes. Follow your artist first when instructions differ."
          icon="shield"
          stats={[{ label: 'Mode', value: enabled ? 'On' : 'Off' }, { label: 'Leak', value: leak ? 'Yes' : 'No' }, { label: 'Wrap 2', value: secondWrap ? 'Yes' : 'No' }]}
        />

        <ToggleCard label="Saniderm tracking" body="Turn this on when your tattoo is covered with a film wrap." value={enabled} onPress={() => setEnabled(!enabled)} />
        <ToggleCard label="Leak noticed" body="Mark this if fluid has leaked outside the wrap." value={leak} onPress={() => setLeak(!leak)} />
        <ToggleCard label="Second wrap applied" body="Use this if your artist had you replace the first wrap." value={secondWrap} onPress={() => setSecondWrap(!secondWrap)} />

        <View style={styles.card}>
          <Text style={styles.label}>Applied time</Text>
          <TextInput style={styles.input} value={appliedAt} onChangeText={setAppliedAt} placeholder="Example: Today 6:30 PM" placeholderTextColor={COLORS.textMuted} />
          <Text style={styles.label}>Removed time</Text>
          <TextInput style={styles.input} value={removedAt} onChangeText={setRemovedAt} placeholder="Add when removed" placeholderTextColor={COLORS.textMuted} />
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Wrap checklist</Text>
          {['Keep the wrap sealed unless your artist told you otherwise', 'Avoid soaking', 'Watch for leaks around the edges', 'Switch to normal care after removal'].map((item) => (
            <View key={item} style={styles.tipRow}><View style={styles.dot} /><Text style={styles.tipText}>{item}</Text></View>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveText}>Save Saniderm Mode</Text>
        </TouchableOpacity>
      </ScrollView>
    </TattooBackground>
  );
}

function ToggleCard({ label, body, value, onPress }) {
  return (
    <TouchableOpacity style={[styles.toggleCard, value && styles.toggleCardActive]} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.toggleCopy}><Text style={styles.toggleTitle}>{label}</Text><Text style={styles.toggleBody}>{body}</Text></View>
      <View style={[styles.switch, value && styles.switchActive]}><Feather name={value ? 'check' : 'circle'} size={16} color={value ? COLORS.textInverse : COLORS.textMuted} /></View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.card },
  toggleCardActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentMuted },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  toggleBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  switch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderGold, alignItems: 'center', justifyContent: 'center' },
  switchActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  card: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginVertical: SPACING.md, ...SHADOWS.card },
  label: { color: COLORS.textMuted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 14, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tipCard: { backgroundColor: 'rgba(34,21,16,0.82)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.md },
  tipTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', marginBottom: SPACING.md },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 },
  tipText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  saveText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '900' },
});
