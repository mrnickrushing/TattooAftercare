import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function StreakBadge({ streak }) {
  if (!streak || streak === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>DAY STREAK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    gap: 4,
  },
  flame: {
    fontSize: 13,
  },
  count: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    color: COLORS.accentDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
