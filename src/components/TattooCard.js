import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getStage, getStageInfo, getDayNumber } from '../utils/healingStages';
import HealingProgressBar from './HealingProgressBar';

export default function TattooCard({ tattoo, onPress }) {
  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const initial = tattoo.name ? tattoo.name.charAt(0).toUpperCase() : '?';
  const dayNumber = getDayNumber(tattoo.date_tattooed);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderTopWidth: 3,
          borderTopColor: stageInfo.color,
          // Stage-color glow shadow
          shadowColor: stageInfo.color,
          shadowOpacity: 0.28,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 14,
          elevation: 8,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Left photo strip */}
      <View style={styles.photoStrip}>
        {tattoo.thumbnail_uri ? (
          <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            {/* Metallic diagonal shimmer */}
            <LinearGradient
              colors={['#1C1C1A', '#2E2C25', '#1C1C1A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.initialText}>{initial}</Text>
          </View>
        )}
        {/* Day pill */}
        <View style={styles.dayPill}>
          <Text style={styles.dayPillText}>Day {dayNumber}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topSection}>
          <Text style={styles.name} numberOfLines={1}>{tattoo.name}</Text>
          {tattoo.placement ? <Text style={styles.placement}>{tattoo.placement}</Text> : null}
          {tattoo.artist_name ? (
            <Text style={styles.artist}>
              <Text style={styles.artistBy}>by </Text>
              {tattoo.artist_name}
            </Text>
          ) : null}
        </View>
        <HealingProgressBar dateTattooed={tattoo.date_tattooed} style={styles.progressBar} />
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  photoStrip: {
    width: 90,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    minHeight: 130,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    minHeight: 130,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initialText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  dayPill: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(10,10,10,0.80)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  dayPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    justifyContent: 'space-between',
  },
  topSection: {
    gap: 3,
    marginBottom: SPACING.sm,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
    color: COLORS.textPrimary,
  },
  placement: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  artist: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  artistBy: {
    fontStyle: 'italic',
  },
  progressBar: {
    marginTop: 4,
  },
  chevron: {
    justifyContent: 'center',
    paddingRight: SPACING.sm,
  },
});
