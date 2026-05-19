import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

export default function PhotoComparisonSlider({ photos, style }) {
  if (!photos || photos.length < 2) {
    return (
      <View style={[styles.placeholderContainer, style]}>
        <Feather name="camera" size={24} color={COLORS.textMuted} />
        <Text style={styles.placeholderText}>
          {photos && photos.length === 1
            ? 'Add more photos to compare healing progress'
            : 'Add photos to track your healing progress'}
        </Text>
      </View>
    );
  }

  const firstPhoto = photos[0];
  const latestPhoto = photos[photos.length - 1];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.photoWrapper}>
        <Image source={{ uri: firstPhoto.uri }} style={styles.photo} resizeMode="cover" />
        <View style={styles.label}>
          <Text style={styles.labelText}>Day 1</Text>
        </View>
      </View>
      <View style={styles.divider}>
        <Feather name="chevrons-right" size={16} color={COLORS.accent} />
      </View>
      <View style={styles.photoWrapper}>
        <Image source={{ uri: latestPhoto.uri }} style={styles.photo} resizeMode="cover" />
        <View style={[styles.label, styles.labelRight]}>
          <Text style={styles.labelText}>
            {latestPhoto.day_number ? `Day ${latestPhoto.day_number}` : 'Latest'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  photoWrapper: {
    flex: 1,
    position: 'relative',
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  label: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  labelRight: {
    left: undefined,
    right: SPACING.xs,
  },
  labelText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  divider: {
    paddingHorizontal: 2,
  },
  placeholderContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
});
