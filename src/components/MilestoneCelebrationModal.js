/**
 * MilestoneCelebrationModal.js
 * Full-screen celebration overlay shown when a healing milestone is reached.
 * Renders a shareable card, confetti-style animated particles, and share/dismiss actions.
 */
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Dimensions, Image, Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { markMilestoneCelebrated } from '../database/socialDb';

const { width, height } = Dimensions.get('window');

const MILESTONE_META = {
  day3:   { label: 'Day 3',         emoji: '🌱', title: 'First 3 Days Done!',    desc: 'The hardest part is over. Your skin is starting to lock in the ink.',       color: '#E05252' },
  day7:   { label: 'Day 7',         emoji: '⚡', title: 'One Week Strong!',       desc: 'Peeling is normal — resist the urge to pick. You\'re doing great.',          color: '#E09452' },
  day14:  { label: 'Day 14',        emoji: '✨', title: 'Two Weeks In!',          desc: 'Colors are starting to settle. Keep moisturizing — the deep layers are still healing.', color: '#C8A951' },
  day30:  { label: 'Day 30',        emoji: '🏆', title: '30-Day Healer!',         desc: 'Surface healing is complete. Keep protecting from sun exposure.',            color: '#4CAF7D' },
  healed: { label: 'Fully Healed',  emoji: '💉', title: 'Fully Healed!',          desc: 'Your tattoo has completed its healing journey. It\'s yours forever now.',    color: '#5292C0' },
};

function Particle({ delay, color }) {
  const y = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const startX = (Math.random() - 0.5) * width * 1.4;
  const endY = height * 0.6 + Math.random() * height * 0.4;
  const duration = 1800 + Math.random() * 1200;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, { toValue: endY, duration, useNativeDriver: true }),
        Animated.timing(x, { toValue: startX, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const size = 6 + Math.random() * 8;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size, height: size,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? size / 2 : 2,
          transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
          opacity,
          top: height * 0.25,
          left: width / 2,
        },
      ]}
    />
  );
}

export default function MilestoneCelebrationModal({ milestone, tattoo, onDismiss }) {
  const cardRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const meta = MILESTONE_META[milestone?.milestone_type] || MILESTONE_META.healed;

  const particleColors = [COLORS.accent, meta.color, '#ffffff', '#F5F5F0', COLORS.accentDim];
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: particleColors[i % particleColors.length],
    delay: Math.random() * 600,
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 180 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDismiss = async () => {
    if (milestone?.id) await markMilestoneCelebrated(milestone.id);
    onDismiss();
  };

  const handleShare = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Could not share', e.message);
    }
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Particles */}
        {particles.map((p) => (
          <Particle key={p.id} delay={p.delay} color={p.color} />
        ))}

        {/* Card */}
        <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
          <View ref={cardRef} style={[styles.card, { borderColor: meta.color + '55' }]}>
            <View style={[styles.glowCircle, { backgroundColor: meta.color + '22' }]}>
              <Text style={styles.emoji}>{meta.emoji}</Text>
            </View>
            <View style={[styles.milestoneBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
              <Text style={[styles.milestoneBadgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
            </View>
            <Text style={styles.title}>{meta.title}</Text>
            {tattoo?.name ? <Text style={styles.tattooName}>{tattoo.name}</Text> : null}
            <Text style={styles.desc}>{meta.desc}</Text>
            <View style={[styles.divider, { backgroundColor: meta.color + '33' }]} />
            <Text style={styles.dayStamp}>Day {milestone?.day_number || '—'}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
              <Feather name="share-2" size={16} color={COLORS.textInverse} />
              <Text style={styles.shareBtnText}>Share Card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.75}>
              <Text style={styles.dismissBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: { position: 'absolute' },
  cardWrap: { width: width - 48, alignItems: 'center', gap: SPACING.md },
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.xxl,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.cardDeep,
  },
  glowCircle: {
    width: 88, height: 88, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emoji: { fontSize: 44 },
  milestoneBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  milestoneBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2 },
  tattooName: { color: COLORS.accent, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  desc: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  divider: { width: '40%', height: 1, marginVertical: SPACING.xs },
  dayStamp: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  actions: { width: '100%', gap: SPACING.sm },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, ...SHADOWS.gold,
  },
  shareBtnText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700' },
  dismissBtn: {
    alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  dismissBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
});
