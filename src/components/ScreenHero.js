import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function ScreenHero({
  eyebrow,
  title,
  subtitle,
  icon = 'star',
  stats = [],
  children,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.glow} pointerEvents="none">
        <LinearGradient
          colors={['rgba(200,169,81,0.20)', 'rgba(139,26,26,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowFill}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.cornerTop} />
        <View style={styles.cornerBottom} />

        <View style={styles.topRow}>
          <View style={styles.badgeOuter}>
            <View style={styles.badgeInner}>
              <Feather name={icon} size={22} color={COLORS.accent} />
            </View>
          </View>

          <View style={styles.copy}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {stats.length > 0 ? (
          <View style={styles.statsRow}>
            {stats.map((item) => (
              <View key={item.label} style={styles.statPill}>
                <Text style={styles.statValue}>{item.value}</Text>
                <Text style={styles.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: SPACING.lg,
  },
  glow: {
    position: 'absolute',
    left: -34,
    top: -34,
    width: 260,
    height: 180,
  },
  glowFill: {
    flex: 1,
    borderRadius: 140,
  },
  card: {
    backgroundColor: 'rgba(34,21,16,0.96)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.goldStrong,
  },
  cornerTop: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  cornerBottom: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 34,
    height: 34,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  badgeOuter: {
    width: 54,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(200,169,81,0.12)',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(200,169,81,0.08)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
