import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { addCareLog } from '../database/db';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const CHECKS = [
  { key: 'redness', label: 'Redness spreading' },
  { key: 'swelling', label: 'Swelling getting worse' },
  { key: 'discharge', label: 'Fluid or discharge' },
  { key: 'fever', label: 'Fever or chills' },
  { key: 'itching', label: 'Severe itching' },
  { key: 'pain', label: 'Pain increasing' },
];

export default function SymptomCheckScreen() {
  const insets = useSafeAreaInsets();
  const { tattoos } = useApp();
  const [selectedTattooId, setSelectedTattooId] = useState(tattoos[0]?.id || null);
  const [checks, setChecks] = useState({});
  const selectedTattoo = tattoos.find((t) => t.id === selectedTattooId);
  const count = Object.values(checks).filter(Boolean).length;

  const status = useMemo(() => {
    if (checks.fever || checks.discharge || count >= 3) return { label: 'High concern', color: COLORS.danger, body: 'Save the log and reach out for help if you are worried.' };
    if (count > 0) return { label: 'Monitor closely', color: COLORS.warning, body: 'Track it today and check again later.' };
    return { label: 'Looks calm', color: COLORS.success, body: 'No selected warning signs. Keep following your care plan.' };
  }, [checks, count]);

  const toggle = (key) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    if (!selectedTattoo) {
      Alert.alert('Add a tattoo first', 'Symptom checks need to be attached to a tattoo.');
      return;
    }
    await addCareLog({
      tattoo_id: selectedTattoo.id,
      log_date: format(new Date(), 'yyyy-MM-dd'),
      washed: 0,
      moisturized: 0,
      peeling: 0,
      itching: checks.itching ? 1 : 0,
      redness: checks.redness ? 1 : 0,
      swelling: checks.swelling ? 1 : 0,
      discharge: checks.discharge ? 1 : 0,
      fever: checks.fever ? 1 : 0,
      health_status: count >= 3 || checks.fever || checks.discharge ? 'concern' : count > 0 ? 'watch' : 'good',
      notes: checks.pain ? 'Pain increasing was selected.' : null,
    });
    Alert.alert('Saved', 'Symptom check saved to today care log.');
  };

  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Symptom check"
          title="Catch changes early."
          subtitle="Use this as a simple tracker for changes you want to remember."
          icon="alert-triangle"
          stats={[{ label: 'Selected', value: count }, { label: 'Status', value: status.label }, { label: 'Save', value: 'Log' }]}
        />

        {tattoos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tattooPicker} contentContainerStyle={styles.tattooPickerContent}>
            {tattoos.map((tattoo) => (
              <TouchableOpacity key={tattoo.id} style={[styles.tattooChip, selectedTattooId === tattoo.id && styles.tattooChipActive]} onPress={() => setSelectedTattooId(tattoo.id)} activeOpacity={0.8}>
                <Text style={[styles.tattooChipText, selectedTattooId === tattoo.id && styles.tattooChipTextActive]}>{tattoo.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>{status.label}</Text>
            <Text style={styles.statusBody}>{status.body}</Text>
          </View>
        </View>

        {CHECKS.map((item) => (
          <TouchableOpacity key={item.key} style={[styles.checkRow, checks[item.key] && styles.checkRowActive]} onPress={() => toggle(item.key)} activeOpacity={0.82}>
            <View style={[styles.checkBox, checks[item.key] && styles.checkBoxActive]}>
              {checks[item.key] ? <Feather name="check" size={15} color={COLORS.textInverse} /> : null}
            </View>
            <Text style={styles.checkText}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.saveBtn} onPress={save} activeOpacity={0.85}>
          <Text style={styles.saveText}>Save Check</Text>
        </TouchableOpacity>
      </ScrollView>
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  tattooPicker: { marginBottom: SPACING.md, marginHorizontal: -SPACING.lg },
  tattooPickerContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  tattooChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(34,21,16,0.9)', borderWidth: 1, borderColor: COLORS.borderGold },
  tattooChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  tattooChipText: { color: COLORS.textMuted, fontWeight: '800' },
  tattooChipTextActive: { color: COLORS.textInverse },
  statusCard: { flexDirection: 'row', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.card },
  statusDot: { width: 14, height: 14, borderRadius: 7, marginTop: 4 },
  statusCopy: { flex: 1 },
  statusLabel: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statusBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.sm },
  checkRowActive: { borderColor: COLORS.warning, backgroundColor: COLORS.warningMuted },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: COLORS.borderGold, alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  checkText: { flex: 1, color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
  saveBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  saveText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '900' },
});
