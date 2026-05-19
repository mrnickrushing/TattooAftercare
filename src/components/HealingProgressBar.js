import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { getDayNumber, getStage, getStageInfo, getHealingProgress, getDaysUntilHealed } from '../utils/healingStages';

export default function HealingProgressBar({ dateTattooed, style }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  const dayNumber = getDayNumber(dateTattooed);
  const stageKey = getStage(dateTattooed);
  const stageInfo = getStageInfo(stageKey);
  const progress = getHealingProgress(dateTattooed);
  const daysLeft = getDaysUntilHealed(dateTattooed);
  const healed = daysLeft === 0;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color }]}>
          <Text style={[styles.stageName, { color: stageInfo.color }]}>{stageInfo.name}</Text>
        </View>
        <Text style={styles.dayLabel}>
          {healed ? 'Healed!' : `Day ${dayNumber}`}
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: stageInfo.color,
              width: animatedWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.timeframe}>{stageInfo.timeframe}</Text>
        <Text style={styles.daysLeft}>
          {healed ? 'Portfolio ready!' : `${daysLeft} days to healed`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  stageName: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  dayLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeframe: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  daysLeft: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
});
