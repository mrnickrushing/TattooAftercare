import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import {
  getDayNumber,
  getStage,
  getStageInfo,
  getHealingProgress,
  getDaysUntilHealed,
  isHealed,
} from '../utils/healingStages';

// Stage boundary positions along the 29-day track (day / 29)
const STAGE_BOUNDARIES = [
  { key: 'fresh',    label: 'FRESH',    endDay: 3 },
  { key: 'early',    label: 'EARLY',    endDay: 7 },
  { key: 'peeling',  label: 'PEEL',     endDay: 14 },
  { key: 'settling', label: 'SETTLE',   endDay: 21 },
  { key: 'healed',   label: 'HEALED',   endDay: 29 },
];
const TOTAL_DAYS = 29;

export default function HealingProgressBar({ dateTattooed, style }) {
  const animProgress = useRef(new Animated.Value(0)).current;
  const pct = getHealingProgress(dateTattooed);
  const day = getDayNumber(dateTattooed);
  const stageKey = getStage(dateTattooed);
  const stageInfo = getStageInfo(stageKey);
  const healed = isHealed(dateTattooed);
  const daysLeft = getDaysUntilHealed(dateTattooed);

  useEffect(() => {
    // Animate from 0 → actual progress on mount
    Animated.timing(animProgress, {
      toValue: pct,
      duration: 700,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const barWidth = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentStageIndex = STAGE_BOUNDARIES.findIndex(s => s.key === stageKey);

  return (
    <View style={[styles.container, style]}>
      {/* Header row: stage badge + day counter */}
      <View style={styles.header}>
        <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color + '55' }]}>
          <Text style={[styles.stageText, { color: stageInfo.color }]}>{stageInfo.name.toUpperCase()}</Text>
        </View>
        <Text>
          <Text style={styles.dayNumber}>Day {day}</Text>
          <Text style={styles.dayOf}> of {TOTAL_DAYS}</Text>
        </Text>
      </View>

      {/* Progress track with segment markers */}
      <View style={styles.trackWrapper}>
        {/* Background track */}
        <View style={styles.track}>
          {/* Animated fill */}
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: stageInfo.color }]} />
        </View>

        {/* Stage boundary dividers drawn on top of track */}
        {STAGE_BOUNDARIES.slice(0, -1).map(({ key, endDay }) => {
          const pos = endDay / TOTAL_DAYS;
          const bIndex = STAGE_BOUNDARIES.findIndex(s => s.key === key);
          const isPast = currentStageIndex > bIndex;
          return (
            <View
              key={key}
              style={[
                styles.stageDivider,
                { left: `${pos * 100}%` },
                isPast && { backgroundColor: stageInfo.color },
              ]}
            />
          );
        })}
      </View>

      {/* Stage labels below track */}
      <View style={styles.stageLabels}>
        {STAGE_BOUNDARIES.map(({ key, label, endDay }, i) => {
          const startDay = i === 0 ? 0 : STAGE_BOUNDARIES[i - 1].endDay;
          const midPct = ((startDay + endDay) / 2) / TOTAL_DAYS;
          const isActive = key === stageKey;
          const isPast = currentStageIndex > i;
          return (
            <View key={key} style={[styles.stageLabel, { flex: endDay - startDay }]}>
              <Text style={[
                styles.stageLabelText,
                isActive && { color: stageInfo.color, fontWeight: '700' },
                isPast && { color: COLORS.accentDim },
                !isActive && !isPast && { color: COLORS.textMuted },
              ]}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Footer: dots + days left */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          {STAGE_BOUNDARIES.map(({ key }, i) => {
            const isActive = key === stageKey;
            const isPast = currentStageIndex > i;
            return (
              <View
                key={key}
                style={[
                  styles.dot,
                  isActive && {
                    backgroundColor: COLORS.accent,
                    width: 10, height: 10,
                    shadowColor: stageInfo.color,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 4,
                    elevation: 4,
                  },
                  isPast && !isActive && { backgroundColor: COLORS.accentDim, width: 8, height: 8 },
                  !isActive && !isPast && { backgroundColor: COLORS.border },
                ]}
              />
            );
          })}
        </View>
        <Text style={[styles.daysLeft, healed && { color: COLORS.success }]}>
          {healed ? '✓  Fully Healed' : `${daysLeft}d to healed`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayOf: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textMuted,
  },
  trackWrapper: {
    position: 'relative',
    height: 8,
  },
  track: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  stageDivider: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 8,
    marginLeft: -1,
    backgroundColor: 'rgba(12,11,8,0.6)',
    zIndex: 2,
  },
  stageLabels: {
    flexDirection: 'row',
    marginTop: 2,
  },
  stageLabel: {
    alignItems: 'center',
  },
  stageLabelText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  daysLeft: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
});
