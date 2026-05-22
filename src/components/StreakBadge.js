import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function StreakBadge({ streak }) {
  if (!streak || streak === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>DAY{'\n'}STREAK</Text>
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
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  flame: {
    fontSize: 14,
  },
  count: {
    color: COLORS.accent,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    color: COLORS.accentDim,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    lineHeight: 11,
  },
});
