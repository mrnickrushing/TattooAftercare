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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const BRI_LOGO = require('../../assets/blood-raven-logo.png');
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed, getStage, getCareTasks, getDayNumber } from '../utils/healingStages';
import { getCareLogForDate, addCareLog, updateCareLog } from '../database/db';
import TattooCard from '../components/TattooCard';
import CareTaskItem from '../components/CareTaskItem';
import StreakBadge from '../components/StreakBadge';

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

  const allTasks = [];
  for (const tattoo of activeTattoos) {
    const stage = getStage(tattoo.date_tattooed);
    const tasks = getCareTasks(stage);
    for (const task of tasks) allTasks.push({ task, tattoo });
  }
  const pendingCount = allTasks.filter(({ task, tattoo }) => !(taskStates[tattoo.id]?.[task.id] ?? false)).length;
  const allDone = allTasks.length > 0 && pendingCount === 0;

  const firstTattooDate = tattoos.length > 0
    ? tattoos.reduce((earliest, t) => (!earliest || t.date_tattooed < earliest ? t.date_tattooed : earliest), null)
    : null;
  const daysSinceFirst = firstTattooDate ? getDayNumber(firstTattooDate) - 1 : null;

  if (loading) {
    return (
      <LinearGradient colors={['#14120A', COLORS.background, COLORS.background]} style={[commonStyles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#14120A', COLORS.background, COLORS.background]}
      locations={[0, 0.35, 1]}
      style={commonStyles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* === HERO HEADER — radial gold glow behind logo === */}
        <View style={styles.heroHeaderZone}>
          {/* Radial glow: centred on the logo */}
          <View style={styles.heroGlowWrap} pointerEvents="none">
            <LinearGradient
              colors={['rgba(200,169,81,0.10)', 'rgba(200,169,81,0.04)', 'transparent']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlow}
            />
          </View>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <Image source={BRI_LOGO} style={styles.logoImage} resizeMode="contain" />
              </View>
              <View style={styles.headerTextBlock}>
                <Text style={styles.logoLine1}>BLOOD RAVEN INK</Text>
                <Text style={styles.logoLine2}>TATTOO AFTERCARE</Text>
              </View>
            </View>
            <StreakBadge streak={streak} />
          </View>
        </View>

        {/* Decorative gold rule */}
        <View style={styles.headerDivider} />

        {/* Date chip — pressed-metal style */}
        <View style={styles.dateChipRow}>
          <View style={styles.dateChipOuter}>
            <View style={styles.dateChip}>
              <Text style={styles.dateChipText}>{todayDisplay}</Text>
            </View>
          </View>
        </View>

        {/* Stats row — animated count-up numbers */}
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
              // Celebration banner
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

        {/* View all link */}
        {tattoos.length > 0 && (
          <TouchableOpacity
            style={styles.viewAllRow}
            onPress={() => navigation.navigate('TattoosTab')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>VIEW ALL TATTOOS</Text>
            <Feather name="chevron-right" size={14} color={COLORS.accentDim} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[commonStyles.fab]}
        onPress={() => navigation.navigate('AddTattoo')}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={COLORS.textInverse} />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: 110 },

  // Hero header zone with radial glow
  heroHeaderZone: { position: 'relative', marginBottom: SPACING.md },
  heroGlowWrap: {
    position: 'absolute',
    top: -30, left: -30,
    width: 220, height: 120,
    pointerEvents: 'none',
  },
  heroGlow: { width: '100%', height: '100%', borderRadius: 110 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoBadge: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: '#F5F0E8', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: COLORS.accentBorder,
    ...SHADOWS.gold,
  },
  logoImage: { width: 30, height: 30 },
  headerTextBlock: { gap: 1 },
  logoLine1: { color: COLORS.accent, fontSize: 11, fontWeight: '700', letterSpacing: 2.5, lineHeight: 14 },
  logoLine2: { color: COLORS.accentDim, fontSize: 9, fontWeight: '600', letterSpacing: 2, lineHeight: 12 },

  headerDivider: { height: 1, backgroundColor: 'rgba(200,169,81,0.18)', marginBottom: SPACING.lg },

  // Pressed-metal date chip
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

  // Stats
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

  // Sections
  section: { marginBottom: SPACING.xl },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  sectionHeaderText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: 'rgba(200,169,81,0.15)' },
  countBadge: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeText: { color: COLORS.textInverse, fontSize: 10, fontWeight: '700' },
  allDoneBadge: { backgroundColor: COLORS.successMuted, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.success + '44' },
  allDoneBadgeText: { color: COLORS.success, fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },

  // Task card
  taskCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.borderGold, overflow: 'hidden' },
  taskDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: SPACING.md },
  allDoneRow: { paddingVertical: SPACING.lg, alignItems: 'center' },
  allDoneText: { color: COLORS.success, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },

  // All-done celebration banner
  allDoneBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.success + '44',
  },
  allDoneBannerEmoji: { fontSize: 28 },
  allDoneBannerTitle: { color: COLORS.success, fontSize: 15, fontWeight: '700' },
  allDoneBannerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  // View all
  viewAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: SPACING.md, marginBottom: SPACING.sm },
  viewAllText: { color: COLORS.accentDim, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  // Empty state
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
