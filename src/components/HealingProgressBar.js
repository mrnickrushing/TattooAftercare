import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import {
  getDayNumber,
  getStage,
  getStageInfo,
  getHealingProgress,
  getDaysUntilHealed,
  isHealed,
} from '../utils/healingStages';

const STAGE_KEYS = ['fresh', 'early', 'peeling', 'settling', 'healed'];

export default function HealingProgressBar({ dateTattooed, style }) {
  const progress = useRef(new Animated.Value(0)).current;
  const pct = getHealingProgress(dateTattooed);
  const day = getDayNumber(dateTattooed);
  const stageKey = getStage(dateTattooed);
  const stageInfo = getStageInfo(stageKey);
  const healed = isHealed(dateTattooed);
  const daysLeft = getDaysUntilHealed(dateTattooed);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: pct,
      useNativeDriver: false,
      tension: 40,
      friction: 8,
    }).start();
  }, [pct]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const currentStageIndex = STAGE_KEYS.indexOf(stageKey);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View
          style={[
            styles.stageBadge,
            {
              backgroundColor: stageInfo.color + '22',
              borderColor: stageInfo.color + '55',
            },
          ]}
        >
          <Text style={[styles.stageText, { color: stageInfo.color }]}>
            {stageInfo.name.toUpperCase()}
          </Text>
        </View>
        <Text>
          <Text style={styles.dayNumber}>Day {day}</Text>
          <Text style={styles.dayOf}> of 29</Text>
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: barWidth, backgroundColor: stageInfo.color }]}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {STAGE_KEYS.map((key, i) => {
            const isActive = key === stageKey;
            const isPast = currentStageIndex > i;
            return (
              <View
                key={key}
                style={[
                  styles.dot,
                  isActive && {
                    backgroundColor: COLORS.accent,
                    width: 10,
                    height: 10,
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
  container: {
    gap: 8,
  },
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
  track: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
