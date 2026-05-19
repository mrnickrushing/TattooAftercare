import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format, subDays, isToday, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  getCareLogForDate, addCareLog, updateCareLog,
  getCareLogsForTattoo, addPhoto,
} from '../database/db';
import { calculateHealthStatus, getDayNumber, isHealed } from '../utils/healingStages';

function CheckRow({ label, checked, onToggle, variant = 'normal' }) {
  const color = variant === 'warning' ? COLORS.warning : variant === 'danger' ? COLORS.danger : COLORS.accent;
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, { borderColor: checked ? color : COLORS.border, backgroundColor: checked ? color : 'transparent' }]}>
        {checked && <Feather name="check" size={12} color={variant === 'normal' ? '#000' : '#fff'} />}
      </View>
      <Text style={[styles.checkLabel, variant === 'danger' && styles.checkLabelDanger, variant === 'warning' && styles.checkLabelWarning]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MiniCalendar({ logs }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const log = logs.find((l) => l.log_date === dateStr);
    const hasLog = log && (log.washed || log.moisturized);
    const isFuture = d > new Date();
    return { dateStr, label: format(d, 'EEE'), dayNum: format(d, 'd'), hasLog, isFuture, isToday: isToday(d) };
  });

  return (
    <View style={styles.calendar}>
      {days.map((day) => (
        <View key={day.dateStr} style={styles.calDay}>
          <Text style={styles.calDayLabel}>{day.label}</Text>
          <View style={[
            styles.calDot,
            day.isToday && styles.calDotToday,
            !day.isFuture && day.hasLog && styles.calDotLogged,
            !day.isFuture && !day.hasLog && styles.calDotMissed,
          ]}>
            <Text style={[styles.calDayNum, day.isToday && styles.calDayNumToday]}>
              {day.dayNum}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function CareLogScreen() {
  const { activeTattoos, refreshStreak } = useApp();
  const [selectedTattooIndex, setSelectedTattooIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [existingLogId, setExistingLogId] = useState(null);

  const today = format(new Date(), 'yyyy-MM-dd');

  const [washed, setWashed] = useState(false);
  const [moisturized, setMoisturized] = useState(false);
  const [peeling, setPeeling] = useState(false);
  const [itching, setItching] = useState(false);
  const [redness, setRedness] = useState(false);
  const [swelling, setSwelling] = useState(false);
  const [discharge, setDischarge] = useState(false);
  const [fever, setFever] = useState(false);
  const [notes, setNotes] = useState('');

  const selectedTattoo = activeTattoos[selectedTattooIndex];
  const healthStatus = calculateHealthStatus({ discharge, fever, redness, swelling });

  const loadLog = useCallback(async () => {
    if (!selectedTattoo) { setLoading(false); return; }
    setLoading(true);
    try {
      const log = await getCareLogForDate(selectedTattoo.id, today);
      const logs = await getCareLogsForTattoo(selectedTattoo.id);
      setRecentLogs(logs.slice(0, 7));

      if (log) {
        setExistingLogId(log.id);
        setWashed(!!log.washed);
        setMoisturized(!!log.moisturized);
        setPeeling(!!log.peeling);
        setItching(!!log.itching);
        setRedness(!!log.redness);
        setSwelling(!!log.swelling);
        setDischarge(!!log.discharge);
        setFever(!!log.fever);
        setNotes(log.notes || '');
      } else {
        setExistingLogId(null);
        setWashed(false); setMoisturized(false); setPeeling(false);
        setItching(false); setRedness(false); setSwelling(false);
        setDischarge(false); setFever(false); setNotes('');
      }
    } catch (e) {
      console.warn('loadLog error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedTattoo, today]);

  useFocusEffect(useCallback(() => { loadLog(); }, [loadLog]));
  useEffect(() => { loadLog(); }, [selectedTattooIndex]);

  async function handleSave() {
    if (!selectedTattoo) return;
    setSaving(true);
    try {
      const data = {
        tattoo_id: selectedTattoo.id,
        log_date: today,
        washed, moisturized, peeling, itching,
        redness, swelling, discharge, fever,
        notes: notes.trim() || null,
        health_status: healthStatus,
      };

      if (existingLogId) {
        await updateCareLog(existingLogId, data);
      } else {
        const newId = await addCareLog(data);
        setExistingLogId(newId);
      }

      await refreshStreak();
      await loadLog();
      Alert.alert('Saved', "Today's care log has been saved.");
    } catch (e) {
      Alert.alert('Error', 'Could not save care log. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPhoto() {
    if (!selectedTattoo) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]) {
      const dayNum = getDayNumber(selectedTattoo.date_tattooed);
      await addPhoto({
        tattoo_id: selectedTattoo.id,
        uri: result.assets[0].uri,
        taken_date: today,
        day_number: dayNum,
      });
      Alert.alert('Photo added', `Day ${dayNum} photo saved to your timeline.`);
    }
  }

  const healthConfig = {
    good: { color: COLORS.success, icon: 'check-circle', label: 'Healing Well', sub: 'Looking good — keep up the routine.' },
    attention: { color: COLORS.warning, icon: 'alert-triangle', label: 'Needs Attention', sub: 'Monitor closely. If it worsens, see a doctor.' },
    doctor: { color: COLORS.danger, icon: 'alert-octagon', label: 'See a Doctor', sub: 'Signs of possible infection. Do not wait.' },
  };
  const hc = healthConfig[healthStatus];

  if (activeTattoos.length === 0) {
    return (
      <View style={[commonStyles.container, commonStyles.emptyState]}>
        <Feather name="clipboard" size={48} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>No active tattoos</Text>
        <Text style={commonStyles.emptyStateText}>
          Add a tattoo to start logging your daily care routine.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tattoo selector */}
        {activeTattoos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
            {activeTattoos.map((t, i) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.selectorChip, i === selectedTattooIndex && styles.selectorChipActive]}
                onPress={() => setSelectedTattooIndex(i)}
              >
                <Text style={[styles.selectorText, i === selectedTattooIndex && styles.selectorTextActive]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Date header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          {selectedTattoo && (
            <Text style={styles.dayText}>Day {getDayNumber(selectedTattoo.date_tattooed)}</Text>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xxl }} />
        ) : (
          <>
            {/* Mini calendar */}
            <MiniCalendar logs={recentLogs} />

            {/* Health status */}
            <View style={[styles.healthCard, { borderColor: hc.color + '55', backgroundColor: hc.color + '12' }]}>
              <Feather name={hc.icon} size={20} color={hc.color} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.healthLabel, { color: hc.color }]}>{hc.label}</Text>
                <Text style={styles.healthSub}>{hc.sub}</Text>
              </View>
            </View>

            {/* Care done */}
            <Text style={commonStyles.sectionHeader}>CARE DONE TODAY</Text>
            <View style={styles.checkGroup}>
              <CheckRow label="Washed with unscented soap" checked={washed} onToggle={() => setWashed(!washed)} />
              <View style={styles.checkDivider} />
              <CheckRow label="Applied moisturizer" checked={moisturized} onToggle={() => setMoisturized(!moisturized)} />
            </View>

            {/* Symptoms */}
            <Text style={[commonStyles.sectionHeader, { marginTop: SPACING.md }]}>HOW'S IT LOOKING?</Text>
            <View style={styles.checkGroup}>
              <CheckRow label="Peeling / flaking" checked={peeling} onToggle={() => setPeeling(!peeling)} variant="warning" />
              <View style={styles.checkDivider} />
              <CheckRow label="Itching" checked={itching} onToggle={() => setItching(!itching)} variant="warning" />
              <View style={styles.checkDivider} />
              <CheckRow label="Redness" checked={redness} onToggle={() => setRedness(!redness)} variant="warning" />
              <View style={styles.checkDivider} />
              <CheckRow label="Swelling" checked={swelling} onToggle={() => setSwelling(!swelling)} variant="warning" />
            </View>

            {/* Warning signs */}
            <Text style={[commonStyles.sectionHeader, { marginTop: SPACING.md, color: COLORS.danger + 'AA' }]}>⚠ WARNING SIGNS</Text>
            <View style={[styles.checkGroup, styles.warningGroup]}>
              <CheckRow label="Discharge (thick, green, or foul-smelling)" checked={discharge} onToggle={() => setDischarge(!discharge)} variant="danger" />
              <View style={styles.checkDivider} />
              <CheckRow label="Fever or feeling generally unwell" checked={fever} onToggle={() => setFever(!fever)} variant="danger" />
            </View>

            {/* Notes */}
            <Text style={[commonStyles.sectionHeader, { marginTop: SPACING.md }]}>NOTES</Text>
            <TextInput
              style={[commonStyles.input, styles.notesInput]}
              placeholder="Observations, questions for your artist, etc."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Photo */}
            <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto}>
              <Feather name="camera" size={18} color={COLORS.accent} />
              <Text style={styles.photoBtnText}>Add Today's Photo</Text>
            </TouchableOpacity>

            {/* Save */}
            <TouchableOpacity
              style={[commonStyles.button, { marginTop: SPACING.md }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={commonStyles.buttonText}>
                  {existingLogId ? 'Update Log' : 'Save Log'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
  },
  selectorScroll: {
    marginBottom: SPACING.md,
    marginHorizontal: -SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  selectorChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
    backgroundColor: COLORS.card,
  },
  selectorChipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  selectorText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  selectorTextActive: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
  dayText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  calendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  calDay: {
    alignItems: 'center',
    gap: 4,
  },
  calDayLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  calDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  calDotToday: {
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  calDotLogged: {
    backgroundColor: COLORS.success + '33',
  },
  calDotMissed: {
    backgroundColor: COLORS.danger + '22',
  },
  calDayNum: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  calDayNumToday: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.bold,
  },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  healthLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  healthSub: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 2,
  },
  checkGroup: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  warningGroup: {
    borderWidth: 1,
    borderColor: COLORS.danger + '33',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkLabel: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    flex: 1,
  },
  checkLabelDanger: {
    color: COLORS.danger,
  },
  checkLabelWarning: {
    color: COLORS.warning,
  },
  checkDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  notesInput: {
    height: 90,
    paddingTop: SPACING.md,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent + '12',
  },
  photoBtnText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    marginTop: SPACING.md,
  },
});
