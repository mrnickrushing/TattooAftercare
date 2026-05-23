/**
 * BadgeCabinetScreen.js
 * Displays all badges — earned (lit) and locked (dimmed).
 * Also shows the Style Passport (styles collected so far).
 * Route: navigate('BadgeCabinet', { userId })
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Animated, TouchableOpacity, Modal,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getUserBadges as getEarnedBadges, BADGE_TYPES, BADGE_META } from '../database/socialDb';
import { getUserStylePassport } from '../database/exploreDb';
import { getStyleById } from '../constants/tattooStyles';

const ALL_BADGES = Object.values(BADGE_TYPES);

function BadgeTile({ badgeType, earned }) {
  const meta = BADGE_META[badgeType] || { icon: '🏅', label: badgeType, desc: '' };
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [tooltipVisible, setTooltipVisible] = useState(false);

  useEffect(() => {
    if (!earned) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [earned]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <>
      <TouchableOpacity
        onPress={!earned ? () => setTooltipVisible(true) : undefined}
        activeOpacity={earned ? 1 : 0.75}
        style={[styles.badgeTile, earned ? styles.badgeTileEarned : styles.badgeTileLocked]}
      >
        {earned && (
          <Animated.View
            style={[
              styles.badgeGlow,
              { opacity: glowOpacity, transform: [{ scale: glowScale }] },
            ]}
          />
        )}
        <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>{meta.icon}</Text>
        <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]} numberOfLines={2}>
          {meta.label}
        </Text>
        {earned ? (
          <View style={styles.earnedPip} />
        ) : (
          <Text style={styles.lockedText}>Tap to unlock</Text>
        )}
      </TouchableOpacity>

      {tooltipVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setTooltipVisible(false)}>
          <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={() => setTooltipVisible(false)}>
            <View style={styles.tooltipCard}>
              <Text style={styles.tooltipIcon}>{meta.icon}</Text>
              <Text style={styles.tooltipTitle}>{meta.label}</Text>
              <Text style={styles.tooltipDesc}>{meta.desc || 'Keep caring for your tattoos to unlock this badge.'}</Text>
              <Text style={styles.tooltipClose}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

function StylePassportRow({ entry, animValue }) {
  const meta = getStyleById(entry.style);
  const targetFraction = Math.min(entry.count * 0.2, 1);
  const width = animValue.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${targetFraction * 100}%`] });
  return (
    <View style={styles.passportRow}>
      <Text style={styles.passportEmoji}>{meta.emoji}</Text>
      <Text style={styles.passportLabel}>{meta.label}</Text>
      <View style={styles.passportBar}>
        <Animated.View style={[styles.passportFill, { width }]} />
      </View>
      <Text style={styles.passportCount}>{entry.count}</Text>
    </View>
  );
}

export default function BadgeCabinetScreen({ route }) {
  const userId = route?.params?.userId;
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [passport, setPassport] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [badges, styles] = await Promise.all([
        getEarnedBadges(userId),
        getUserStylePassport(userId),
      ]);
      setEarnedBadges(badges.map((b) => b.badge_type));
      setPassport(styles);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const earnedCount = earnedBadges.length;
  const total = ALL_BADGES.length;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: total > 0 ? earnedCount / total : 0,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [earnedCount, total]);

  const passportProgressAnim = useRef(new Animated.Value(0)).current;

  const animatePassportBars = useCallback(() => {
    Animated.timing(passportProgressAnim, {
      toValue: 1,
      duration: 700,
      delay: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  useEffect(() => { if (passport.length > 0) animatePassportBars(); }, [passport]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Progress header */}
      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>BADGES EARNED</Text>
        <Text style={styles.progressCount}>
          <Text style={styles.progressAccent}>{earnedCount}</Text>
          <Text style={styles.progressTotal}> / {total}</Text>
        </Text>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        </View>
      </View>

      {/* Badge grid */}
      <Text style={styles.sectionHeader}>ALL BADGES</Text>
      <View style={styles.badgeGrid}>
        {ALL_BADGES.map((type) => (
          <BadgeTile key={type} badgeType={type} earned={earnedBadges.includes(type)} />
        ))}
      </View>

      {/* Style Passport */}
      {passport.length > 0 && (
        <View style={styles.passportSection}>
          <Text style={styles.sectionHeader}>STYLE PASSPORT</Text>
          <Text style={styles.passportSubtitle}>Styles you've collected across your tattoos</Text>
          <View style={styles.passportList}>
            {passport.map((entry) => (
              <StylePassportRow key={entry.style} entry={entry} animValue={passportProgressAnim} />
            ))}
          </View>
          {passport.length < 3 && (
            <Text style={styles.passportHint}>
              Collect {3 - passport.length} more style{3 - passport.length !== 1 ? 's' : ''} to earn the Style Passport badge 🗺️
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  progressCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderGold,
    padding: SPACING.xl, gap: SPACING.sm, alignItems: 'center',
    ...SHADOWS.card,
  },
  progressLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  progressCount: { flexDirection: 'row', alignItems: 'baseline' },
  progressAccent: { color: COLORS.accent, fontSize: 40, fontWeight: '800' },
  progressTotal: { color: COLORS.textMuted, fontSize: 18, fontWeight: '600' },
  progressBarBg: {
    width: '100%', height: 6, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.full,
  },
  sectionHeader: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, marginBottom: -SPACING.sm,
  },
  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  badgeTile: {
    width: '30%', flexGrow: 1,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, padding: SPACING.md,
    alignItems: 'center', gap: SPACING.xs,
  },
  badgeTileEarned: { borderColor: COLORS.borderGold, ...SHADOWS.card },
  badgeTileLocked: { borderColor: COLORS.border, opacity: 0.55 },
  badgeGlow: {
    position: 'absolute', top: -4, left: -4, right: -4, bottom: -4,
    borderRadius: RADIUS.lg + 4,
    backgroundColor: COLORS.accent,
  },
  tooltipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
  tooltipCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.xl, width: '78%', alignItems: 'center', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  tooltipIcon: { fontSize: 40, marginBottom: SPACING.xs },
  tooltipTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  tooltipDesc: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  tooltipClose: { color: COLORS.textMuted, fontSize: 11, marginTop: SPACING.sm },
  badgeIcon: { fontSize: 30 },
  badgeIconLocked: { opacity: 0.4 },
  badgeLabel: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '600',
    textAlign: 'center', lineHeight: 15,
  },
  badgeLabelLocked: { color: COLORS.textMuted },
  earnedPip: {
    width: 8, height: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
  },
  lockedText: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  passportSection: { gap: SPACING.md },
  passportSubtitle: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginTop: -SPACING.xs },
  passportList: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.md, gap: SPACING.md,
  },
  passportRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  passportEmoji: { fontSize: 16, width: 22, textAlign: 'center' },
  passportLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', width: 100 },
  passportBar: {
    flex: 1, height: 4, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, overflow: 'hidden',
  },
  passportFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.full },
  passportCount: { color: COLORS.accent, fontSize: 12, fontWeight: '700', width: 20, textAlign: 'right' },
  passportHint: {
    color: COLORS.textMuted, fontSize: 12, textAlign: 'center',
    lineHeight: 18, paddingHorizontal: SPACING.lg,
  },
});
