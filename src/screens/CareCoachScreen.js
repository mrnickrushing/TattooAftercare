import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getDayNumber, getStage, getStageInfo, isHealed } from '../utils/healingStages';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const TIPS = {
  fresh: ['Wash gently with clean hands', 'Pat dry with a clean towel', 'Use only a thin product layer if your artist said to moisturize', 'Avoid soaking and direct sun'],
  early: ['Keep the area clean', 'Wear loose clothing over the tattoo', 'Do not scratch', 'Keep pets and dirty surfaces away'],
  peeling: ['Do not pick flakes', 'Use a light fragrance free lotion if dry', 'Avoid swimming', 'Let peeling happen naturally'],
  settling: ['Protect from sun', 'Keep skin clean', 'Take a healed photo soon', 'Note any spots that may need a touch up'],
  healed: ['Use sunscreen on healed tattoos', 'Keep portfolio photos updated', 'Track touch ups', 'Save artist and shop info'],
};

export default function CareCoachScreen() {
  const insets = useSafeAreaInsets();
  const { tattoos } = useApp();
  const active = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const primary = active[0] || tattoos[0];
  const stage = primary ? getStage(primary.date_tattooed) : 'fresh';
  const info = getStageInfo(stage);
  const day = primary ? getDayNumber(primary.date_tattooed) : 1;
  const tips = TIPS[stage] || TIPS.fresh;

  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Care coach"
          title={primary ? `${primary.name}: Day ${day}` : 'Daily tattoo care coach'}
          subtitle={primary ? `${info.name} stage guidance. Use your artist instructions first.` : 'Add a tattoo to get day based care guidance.'}
          icon="activity"
          stats={[{ label: 'Stage', value: info.name || 'Fresh' }, { label: 'Day', value: day }, { label: 'Tips', value: tips.length }]}
        />

        <View style={styles.card}>
          <Text style={styles.accent}>Today</Text>
          <Text style={styles.cardTitle}>Care checklist</Text>
          {tips.map((item) => (
            <View key={item} style={styles.itemRow}>
              <View style={styles.dot} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.accent}>Keep in mind</Text>
          <Text style={styles.cardTitle}>When to ask for help</Text>
          <Text style={styles.itemText}>If something feels worse instead of better, or you are worried about how it looks, contact your artist or a medical professional.</Text>
        </View>
      </ScrollView>
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  card: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.card },
  accent: { color: COLORS.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.3, textTransform: 'uppercase', marginBottom: SPACING.xs },
  cardTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: SPACING.md },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, marginTop: 6 },
  itemText: { flex: 1, color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
});
