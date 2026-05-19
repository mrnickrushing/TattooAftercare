import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function StreakBadge({ streak }) {
  if (!streak || streak === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>{streak === 1 ? 'day' : 'days'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    gap: 3,
  },
  flame: {
    fontSize: 14,
  },
  count: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
});
