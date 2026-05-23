import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const COLORS = ['#C8A951', '#E8C964', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
const PARTICLE_COUNT = 28;

function Particle({ delay }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  const startX = Math.random() * width;
  const endX = startX + (Math.random() - 0.5) * 200;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = 6 + Math.random() * 6;
  const isCircle = Math.random() > 0.5;
  const duration = 900 + Math.random() * 600;

  useEffect(() => {
    x.setValue(startX);
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }),
        Animated.timing(y, { toValue: -(height * 0.4 + Math.random() * 100), duration: duration, useNativeDriver: true }),
        Animated.timing(x, { toValue: endX - startX, duration: duration, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(duration * 0.5),
          Animated.timing(opacity, { toValue: 0, duration: duration * 0.5, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${270 + Math.random() * 180}deg`] });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: isCircle ? size : size * 0.4,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX: x }, { translateY: y }, { scale }, { rotate: spin }],
          left: 0,
          bottom: 0,
        },
      ]}
    />
  );
}

export default function ConfettiCannon({ active }) {
  if (!active) return null;
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <Particle key={i} delay={i * 28} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
  },
});
