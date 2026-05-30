import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const TOOLS = [
  { title: 'Today Care Coach', body: 'Day based guidance, reminders, and what to watch for.', icon: 'activity', route: 'CareCoach' },
  { title: 'Symptom Check', body: 'Log redness, swelling, warmth, discharge, fever, and pain changes.', icon: 'alert-triangle', route: 'SymptomCheck' },
  { title: 'Saniderm Mode', body: 'Track wrap timing, leaks, removal windows, and follow up care.', icon: 'shield', route: 'SanidermMode' },
  { title: 'Photo Timeline', body: 'Compare healing photos and build a visual record.', icon: 'camera', route: 'PhotoTimeline' },
  { title: 'Prep Checklist', body: 'Plan your next appointment before the needle hits skin.', icon: 'calendar', route: 'AppointmentPrep' },
  { title: 'Settings & Backup', body: 'Export data, manage privacy, and tune reminders.', icon: 'settings', route: 'SettingsHub' },
];

export default function CareToolsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Care tools"
          title="Everything your tattoo needs after the session."
          subtitle="Use the quick tools for daily care, symptoms, Saniderm timing, photos, appointments, and backups."
          icon="tool"
          stats={[{ label: 'Coach', value: 'Daily' }, { label: 'Wraps', value: 'Tracked' }, { label: 'Backup', value: 'Ready' }]}
        />
        {TOOLS.map((tool) => (
          <TouchableOpacity key={tool.route} style={styles.toolCard} onPress={() => navigation.navigate(tool.route)} activeOpacity={0.85}>
            <View style={styles.iconWrap}><Feather name={tool.icon} size={22} color={COLORS.accent} /></View>
            <View style={styles.copy}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolBody}>{tool.body}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  toolCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.md, ...SHADOWS.card },
  iconWrap: { width: 48, height: 48, borderRadius: RADIUS.lg, backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  toolTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  toolBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
});
