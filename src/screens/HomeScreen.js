import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed, getStage, getCareTasks, getDayNumber } from '../utils/healingStages';
import { getCareLogForDate, addCareLog, updateCareLog } from '../database/db';
import TattooCard from '../components/TattooCard';
import CareTaskItem from '../components/CareTaskItem';
import StreakBadge from '../components/StreakBadge';
import TattooBackground from '../components/TattooBackground';
import ActivityRings from '../components/ActivityRings';
import ConfettiCannon from '../components/ConfettiCannon';

const BRI_LOGO = require('../../assets/blood-raven-logo.png');

// Animated count-up number
function AnimatedNumber({ value, style }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    const listener = animVal.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    Animated.timing(animVal, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
    return () => animVal.removeListener(listener);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

// Staggered entrance card
function AnimatedCard({ children, index }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay: index * 75,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 55,
        friction: 10,
        delay: index * 75,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { tattoos, refreshTattoos, refreshStreak, streak } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [taskStates, setTaskStates] = useState({});
  const [careLogs, setCareLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [confetti, setConfetti] = useState(false);
  const allDoneBannerScale = useRef(new Animated.Value(1)).current;
  const prevAllDone = useRef(false);
  // Safe area insets — top clears Dynamic Island / status bar
  //                  — bottom clears the tab bar
  const insets = useSafeAreaInsets();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDisplay = format(new Date(), 'EEE, MMM d').toUpperCase();
  const activeTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));

  const loadCareData = useCallback(async () => {
    const logs = {};
    const states = {};
    for (const tattoo of activeTattoos) {
      const log = await getCareLogForDate(tattoo.id, today);
      logs[tattoo.id] = log;
      const stage = getStage(tattoo.date_tattooed);
      const tasks = getCareTasks(stage);
      states[tattoo.id] = {};
      for (const task of tasks) {
        if (task.field && log) {
          states[tattoo.id][task.id] = log[task.field] === 1;
        } else {
          states[tattoo.id][task.id] = false;
        }
      }
    }
    setCareLogs(logs);
    setTaskStates(states);
    setLoading(false);
  }, [tattoos, today]);

  useFocusEffect(
    useCallback(() => {
      refreshTattoos();
      refreshStreak();
    }, [])
  );

  useEffect(() => {
    if (activeTattoos.length >= 0) loadCareData();
  }, [tattoos]);

  const handleToggleTask = useCallback(
    async (tattoo, task) => {
      const currentChecked = taskStates[tattoo.id]?.[task.id] ?? false;
      const newChecked = !currentChecked;
      setTaskStates((prev) => ({
        ...prev,
        [tattoo.id]: { ...prev[tattoo.id], [task.id]: newChecked },
      }));
      try {
        const existingLog = careLogs[tattoo.id];
        const stage = getStage(tattoo.date_tattooed);
        const tasks = getCareTasks(stage);
        const allStates = { ...(taskStates[tattoo.id] || {}), [task.id]: newChecked };
        const washed = tasks.filter((t) => t.field === 'washed').some((t) => allStates[t.id]);
        const moisturized = tasks.filter((t) => t.field === 'moisturized').some((t) => allStates[t.id]);
        if (existingLog) {
          await updateCareLog(existingLog.id, { ...existingLog, washed: washed ? 1 : 0, moisturized: moisturized ? 1 : 0 });
        } else {
          const newId = await addCareLog({ tattoo_id: tattoo.id, log_date: today, washed: washed ? 1 : 0, moisturized: moisturized ? 1 : 0, health_status: 'good' });
          setCareLogs((prev) => ({ ...prev, [tattoo.id]: { id: newId, tattoo_id: tattoo.id, log_date: today, washed: washed ? 1 : 0, moisturized: moisturized ? 1 : 0, health_status: 'good' } }));
        }
        await refreshStreak();
      } catch {
        Alert.alert('Error', 'Could not save care task. Please try again.');
      }
    },
    [taskStates, careLogs, today]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTattoos();
    await refreshStreak();
    await loadCareData();
    setRefreshing(false);
  }, []);

  // Fire confetti + haptic the first time all tasks flip to done
  const allTasks = [];
  for (const tattoo of activeTattoos) {
    const stage = getStage(tattoo.date_tattooed);
    const tasks = getCareTasks(stage);
    for (const task of tasks) allTasks.push({ task, tattoo });
  }
  const pendingCount = allTasks.filter(({ task, tattoo }) => !(taskStates[tattoo.id]?.[task.id] ?? false)).length;
  const allDone = allTasks.length > 0 && pendingCount === 0;

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      prevAllDone.current = true;
      Vibration.vibrate([0, 80, 60, 80]);
      setConfetti(true);
      Animated.sequence([
        Animated.spring(allDoneBannerScale, { toValue: 1.06, tension: 120, friction: 5, useNativeDriver: true }),
        Animated.spring(allDoneBannerScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => setConfetti(false), 2000);
      return () => clearTimeout(timer);
    }
    if (!allDone) prevAllDone.current = false;
  }, [allDone]);

  const firstTattooDate = tattoos.length > 0
    ? tattoos.reduce((earliest, t) => (!earliest || t.date_tattooed < earliest ? t.date_tattooed : earliest), null)
    : null;
  const daysSinceFirst = firstTattooDate ? getDayNumber(firstTattooDate) - 1 : null;

  // FAB sits above the tab bar using the shared TAB_BAR_HEIGHT constant
  const fabBottom = insets.bottom + TAB_BAR_HEIGHT + SPACING.md;

  if (loading) {
    return (
      <TattooBackground style={[commonStyles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </TattooBackground>
    );
  }

  return (
    <TattooBackground style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          // Top padding = status bar / Dynamic Island height + a comfortable gap
          { paddingTop: insets.top + SPACING.lg },
          // Bottom padding = FAB height + some breathing room
          { paddingBottom: fabBottom + 70 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* === HERO HEADER === */}
        <View style={styles.heroHeaderZone}>
          <View style={styles.heroGlowWrap} pointerEvents="none">
            <LinearGradient
              colors={['rgba(200,169,81,0.16)', 'rgba(200,169,81,0.04)', 'transparent']}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
              style={styles.heroGlow}
            />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.headerLeft}>
                <View style={styles.logoBadge}>
                  <Image source={BRI_LOGO} style={styles.logoImage} resizeMode="contain" />
                </View>
                <View style={styles.headerTextBlock}>
                  <Text style={styles.heroLabel}>Ink Ritual</Text>
                  <Text style={styles.heroTitle}>Care every day. Heal every layer.</Text>
                </View>
              </View>
              <StreakBadge streak={streak} />
            </View>

            <Text style={styles.heroSubtitle} numberOfLines={2}>
              Keep your tattoo healing on track with daily rituals, timeline reminders, and streak rewards.
            </Text>

            <View style={styles.heroActionRow}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Today's mission</Text>
                <Text style={styles.heroStatValue}>{allDone ? 'Complete' : `${pendingCount} steps left`}</Text>
              </View>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => navigation.navigate('TattoosTab')}
                activeOpacity={0.9}
              >
                <Text style={styles.heroButtonText}>View my ink</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureLabel}>Featured social prompt</Text>
          <Text style={styles.featureTitle}>Share today’s healing check-in with the community.</Text>
          <Text style={styles.featureDescription}>A quick post can earn reactions and keep your streaks visible to friends.</Text>
          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => navigation.getParent()?.navigate('ExploreTab')}
            activeOpacity={0.9}
          >
            <Text style={styles.featureButtonText}>Browse Explore</Text>
          </TouchableOpacity>
        </View>

        {/* Decorative gold rule */}
        <View style={styles.headerDivider} />

        {/* Date chip */}
        <View style={styles.dateChipRow}>
          <View style={styles.dateChipOuter}>
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{todayDisplay}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        {tattoos.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, SHADOWS.card]}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <AnimatedNumber value={activeTattoos.length} style={styles.statValue} />
            </View>
            <View style={[styles.statCard, styles.statCardStreak, SHADOWS.goldStrong]}>
              <Text style={[styles.statLabel, { color: COLORS.accentDim }]}>STREAK</Text>
              <AnimatedNumber value={streak} style={[styles.statValue, styles.statValueAccent]} />
            </View>
            <View style={[styles.statCard, SHADOWS.card]}>
              <Text style={styles.statLabel}>DAYS IN</Text>
              <AnimatedNumber value={daysSinceFirst !== null ? daysSinceFirst : 0} style={styles.statValue} />
            </View>
          </View>
        )}

        {/* Activity Rings — show when there are active tattoos */}
        {activeTattoos.length > 0 && (() => {
          const washedFraction = activeTattoos.filter((t) => careLogs[t.id]?.washed === 1).length / activeTattoos.length;
          const moistFraction  = activeTattoos.filter((t) => careLogs[t.id]?.moisturized === 1).length / activeTattoos.length;
          const loggedFraction = activeTattoos.filter((t) => !!careLogs[t.id]).length / activeTattoos.length;
          return (
            <View style={styles.section}>
              <ActivityRings
                washed={washedFraction}
                moisturized={moistFraction}
                logged={loggedFraction}
              />
            </View>
          );
        })()}

        {/* Today's Care */}
        {activeTattoos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>TODAY'S CARE</Text>
              <View style={styles.sectionRule} />
              {!allDone && pendingCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pendingCount}</Text>
                </View>
              )}
              {allDone && (
                <View style={styles.allDoneBadge}>
                  <Text style={styles.allDoneBadgeText}>✓ DONE</Text>
                </View>
              )}
            </View>

            {allDone ? (
              <Animated.View style={{ transform: [{ scale: allDoneBannerScale }] }}>
                <LinearGradient
                  colors={[COLORS.successMuted, 'rgba(76,175,125,0.08)']}
                  style={styles.allDoneBanner}
                >
                  <Text style={styles.allDoneBannerEmoji}>🎉</Text>
                  <View>
                    <Text style={styles.allDoneBannerTitle}>All done for today!</Text>
                    <Text style={styles.allDoneBannerSub}>Great job taking care of your ink.</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            ) : (
              <View style={styles.taskCard}>
                {allTasks.length === 0 ? (
                  <View style={styles.allDoneRow}>
                    <Text style={styles.allDoneText}>No tasks today</Text>
                  </View>
                ) : (
                  allTasks.map(({ task, tattoo }, index) => (
                    <View key={`${tattoo.id}-${task.id}`}>
                      {index > 0 && <View style={styles.taskDivider} />}
                      <CareTaskItem
                        task={task}
                        checked={taskStates[tattoo.id]?.[task.id] ?? false}
                        onToggle={() => handleToggleTask(tattoo, task)}
                        tattooName={activeTattoos.length > 1 ? tattoo.name : null}
                      />
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* Healing section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>HEALING</Text>
            <View style={styles.sectionRule} />
            {activeTattoos.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeTattoos.length}</Text>
              </View>
            )}
          </View>

          {activeTattoos.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyLogoContainer}>
                <Image source={BRI_LOGO} style={styles.emptyLogoImage} resizeMode="contain" />
              </View>
              <Text style={styles.emptyTitle}>No tattoos tracked yet</Text>
              <Text style={styles.emptySubtitle}>
                Start tracking your healing journey and never miss a care step.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddTattoo')}>
                <Text style={styles.emptyButtonText}>Add Your First Tattoo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeTattoos.map((tattoo, index) => (
              <AnimatedCard key={tattoo.id} index={index}>
                <TattooCard
                  tattoo={tattoo}
                  onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                />
              </AnimatedCard>
            ))
          )}
        </View>

        {/* View all + Timeline links */}
        {tattoos.length > 0 && (
          <View style={styles.linksRow}>
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => navigation.getParent()?.navigate('TattoosTab')}
              activeOpacity={0.7}
              accessibilityLabel="View all tattoos"
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>ALL TATTOOS</Text>
              <Feather name="chevron-right" size={14} color={COLORS.accentDim} />
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.viewAllRow}
              onPress={() => navigation.navigate('HealingTimeline')}
              activeOpacity={0.7}
              accessibilityLabel="View healing timeline"
              accessibilityRole="button"
            >
              <Text style={styles.viewAllText}>TIMELINE</Text>
              <Feather name="activity" size={14} color={COLORS.accentDim} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ConfettiCannon active={confetti} />

      {/* FAB — positioned above the tab bar using real insets + TAB_BAR_HEIGHT */}
      <TouchableOpacity
        style={[commonStyles.fab, { bottom: fabBottom }]}
        onPress={() => navigation.navigate('AddTattoo')}
        activeOpacity={0.85}
        accessibilityLabel="Add tattoo"
        accessibilityRole="button"
      >
        <Feather name="plus" size={24} color={COLORS.textInverse} />
      </TouchableOpacity>
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  // paddingTop is now dynamic (insets.top + gap), set inline above
  scrollContent: { paddingHorizontal: SPACING.lg },

  heroHeaderZone: { position: 'relative', marginBottom: SPACING.md },
  heroGlowWrap: {
    position: 'absolute',
    top: -28, left: -28,
    width: 240, height: 130,
    pointerEvents: 'none',
  },
  heroGlow: { width: '100%', height: '100%', borderRadius: 120 },

  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    ...SHADOWS.goldStrong,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoBadge: {
    width: 44, height: 44, borderRadius: RADIUS.lg,
    backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.accentBorder,
    ...SHADOWS.gold,
  },
  logoImage: { width: 34, height: 34 },
  headerTextBlock: { gap: 4, flex: 1 },
  heroLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
  heroTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 30 },
  heroSubtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: SPACING.md },

  heroActionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(200,169,81,0.08)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  heroStatLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  heroStatValue: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  heroButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  featureCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.card,
  },
  featureLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: SPACING.xs },
  featureTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: SPACING.xs, lineHeight: 22 },
  featureDescription: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: SPACING.md },
  featureButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  featureButtonText: { color: COLORS.textInverse, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  headerDivider: { height: 1, backgroundColor: 'rgba(200,169,81,0.18)', marginBottom: SPACING.lg },

  dateChipRow: { marginBottom: SPACING.lg },
  dateChipOuter: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(200,169,81,0.08)',
    padding: 1,
  },
  dateChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  dateChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1.0 },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  statCardStreak: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  statLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: COLORS.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  statValueAccent: { color: COLORS.accent },

  section: { marginBottom: SPACING.xl },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  sectionHeaderText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: 'rgba(200,169,81,0.15)' },
  countBadge: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeText: { color: COLORS.textInverse, fontSize: 10, fontWeight: '700' },
  allDoneBadge: { backgroundColor: COLORS.successMuted, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.success + '44' },
  allDoneBadgeText: { color: COLORS.success, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  taskCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.borderGold, overflow: 'hidden' },
  taskDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  allDoneRow: { paddingVertical: SPACING.lg, alignItems: 'center' },
  allDoneText: { color: COLORS.success, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },

  allDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.success + '44',
  },
  allDoneBannerEmoji: { fontSize: 28 },
  allDoneBannerTitle: { color: COLORS.success, fontSize: 15, fontWeight: '700' },
  allDoneBannerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  linksRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  linkDivider: { width: 1, height: 16, backgroundColor: COLORS.border },
  viewAllRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.md },
  viewAllText: { color: COLORS.accentDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyLogoContainer: {
    width: 100, height: 100, borderRadius: 20, backgroundColor: '#F5F0E8',
    borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    marginBottom: SPACING.sm, ...SHADOWS.gold,
  },
  emptyLogoImage: { width: 88, height: 88 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  emptySubtitle: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: SPACING.xl },
  emptyButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.sm, ...SHADOWS.gold },
  emptyButtonText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
