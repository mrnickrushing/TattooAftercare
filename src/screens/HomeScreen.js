import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
    if (activeTattoos.length >= 0) {
      loadCareData();
    }
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
          await updateCareLog(existingLog.id, {
            ...existingLog,
            washed: washed ? 1 : 0,
            moisturized: moisturized ? 1 : 0,
          });
        } else {
          const newId = await addCareLog({
            tattoo_id: tattoo.id,
            log_date: today,
            washed: washed ? 1 : 0,
            moisturized: moisturized ? 1 : 0,
            health_status: 'good',
          });
          const newLog = {
            id: newId, tattoo_id: tattoo.id, log_date: today,
            washed: washed ? 1 : 0, moisturized: moisturized ? 1 : 0, health_status: 'good',
          };
          setCareLogs((prev) => ({ ...prev, [tattoo.id]: newLog }));
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

  // Build consolidated task list across all active tattoos
  const allTasks = [];
  for (const tattoo of activeTattoos) {
    const stage = getStage(tattoo.date_tattooed);
    const tasks = getCareTasks(stage);
    for (const task of tasks) {
      allTasks.push({ task, tattoo });
    }
  }

  const pendingCount = allTasks.filter(({ task, tattoo }) => !(taskStates[tattoo.id]?.[task.id] ?? false)).length;
  const allDone = allTasks.length > 0 && pendingCount === 0;

  // Stats
  const firstTattooDate = tattoos.length > 0
    ? tattoos.reduce((earliest, t) => (!earliest || t.date_tattooed < earliest ? t.date_tattooed : earliest), null)
    : null;
  const daysSinceFirst = firstTattooDate ? getDayNumber(firstTattooDate) - 1 : null;

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoLine1}>BLOOD RAVEN INK</Text>
            <Text style={styles.logoLine2}>AFTERCARE</Text>
          </View>
          <StreakBadge streak={streak} />
        </View>

        {/* Date chip */}
        <View style={styles.dateChipRow}>
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>{todayDisplay}</Text>
          </View>
        </View>

        {/* Stats row */}
        {tattoos.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, SHADOWS.card]}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <Text style={styles.statValue}>{activeTattoos.length}</Text>
            </View>
            <View style={[styles.statCard, SHADOWS.card]}>
              <Text style={styles.statLabel}>STREAK</Text>
              <Text style={[styles.statValue, { color: COLORS.accent }]}>{streak}</Text>
            </View>
            <View style={[styles.statCard, SHADOWS.card]}>
              <Text style={styles.statLabel}>DAYS IN</Text>
              <Text style={styles.statValue}>{daysSinceFirst !== null ? daysSinceFirst : '—'}</Text>
            </View>
          </View>
        )}

        {/* Today's Care section */}
        {activeTattoos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderText}>TODAY'S CARE</Text>
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

            <View style={styles.taskCard}>
              {allDone ? (
                <View style={styles.allDoneRow}>
                  <Text style={styles.allDoneText}>All done today ✓</Text>
                </View>
              ) : allTasks.length === 0 ? (
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
          </View>
        )}

        {/* Healing section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>HEALING</Text>
            {activeTattoos.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{activeTattoos.length}</Text>
              </View>
            )}
          </View>

          {activeTattoos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🖊️</Text>
              <Text style={styles.emptyTitle}>No tattoos tracked yet</Text>
              <Text style={styles.emptySubtitle}>
                Start tracking your healing journey and never miss a care step.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddTattoo')}
              >
                <Text style={styles.emptyButtonText}>Add Your First Tattoo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeTattoos.map((tattoo) => (
              <TattooCard
                key={tattoo.id}
                tattoo={tattoo}
                onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTattoo')}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={24} color={COLORS.textInverse} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  logoLine1: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    lineHeight: 14,
  },
  logoLine2: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    lineHeight: 14,
  },
  dateChipRow: {
    marginBottom: SPACING.lg,
  },
  dateChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateChipText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionHeaderText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  countBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: '700',
  },
  allDoneBadge: {
    backgroundColor: COLORS.successMuted,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.success + '44',
  },
  allDoneBadgeText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  taskDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  allDoneRow: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  allDoneText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.xl,
  },
  emptyButton: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
    ...SHADOWS.gold,
  },
  emptyButtonText: {
    color: COLORS.textInverse,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.gold,
  },
});
