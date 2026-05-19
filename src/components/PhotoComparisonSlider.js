import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export default function PhotoComparisonSlider({ photos, style }) {
  if (!photos || photos.length < 2) {
    return (
      <View style={[styles.placeholder, style]}>
        <Feather name="camera" size={20} color={COLORS.textMuted} />
        <Text style={styles.placeholderText}>
          {photos && photos.length === 1 ? 'Add more photos to compare progress' : 'Add photos to see your healing progress'}
        </Text>
      </View>
    );
  }

  const first = photos[0];
  const latest = photos[photos.length - 1];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.side}>
        <Image source={{ uri: first.uri }} style={styles.image} />
        <View style={styles.label}>
          <Text style={styles.labelText}>DAY {first.day_number}</Text>
        </View>
      </View>

      <View style={styles.divider}>
        <Feather name="chevrons-right" size={18} color={COLORS.accentDim} />
      </View>

      <View style={styles.side}>
        <Image source={{ uri: latest.uri }} style={styles.image} />
        <View style={[styles.label, styles.labelRight]}>
          <Text style={styles.labelText}>DAY {latest.day_number}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    height: 140,
  },
  side: {
    flex: 1,
    height: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  label: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  labelRight: {
    left: undefined,
    right: 6,
  },
  labelText: {
    color: COLORS.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    height: 80,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: 13,
    flex: 1,
  },
});
