import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { getStage, getStageInfo, getDayNumber } from '../utils/healingStages';
import HealingProgressBar from './HealingProgressBar';

export default function TattooCard({ tattoo, onPress }) {
  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const dayNumber = getDayNumber(tattoo.date_tattooed);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topRow}>
        {tattoo.thumbnail_uri ? (
          <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Feather name="image" size={20} color={COLORS.textMuted} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{tattoo.name}</Text>
          {tattoo.placement ? (
            <Text style={styles.placement} numberOfLines={1}>{tattoo.placement}</Text>
          ) : null}
          {tattoo.artist_name ? (
            <Text style={styles.artist} numberOfLines={1}>by {tattoo.artist_name}</Text>
          ) : null}
          <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color }]}>
            <Text style={[styles.stageText, { color: stageInfo.color }]}>{stageInfo.name}</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
      </View>
      <View style={styles.progressContainer}>
        <HealingProgressBar dateTattooed={tattoo.date_tattooed} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  placement: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  artist: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  stageText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  progressContainer: {
    marginTop: SPACING.xs,
  },
});
