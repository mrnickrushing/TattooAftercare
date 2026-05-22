/**
 * NotificationSettingsScreen.js — Issue #19
 * Manage push notification preferences: milestone alerts, daily care reminders,
 * anniversary ("This Day in Healing"), and quiet hours.
 * Preferences stored in AsyncStorage under key 'notification_prefs'.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import {
  scheduleDailyCareReminder,
  scheduleAnniversaryNotifications,
  cancelAllNotifications,
} from '../utils/pushNotifications';
import { getTattoos } from '../database/db';

const PREFS_KEY = 'notification_prefs';

const DEFAULT_PREFS = {
  milestoneAlerts: true,
  dailyReminder: true,
  anniversaryReminder: true,
  dailyReminderHour: 9,
  quietHoursEnabled: false,
  quietHoursStart: 22,
  quietHoursEnd: 8,
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h) {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

function SettingRow({ icon, title, subtitle, value, onValueChange, disabled }) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIconWrap, disabled && styles.settingIconDisabled]}>
        <Feather name={icon} size={16} color={disabled ? COLORS.textMuted : COLORS.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.accentBorder }}
        thumbColor={value ? COLORS.accent : COLORS.textMuted}
      />
    </View>
  );
}

function HourPicker({ label, value, onChange }) {
  return (
    <View style={styles.hourPicker}>
      <Text style={styles.hourPickerLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hourPickerRow}
      >
        {HOURS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.hourChip, value === h && styles.hourChipActive]}
            onPress={() => onChange(h)}
            activeOpacity={0.75}
          >
            <Text style={[styles.hourChipText, value === h && styles.hourChipTextActive]}>
              {formatHour(h)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(null);

  useEffect(() => {
    (async () => {
      // Check permission status
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionGranted(status === 'granted');

      // Load saved prefs
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device Settings to receive reminders.',
        [{ text: 'OK' }]
      );
    }
  };

  const saveAndApply = useCallback(async (newPrefs) => {
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));

      if (!permissionGranted) {
        setSaving(false);
        return;
      }

      // Cancel all and reschedule based on new prefs
      const tattoos = await getTattoos();

      // Daily reminder
      if (newPrefs.dailyReminder && tattoos.length > 0) {
        const active = tattoos.find((t) => {
          const days = Math.floor((Date.now() - new Date(t.date_tattooed).getTime()) / 86400000);
          return days <= 30;
        });
        if (active) {
          await scheduleDailyCareReminder(active.name, newPrefs.dailyReminderHour);
        }
      } else if (!newPrefs.dailyReminder) {
        // Cancel existing daily reminders (they have type: 'care_reminder')
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content?.data?.type === 'care_reminder') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }

      // Anniversary reminders
      if (newPrefs.anniversaryReminder) {
        await scheduleAnniversaryNotifications(tattoos);
      } else {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content?.data?.type === 'anniversary') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }

      // Milestone alerts are scheduled on tattoo creation; if disabled, cancel them
      if (!newPrefs.milestoneAlerts) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        for (const n of scheduled) {
          if (n.content?.data?.type === 'milestone') {
            await Notifications.cancelScheduledNotificationAsync(n.identifier);
          }
        }
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save notification settings.');
    } finally {
      setSaving(false);
    }
  }, [permissionGranted]);

  const update = (key, value) => {
    const updated = { ...prefs, [key]: value };
    saveAndApply(updated);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Permission banner */}
      {!permissionGranted && (
        <TouchableOpacity style={styles.permissionBanner} onPress={requestPermission} activeOpacity={0.85}>
          <Feather name="bell-off" size={18} color={COLORS.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.permissionTitle}>Notifications Disabled</Text>
            <Text style={styles.permissionBody}>Tap to enable notifications in system settings.</Text>
          </View>
          <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}

      {/* Notification types */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>NOTIFICATION TYPES</Text>
        <View style={styles.card}>
          <SettingRow
            icon="activity"
            title="Milestone Alerts"
            subtitle="Day 3, 7, 14, 30 healing milestones"
            value={prefs.milestoneAlerts}
            onValueChange={(v) => update('milestoneAlerts', v)}
            disabled={!permissionGranted}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="droplet"
            title="Daily Care Reminder"
            subtitle="Reminder to wash and moisturize during healing"
            value={prefs.dailyReminder}
            onValueChange={(v) => update('dailyReminder', v)}
            disabled={!permissionGranted}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon="calendar"
            title="This Day in Healing"
            subtitle="Anniversary of each tattoo's creation date"
            value={prefs.anniversaryReminder}
            onValueChange={(v) => update('anniversaryReminder', v)}
            disabled={!permissionGranted}
          />
        </View>
      </View>

      {/* Daily reminder time */}
      {prefs.dailyReminder && permissionGranted && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DAILY REMINDER TIME</Text>
          <View style={[styles.card, { paddingVertical: SPACING.md }]}>
            <HourPicker
              label="Remind me at:"
              value={prefs.dailyReminderHour}
              onChange={(h) => update('dailyReminderHour', h)}
            />
          </View>
        </View>
      )}

      {/* Quiet hours */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>QUIET HOURS</Text>
        <View style={styles.card}>
          <SettingRow
            icon="moon"
            title="Quiet Hours"
            subtitle="Suppress notifications during set hours"
            value={prefs.quietHoursEnabled}
            onValueChange={(v) => update('quietHoursEnabled', v)}
            disabled={!permissionGranted}
          />
          {prefs.quietHoursEnabled && permissionGranted && (
            <>
              <View style={styles.rowDivider} />
              <HourPicker
                label="Start (no notifications after):"
                value={prefs.quietHoursStart}
                onChange={(h) => update('quietHoursStart', h)}
              />
              <View style={styles.rowDivider} />
              <HourPicker
                label="End (notifications resume at):"
                value={prefs.quietHoursEnd}
                onChange={(h) => update('quietHoursEnd', h)}
              />
            </>
          )}
        </View>
      </View>

      {/* Note about auto-disable */}
      <View style={styles.infoCard}>
        <Feather name="info" size={14} color={COLORS.accent} />
        <Text style={styles.infoText}>
          Daily care reminders automatically stop after the 30-day milestone is reached for each tattoo.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.savingText}>Updating reminders…</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.xl, paddingBottom: 100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  permissionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.warningMuted, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.warning + '44',
    padding: SPACING.lg,
  },
  permissionTitle: { color: COLORS.warning, fontSize: 14, fontWeight: '700' },
  permissionBody: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },

  section: { gap: SPACING.sm },
  sectionHeader: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingHorizontal: SPACING.md, overflow: 'hidden',
    ...SHADOWS.card,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md,
  },
  settingIconWrap: {
    width: 32, height: 32, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  settingIconDisabled: { backgroundColor: COLORS.border },
  settingTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  settingTitleDisabled: { color: COLORS.textMuted },
  settingSubtitle: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 48 },

  hourPicker: { gap: SPACING.sm, paddingVertical: SPACING.sm },
  hourPickerLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  hourPickerRow: { gap: SPACING.xs, paddingHorizontal: SPACING.xs },
  hourChip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  hourChipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  hourChipText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  hourChipTextActive: { color: COLORS.accent },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    padding: SPACING.md,
  },
  infoText: { flex: 1, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },

  savingRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    justifyContent: 'center', paddingVertical: SPACING.sm,
  },
  savingText: { color: COLORS.textMuted, fontSize: 12 },
});
