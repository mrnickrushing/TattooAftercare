import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/theme';

export default function CareTaskItem({ task, checked, onToggle, tattooName }) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={[styles.checkbox, checked && styles.checkboxChecked]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.label, checked && styles.labelChecked]}>
          {task.label}
        </Text>
        {tattooName && (
          <Text style={styles.tattooName}>{tattooName}</Text>
        )}
      </View>

      <View style={[styles.timeBadge, task.time === 'morning' ? styles.morningBadge : task.time === 'evening' ? styles.eveningBadge : styles.anytimeBadge]}>
        <Text style={styles.timeText}>
          {task.time === 'morning' ? 'AM' : task.time === 'evening' ? 'PM' : '·'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  checkmark: {
    color: '#000',
    fontSize: 13,
    fontWeight: FONTS.weights.bold,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
  },
  labelChecked: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  tattooName: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  timeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  morningBadge: { backgroundColor: '#E09452' + '30' },
  eveningBadge: { backgroundColor: '#5292C0' + '30' },
  anytimeBadge: { backgroundColor: COLORS.surface },
  timeText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.semibold,
  },
});
