import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = 'onboarding_seen';

const SLIDES = [
  {
    key: '1',
    icon: 'droplet',
    gradient: [COLORS.flashRed, '#3D0000'],
    label: 'Welcome',
    title: 'Blood Raven Ink:\nTattoo Aftercare',
    subtitle:
      'Everything you need to protect your fresh ink and track every stage of healing — all in one place.',
  },
  {
    key: '2',
    icon: 'layers',
    gradient: ['#3D0000', '#2A0A0A'],
    label: 'My Tattoos',
    title: 'Log & Track\nYour Tattoos',
    subtitle:
      'Add each piece, log daily care notes, track soreness and peeling, and build a complete healing record from session to healed.',
  },
  {
    key: '3',
    icon: 'camera',
    gradient: ['#2A0A0A', COLORS.accentDim],
    label: 'Photo Timeline',
    title: 'Capture Your\nHealing Journey',
    subtitle:
      'Take progress photos day by day and watch your tattoo heal over time. Your timeline lives on the Home and Tools screens.',
  },
  {
    key: '4',
    icon: 'tool',
    gradient: [COLORS.accentDim, '#2A1A12'],
    label: 'Care Tools',
    title: 'AI Coach,\nSymptom Check & More',
    subtitle:
      'The Tools tab gives you an AI Aftercare Coach, Symptom Checker, Saniderm Mode, Appointment Prep, and healing reminders.',
  },
  {
    key: '5',
    icon: 'compass',
    gradient: ['#1A2744', '#2A1A12'],
    label: 'Explore',
    title: 'Discover Artists\n& the Community',
    subtitle:
      'Browse artist profiles, explore the community feed, and share your healing journey with other tattoo enthusiasts.',
  },
  {
    key: '6',
    icon: 'heart',
    gradient: [COLORS.flashRed, COLORS.accentDim],
    label: "Let's Go",
    title: 'Protect Your\nNew Ink',
    subtitle:
      'Create an account or sign in to sync your tattoos across devices. You can also continue as a guest to explore first.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      const first = viewableItems[0];
      if (first && first.index !== null) {
        setActiveIndex(first.index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.replace('Landing');
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finish();
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0D0603', '#1A0F0A', '#221510']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topStrip} />

      <SafeAreaView style={styles.safe}>
        {/* Skip button */}
        <View style={styles.skipRow}>
          {!isLast && (
            <TouchableOpacity
              onPress={finish}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <LinearGradient
                colors={item.gradient}
                style={styles.iconCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name={item.icon} size={44} color={COLORS.textPrimary} />
              </LinearGradient>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />

        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDim]}
              style={styles.ctaBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>
                {isLast ? "Create Account or Sign In →" : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.bottomStrip} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  topStrip: { height: 3, backgroundColor: COLORS.accent, opacity: 0.7 },
  bottomStrip: { height: 3, backgroundColor: COLORS.accent, opacity: 0.7 },
  safe: { flex: 1 },
  skipRow: {
    height: 44,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(200,169,81,0.3)',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  ctaWrap: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  ctaBtn: {
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textInverse,
    letterSpacing: 0.3,
  },
});
