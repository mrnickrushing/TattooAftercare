import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

/**
 * Image component that shows an animated shimmer placeholder while loading.
 * Drop-in replacement for <Image> — pass the same `source`, `style`, and `resizeMode`.
 */
export default function ImageWithLoading({ source, style, resizeMode = 'cover' }) {
  const [loaded, setLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0.4)).current;
  const shimmerLoop = useRef(null);

  useEffect(() => {
    shimmerLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    );
    shimmerLoop.current.start();
    return () => shimmerLoop.current?.stop();
  }, []);

  const handleLoad = () => {
    shimmerLoop.current?.stop();
    setLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={style}>
      {!loaded && (
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.placeholder, { opacity: shimmer }]}
        />
      )}
      <Animated.Image
        source={source}
        style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: COLORS.cardElevated,
  },
});
