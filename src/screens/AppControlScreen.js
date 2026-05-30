import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

export default function AppControlScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero eyebrow="Control" title="Tune the app around your care routine." subtitle="Jump into reminder settings and review planned pro controls." icon="settings" stats={[{ label: 'Alerts', value: 'Ready' }, { label: 'Tools', value: 'On' }, { label: 'More', value: 'Soon' }]} />
        <Row icon="bell" title="Notification settings" body="Open reminder and notification controls." onPress={() => navigation.navigate('NotificationSettings')} />
        <Row icon="download" title="Export tools" body="Coming next build." />
        <Row icon="eye-off" title="Private gallery" body="Coming next build." />
      </ScrollView>
    </TattooBackground>
  );
}

function Row({ icon, title, body, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.iconWrap}><Feather name={icon} size={20} color={COLORS.accent} /></View>
      <View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>
      {onPress && <Feather name="chevron-right" size={18} color={COLORS.textMuted} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg, marginBottom: SPACING.sm, ...SHADOWS.card },
  iconWrap: { width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '900', marginBottom: 4 },
  body: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
});
