import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image,
  Animated, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO, subDays, isToday } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed, getStage, calculateHealthStatus } from '../utils/healingStages';
import { getCareLogForDate, addCareLog, updateCareLog, getCareLogsForTattoo, addPhoto, getTattoos, getStreak } from '../database/db';
import { checkAndAwardBadges } from '../utils/badgeEngine';
import EmptyState from '../components/EmptyState';

const today = format(new Date(), 'yyyy-MM-dd');

function AnimatedWeekDot({ date, label, isToday, hasEntry, isPast, onLongPress }) {
  const checkScale = useRef(new Animated.Value(hasEntry ? 1 : 0)).current;
  const checkOpacity = useRef(new Animated.Value(hasEntry ? 1 : 0)).current;
  const prevHasEntry = useRef(hasEntry);

  useEffect(() => {
    if (hasEntry && !prevHasEntry.current) {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }),
        Animated.timing(checkOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else if (!hasEntry) {
      checkScale.setValue(0);
      checkOpacity.setValue(0);
    }
    prevHasEntry.current = hasEntry;
  }, [hasEntry]);

  return (
    <TouchableOpacity
      style={styles.weekDay}
      onLongPress={onLongPress}
      activeOpacity={onLongPress ? 0.7 : 1}
      disabled={!onLongPress}
    >
      <Text style={[styles.weekDayLabel, isToday && { color: COLORS.accent }]}>{label}</Text>
      <View style={[
        styles.weekDot,
        isToday && styles.weekDotToday,
        hasEntry && { backgroundColor: COLORS.accent },
        !hasEntry && isPast && { backgroundColor: COLORS.danger + '44' },
        isToday && {
          shadowColor: COLORS.accent,
          shadowOpacity: 0.55,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        },
      ]}>
        {hasEntry && (
          <Animated.View style={{ transform: [{ scale: checkScale }], opacity: checkOpacity }}>
            <Feather name="check" size={8} color={COLORS.textInverse} />
          </Animated.View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE')[0], isToday: isToday(d) };
  });
}

export default function CareLogScreen({ navigation }) {
  const { tattoos, refreshStreak } = useApp();
  const activeTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));

  const [selectedId, setSelectedId] = useState(null);
  const [log, setLog] = useState({ washed: false, moisturized: false, peeling: false, itching: false, redness: false, swelling: false, discharge: false, fever: false });
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [existingLogId, setExistingLogId] = useState(null);
  const [weekLogs, setWeekLogs] = useState({});
  const [saving, setSaving] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [peekedLog, setPeekedLog] = useState(null);

  const selectedTattoo = activeTattoos.find((t) => t.id === selectedId) || activeTattoos[0];

  useFocusEffect(useCallback(() => {
    if (activeTattoos.length > 0 && !selectedId) {
      setSelectedId(activeTattoos[0].id);
    }
  }, [tattoos]));

  useEffect(() => {
    if (selectedTattoo) loadLog(selectedTattoo.id);
  }, [selectedTattoo?.id]);

  const loadLog = async (tattooId) => {
    const existing = await getCareLogForDate(tattooId, today);
    if (existing) {
      setExistingLogId(existing.id);
      setLog({
        washed: existing.washed === 1, moisturized: existing.moisturized === 1,
        peeling: existing.peeling === 1, itching: existing.itching === 1,
        redness: existing.redness === 1, swelling: existing.swelling === 1,
        discharge: existing.discharge === 1, fever: existing.fever === 1,
      });
      setNotes(existing.notes || '');
      setPhoto(existing.photo_uri || null);
    } else {
      setExistingLogId(null);
      setLog({ washed: false, moisturized: false, peeling: false, itching: false, redness: false, swelling: false, discharge: false, fever: false });
      setNotes('');
      setPhoto(null);
    }

    const all = await getCareLogsForTattoo(tattooId);
    const map = {};
    all.forEach((l) => { map[l.log_date] = l; });
    setWeekLogs(map);
  };

  const toggle = (key) => setLog((prev) => ({ ...prev, [key]: !prev[key] }));

  const healthStatus = calculateHealthStatus(log);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!selectedTattoo) return;
    setSaving(true);
    try {
      const data = {
        tattoo_id: selectedTattoo.id, log_date: today,
        washed: log.washed ? 1 : 0, moisturized: log.moisturized ? 1 : 0,
        peeling: log.peeling ? 1 : 0, itching: log.itching ? 1 : 0,
        redness: log.redness ? 1 : 0, swelling: log.swelling ? 1 : 0,
        discharge: log.discharge ? 1 : 0, fever: log.fever ? 1 : 0,
        notes, health_status: healthStatus, photo_uri: photo || null,
      };
      if (existingLogId) {
        await updateCareLog(existingLogId, data);
      } else {
        const newId = await addCareLog(data);
        setExistingLogId(newId);
        if (photo) {
          const day = Math.max(1, Math.round((new Date() - parseISO(selectedTattoo.date_tattooed)) / 86400000) + 1);
          await addPhoto({ tattoo_id: selectedTattoo.id, uri: photo, taken_date: today, day_number: day });
        }
      }
      await refreshStreak();
      await loadLog(selectedTattoo.id);

      // Badge checks after saving care log
      try {
        const allTattoos = await getTattoos();
        const allLogs = await getCareLogsForTattoo(selectedTattoo.id);
        const currentStreak = await getStreak();
        await checkAndAwardBadges('care_log_saved', {
          tattoos: allTattoos,
          streak: currentStreak || 0,
          careLogs: allLogs,
          tattooId: selectedTattoo.id,
        });
      } catch {}

      Alert.alert('Saved', healthStatus === 'doctor' ? '\u26a0\ufe0f Please consult a doctor about your symptoms.' : healthStatus === 'attention' ? 'Keep an eye on your tattoo.' : 'Keep up the great care!');
    } catch (e) {
      Alert.alert('Error', 'Could not save log.');
    } finally {
      setSaving(false);
    }
  };

  const last7 = getLast7Days();

  const statusConfig = {
    good: { color: COLORS.success, bg: COLORS.successMuted, border: COLORS.success + '44', icon: 'check-circle', label: 'Healing Well' },
    attention: { color: COLORS.warning, bg: COLORS.warningMuted, border: COLORS.warning + '44', icon: 'alert-triangle', label: 'Needs Attention \u2014 monitor closely' },
    doctor: { color: COLORS.danger, bg: COLORS.dangerMuted, border: COLORS.danger + '44', icon: 'alert-octagon', label: 'See a Doctor \u2014 signs of infection' },
  };
  const sc = statusConfig[healthStatus];

  if (activeTattoos.length === 0) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <EmptyState
          icon="\ud83d\udccb"
          title="No active tattoos"
          body="Add a tattoo to start logging your care."
          action={{ label: 'Add Tattoo', onPress: () => navigation.navigate('AddTattoo') }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={commonStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Tattoo selector */}
        {activeTattoos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorBar} contentContainerStyle={styles.selectorContent}>
            {activeTattoos.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.selectorChip, selectedTattoo?.id === t.id && styles.selectorChipActive]}
                onPress={() => setSelectedId(t.id)} activeOpacity={0.7}
              >
                <Text style={[styles.selectorChipText, selectedTattoo?.id === t.id && styles.selectorChipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Date + header */}
        <View style={styles.dateHeader}>
          <Text style={styles.dateLabel}>{format(new Date(), 'EEEE, MMMM d').toUpperCase()}</Text>
          {existingLogId && (
            <View style={styles.updatingBadge}>
              <Text style={styles.updatingBadgeText}>UPDATE</Text>
            </View>
          )}
        </View>

        {/* 7-day mini calendar */}
        <View style={styles.weekRow}>
          {last7.map(({ date, label, isToday: isTd }) => {
            const logged = weekLogs[date];
            const hasEntry = !!logged;
            const isPast = date < today;
            return (
              <AnimatedWeekDot
                key={date}
                date={date}
                label={label}
                isToday={isTd}
                hasEntry={hasEntry}
                isPast={isPast}
                onLongPress={isPast && hasEntry ? () => setPeekedLog(logged) : undefined}
              />
            );
          })}
        </View>

        {/* Peek modal for long-pressed past log */}
        <Modal
          visible={!!peekedLog}
          transparent
          animationType="fade"
          onRequestClose={() => setPeekedLog(null)}
        >
          <TouchableOpacity style={styles.peekOverlay} activeOpacity={1} onPress={() => setPeekedLog(null)}>
            <View style={styles.peekCard}>
              <Text style={styles.peekDate}>{peekedLog?.log_date}</Text>
              <View style={styles.peekRow}>
                <Feather name="droplet" size={14} color={peekedLog?.washed ? COLORS.accent : COLORS.textMuted} />
                <Text style={[styles.peekLabel, peekedLog?.washed && { color: COLORS.accent }]}>Washed</Text>
                {peekedLog?.washed ? <Feather name="check-circle" size={14} color={COLORS.accent} /> : <Feather name="circle" size={14} color={COLORS.textMuted} />}
              </View>
              <View style={styles.peekRow}>
                <Feather name="wind" size={14} color={peekedLog?.moisturized ? COLORS.accent : COLORS.textMuted} />
                <Text style={[styles.peekLabel, peekedLog?.moisturized && { color: COLORS.accent }]}>Moisturized</Text>
                {peekedLog?.moisturized ? <Feather name="check-circle" size={14} color={COLORS.accent} /> : <Feather name="circle" size={14} color={COLORS.textMuted} />}
              </View>
              {peekedLog?.notes ? <Text style={styles.peekNotes} numberOfLines={3}>{peekedLog.notes}</Text> : null}
              <Text style={styles.peekDismiss}>Tap anywhere to close</Text>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Health status */}
        <View style={[styles.statusBanner, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Feather name={sc.icon} size={16} color={sc.color} />
          <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
        </View>

        {/* Care done */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CARE DONE TODAY</Text>
          <View style={styles.toggleRow}>
            <ToggleButton label="WASHED" icon="droplet" active={log.washed} onPress={() => toggle('washed')} />
            <ToggleButton label="MOISTURIZED" icon="wind" active={log.moisturized} onPress={() => toggle('moisturized')} />
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HOW'S IT LOOKING?</Text>
          <View style={styles.checkGrid}>
            {[
              { key: 'peeling', label: 'Peeling' },
              { key: 'itching', label: 'Itching' },
              { key: 'redness', label: 'Redness' },
              { key: 'swelling', label: 'Swelling' },
            ].map(({ key, label }) => (
              <CheckboxItem key={key} label={label} checked={log[key]} onPress={() => toggle(key)} />
            ))}
          </View>
        </View>

        {/* Warning signs - danger tinted background */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: COLORS.danger + 'BB' }]}>⚠ WARNING SIGNS</Text>
          <View style={styles.warningCard}>
            <CheckboxItem label="Discharge / Oozing" checked={log.discharge} onPress={() => toggle('discharge')} danger />
            <View style={styles.checkDivider} />
            <CheckboxItem label="Fever" checked={log.fever} onPress={() => toggle('fever')} danger />
          </View>
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY'S PHOTO</Text>
          <TouchableOpacity
            style={styles.photoRow}
            onPress={handlePickPhoto}
            activeOpacity={0.75}
            accessibilityLabel={photo ? 'Change photo' : 'Add photo'}
            accessibilityRole="button"
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoThumb} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Feather name="camera" size={20} color={COLORS.textMuted} />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notes - animated border on focus */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <TextInput
            style={[styles.notesInput, notesFocused && styles.notesInputFocused]}
            value={notes} onChangeText={setNotes}
            placeholder="How's it feeling? Any observations..."
            placeholderTextColor={COLORS.textMuted}
            multiline numberOfLines={4} textAlignVertical="top"
            onFocus={() => setNotesFocused(true)}
            onBlur={() => setNotesFocused(false)}
          />
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityLabel={saving ? 'Saving care log' : existingLogId ? 'Update care log' : 'Save care log'}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : existingLogId ? 'Update Log' : 'Save Log'}</Text>
        </TouchableOpacity>

        {/* Create Journal Post shortcut */}
        {selectedTattoo && (
          <TouchableOpacity
            style={styles.journalPostButton}
            onPress={() => navigation.navigate('CreateJournalPost', { tattoo: selectedTattoo })}
            activeOpacity={0.85}
          >
            <Feather name="edit-3" size={15} color={COLORS.accent} />
            <Text style={styles.journalPostButtonText}>Add Journal Post</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ToggleButton({ label, icon, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${label}${active ? ', done' : ', not done'}`}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
    >
      <Feather name={icon} size={18} color={active ? COLORS.textInverse : COLORS.textMuted} />
      <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function CheckboxItem({ label, checked, onPress, danger }) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[
        styles.checkbox,
        checked && { backgroundColor: danger ? COLORS.danger : COLORS.accent, borderColor: danger ? COLORS.danger : COLORS.accent },
        !checked && danger && { borderColor: COLORS.danger + '66' },
      ]}>
        {checked && <Feather name="check" size={11} color={COLORS.textInverse} />}
      </View>
      <Text style={[styles.checkLabel, checked && { color: COLORS.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl },
  selectorBar: { marginBottom: SPACING.md },
  selectorContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  selectorChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  selectorChipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  selectorChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  selectorChipTextActive: { color: COLORS.accent },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  dateLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  updatingBadge: { backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.accentBorder },
  updatingBadgeText: { color: COLORS.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  weekRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg, justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', gap: 4 },
  weekDayLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  weekDot: { width: 24, height: 24, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  weekDotToday: { borderColor: COLORS.accentBorder },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.lg, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1 },
  statusText: { fontSize: 13, fontWeight: '600', flex: 1 },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  toggleRow: { flexDirection: 'row', gap: SPACING.sm },
  toggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, paddingVertical: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  toggleBtnActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, ...SHADOWS.gold },
  toggleBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  toggleBtnTextActive: { color: COLORS.textInverse },
  checkGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '48%' },
  checkbox: { width: 20, height: 20, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', flex: 1 },
  // Warning card — subtle danger tint on background
  warningCard: {
    backgroundColor: 'rgba(224,82,82,0.06)',
    borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.danger + '33',
    overflow: 'hidden', paddingHorizontal: SPACING.md,
  },
  checkDivider: { height: 1, backgroundColor: COLORS.border },
  photoRow: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  photoThumb: { width: '100%', height: 140, borderRadius: RADIUS.lg },
  photoPlaceholder: {
    height: 80, backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderGold, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: SPACING.sm,
  },
  photoPlaceholderText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  notesInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontSize: 15, padding: SPACING.md, minHeight: 80,
  },
  notesInputFocused: {
    borderColor: COLORS.accentBorder,
  },
  saveButton: {
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md, paddingVertical: SPACING.lg,
    alignItems: 'center', ...SHADOWS.gold,
  },
  saveButtonText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  peekOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  peekCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    padding: SPACING.xl, width: '80%', gap: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  peekDate: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.8, marginBottom: SPACING.xs },
  peekRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  peekLabel: { color: COLORS.textSecondary, fontSize: 14, flex: 1, fontWeight: '500' },
  peekNotes: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginTop: SPACING.xs },
  peekDismiss: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: SPACING.sm },
  journalPostButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginTop: SPACING.md, marginBottom: SPACING.lg,
    paddingVertical: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accentBorder,
  },
  journalPostButtonText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
});
