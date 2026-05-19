import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export default function CareTaskItem({ task, checked, onToggle, tattooName }) {
  const timeLabel = task.time === 'morning' ? 'AM' : task.time === 'evening' ? 'PM' : null;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      {/* Premium circle checkbox */}
      <View
        style={[
          styles.checkbox,
          checked ? styles.checkboxChecked : styles.checkboxUnchecked,
        ]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.label, checked && styles.labelChecked]} numberOfLines={2}>
          {task.label}
        </Text>
        {tattooName ? (
          <Text style={styles.tattooName}>{tattooName.toUpperCase()}</Text>
        ) : null}
      </View>

      {/* Time badge */}
      {timeLabel ? (
        <View style={[
          styles.timeBadge,
          task.time === 'morning' ? styles.morningBadge : styles.eveningBadge,
        ]}>
          <Text style={[
            styles.timeText,
            task.time === 'morning' ? styles.morningText : styles.eveningText,
          ]}>
            {timeLabel}
          </Text>
        </View>
      ) : (
        <View style={styles.timeBadgePlaceholder} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderWidth: 0,
  },
  checkmark: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  labelChecked: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  tattooName: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  timeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  morningBadge: {
    backgroundColor: 'rgba(224,148,82,0.18)',
  },
  eveningBadge: {
    backgroundColor: 'rgba(82,146,192,0.18)',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  morningText: {
    color: COLORS.warning,
  },
  eveningText: {
    color: COLORS.info,
  },
  timeBadgePlaceholder: {
    width: 28,
  },
});
