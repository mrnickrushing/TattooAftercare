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
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed, getStage, getCareTasks, getDayNumber } from '../utils/healingStages';
import {
  getCareLogForDate,
  addCareLog,
  updateCareLog,
  getStreak,
} from '../database/db';
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
    if (!loading || activeTattoos.length >= 0) {
      loadCareData();
    }
  }, [tattoos]);

  const handleToggleTask = useCallback(
    async (tattoo, task) => {
      const currentChecked = taskStates[tattoo.id]?.[task.id] ?? false;
      const newChecked = !currentChecked;

      setTaskStates((prev) => ({
        ...prev,
        [tattoo.id]: {
          ...prev[tattoo.id],
          [task.id]: newChecked,
        },
      }));

      try {
        const existingLog = careLogs[tattoo.id];
        const stage = getStage(tattoo.date_tattooed);
        const tasks = getCareTasks(stage);

        const updatedFields = {};
        for (const t of tasks) {
          if (t.field) {
            const checked = t.id === task.id ? newChecked : (taskStates[tattoo.id]?.[t.id] ?? false);
            if (!updatedFields[t.field] || checked) {
              updatedFields[t.field] = checked ? 1 : 0;
            }
          }
        }

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
          const newLog = { id: newId, tattoo_id: tattoo.id, log_date: today, washed: washed ? 1 : 0, moisturized: moisturized ? 1 : 0, health_status: 'good' };
          setCareLogs((prev) => ({ ...prev, [tattoo.id]: newLog }));
        }

        await refreshStreak();
      } catch (error) {
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Tattoo Aftercare</Text>
            <Text style={styles.headerDate}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          </View>
          <StreakBadge streak={streak} />
        </View>

        {/* Today's Care Section */}
        {activeTattoos.length > 0 && (
          <View style={styles.section}>
            <Text style={commonStyles.sectionHeader}>Today's Care</Text>
            <View style={styles.taskCard}>
              {allTasks.length === 0 ? (
                <Text style={styles.emptyTaskText}>No tasks for today.</Text>
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

        {/* Active Tattoos Section */}
        <View style={styles.section}>
          <Text style={commonStyles.sectionHeader}>
            {activeTattoos.length > 0 ? 'Active Healing' : 'Your Tattoos'}
          </Text>

          {activeTattoos.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="plus-circle" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No active tattoos</Text>
              <Text style={styles.emptySubtitle}>
                Add your first tattoo to start tracking the healing journey.
              </Text>
              <TouchableOpacity
                style={commonStyles.button}
                onPress={() => navigation.navigate('AddTattoo')}
              >
                <Text style={commonStyles.buttonText}>Add First Tattoo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeTattoos.map((tattoo) => (
              <TattooCard
                key={tattoo.id}
                tattoo={tattoo}
                onPress={() =>
                  navigation.navigate('TattooDetail', { tattooId: tattoo.id })
                }
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={commonStyles.fab}
        onPress={() => navigation.navigate('AddTattoo')}
      >
        <Feather name="plus" size={24} color="#000000" />
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
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    paddingTop: SPACING.md,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.heavy,
  },
  headerDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  taskCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs,
  },
  taskDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  emptyTaskText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  emptySubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
