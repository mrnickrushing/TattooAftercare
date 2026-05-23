import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

/**
 * Standardized empty state for lists and screens.
 * Props:
 *   icon    — emoji string shown at top
 *   title   — bold heading
 *   body    — secondary description (optional)
 *   action  — { label: string, onPress: fn } renders a gold CTA button (optional)
 *   style   — override for the outer container (optional)
 *   children — renders below the action button (optional)
 */
export default function EmptyState({ icon, title, body, action, style, children }) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action ? (
        <TouchableOpacity
          style={styles.button}
          onPress={action.onPress}
          activeOpacity={0.85}
          accessibilityLabel={action.label}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xxl,
    gap: SPACING.md,
  },
  icon: { fontSize: 44 },
  title: {
    ...FONTS.headingMedium,
    textAlign: 'center',
  },
  body: {
    ...FONTS.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.gold,
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
