import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 96;
const CENTER = SIZE / 2;

// Three concentric rings: outer → middle → inner
const RING_DEFS = [
  { key: 'washed',      label: 'Washed',      color: COLORS.info,    r: 42, sw: 9 },
  { key: 'moisturized', label: 'Moisturize',  color: COLORS.success, r: 29, sw: 9 },
  { key: 'logged',      label: 'Logged',      color: COLORS.accent,  r: 16, sw: 9 },
];

/**
 * Apple-style activity rings showing today's care completion.
 * Props:
 *   washed      0–1 fraction (or boolean coerced to 0/1)
 *   moisturized 0–1 fraction
 *   logged      0–1 fraction
 */
export default function ActivityRings({ washed = 0, moisturized = 0, logged = 0 }) {
  const values = [washed, moisturized, logged];
  const anims = useRef(RING_DEFS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel(
      RING_DEFS.map((_, i) =>
        Animated.timing(anims[i], {
          toValue: values[i],
          duration: 1000,
          delay: i * 150,
          useNativeDriver: false,
        })
      )
    ).start();
  }, [washed, moisturized, logged]);

  return (
    <View style={styles.card}>
      {/* Rings */}
      <Svg width={SIZE} height={SIZE}>
        {RING_DEFS.map((ring, i) => {
          const circ = 2 * Math.PI * ring.r;
          const dashOffset = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [circ, 0],
          });
          return (
            <React.Fragment key={ring.key}>
              {/* Track */}
              <Circle
                cx={CENTER} cy={CENTER} r={ring.r}
                stroke={ring.color + '28'} strokeWidth={ring.sw} fill="none"
              />
              {/* Fill arc */}
              <AnimatedCircle
                cx={CENTER} cy={CENTER} r={ring.r}
                stroke={ring.color}
                strokeWidth={ring.sw}
                fill="none"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${CENTER}, ${CENTER}`}
              />
            </React.Fragment>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>TODAY'S RINGS</Text>
        {RING_DEFS.map((ring, i) => {
          const done = values[i] >= 1;
          return (
            <View key={ring.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
              <Text style={[styles.legendLabel, done && { color: COLORS.textPrimary }]}>
                {ring.label}
              </Text>
              {done && (
                <View style={[styles.checkBadge, { backgroundColor: ring.color + '22' }]}>
                  <Text style={[styles.checkText, { color: ring.color }]}>✓</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    ...SHADOWS.card,
  },
  legend: {
    flex: 1,
    gap: SPACING.sm,
  },
  legendTitle: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  legendLabel: {
    flex: 1,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  checkBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  checkText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
