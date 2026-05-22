/**
 * HealingProgressBar — SVG gradient fill with stage color
 * Requires: react-native-svg (already in expo SDK)
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getStage, getStageInfo, getHealingProgress } from '../utils/healingStages';

export default function HealingProgressBar({ dateTattooed, style }) {
  const stageKey = getStage(dateTattooed);
  const stageInfo = getStageInfo(stageKey);
  const progress = getHealingProgress(dateTattooed); // 0–1

  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animProgress.setValue(0);
    Animated.timing(animProgress, {
      toValue: progress,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const BAR_HEIGHT = 6;
  const BAR_RADIUS = 4;
  const TRACK_W = '100%'; // rendered by parent flex

  return (
    <View style={[styles.container, style]}>
      {/* Track */}
      <View style={styles.track}>
        {/* SVG gradient fill bar */}
        <Animated.View
          style={[
            styles.fillWrap,
            {
              width: animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        >
          <Svg height={BAR_HEIGHT} width="100%" style={{ borderRadius: BAR_RADIUS, overflow: 'hidden' }}>
            <Defs>
              <SvgLinearGradient id="pgGrad" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={stageInfo.color} stopOpacity="0.6" />
                <Stop offset="1" stopColor={stageInfo.color} stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={BAR_HEIGHT} fill="url(#pgGrad)" rx={BAR_RADIUS} ry={BAR_RADIUS} />
          </Svg>
        </Animated.View>
      </View>

      {/* Stage label */}
      <View style={styles.labelRow}>
        <View style={[styles.stageDot, { backgroundColor: stageInfo.color }]} />
        <Text style={[styles.stageLabel, { color: stageInfo.color }]}>
          {stageInfo.name}
        </Text>
        <Text style={styles.pctLabel}>{Math.round(progress * 100)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  track: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  fillWrap: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: RADIUS.full,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stageDot: {
    width: 5,
    height: 5,
    borderRadius: RADIUS.full,
  },
  stageLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
  },
  pctLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
