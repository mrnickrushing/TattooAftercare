/**
 * NotificationSettingsScreen.js
 *
 * Lets users toggle push notification preferences.
 * Preferences are persisted via getSetting / setSetting from db.js.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getSetting, setSetting } from '../database/db';

const PREFS = [
  {
    key: 'notif_daily_care',
    label: 'Daily Care Reminder',
    description: 'Remind me each day to wash and moisturize.',
    icon: 'droplet',
  },
  {
    key: 'notif_healing_milestone',
    label: 'Healing Milestones',
    description: 'Alert when a tattoo moves to the next healing stage.',
    icon: 'activity',
  },
  {
    key: 'notif_touchup_reminder',
    label: 'Touch-up Reminder',
    description: 'Remind me 3 months after a tattoo is healed.',
    icon: 'clock',
  },
  {
    key: 'notif_social',
    label: 'Social Activity',
    description: 'Notify me about likes, comments, and new followers.',
    icon: 'bell',
  },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    const loaded = {};
    for (const p of PREFS) {
      const val = await getSetting(p.key);
      // Default everything to ON if not yet set
      loaded[p.key] = val === null ? true : val === 'true';
    }
    setPrefs(loaded);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadPrefs(); }, [loadPrefs]));

  const handleToggle = async (key, newValue) => {
    setPrefs((prev) => ({ ...prev, [key]: newValue }));
    setSaving(true);
    try {
      await setSetting(key, String(newValue));
    } catch {
      // Revert on failure
      setPrefs((prev) => ({ ...prev, [key]: !newValue }));
      Alert.alert('Error', 'Could not save preference. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableAll = async () => {
    Alert.alert(
      'Disable All Notifications',
      'This will turn off all push notifications from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable All',
          style: 'destructive',
          onPress: async () => {
            const updated = {};
            for (const p of PREFS) {
              updated[p.key] = false;
              await setSetting(p.key, 'false');
            }
            setPrefs(updated);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHeader}>PUSH NOTIFICATIONS</Text>

      <View style={styles.card}>
        {PREFS.map((pref, index) => (
          <View key={pref.key}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.prefRow}>
              <View style={styles.prefIconWrap}>
                <Feather name={pref.icon} size={18} color={COLORS.accent} />
              </View>
              <View style={styles.prefText}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefDesc}>{pref.description}</Text>
              </View>
              <Switch
                value={prefs[pref.key] ?? true}
                onValueChange={(val) => handleToggle(pref.key, val)}
                trackColor={{ false: COLORS.surface, true: COLORS.accentMuted }}
                thumbColor={prefs[pref.key] ? COLORS.accent : COLORS.textMuted}
                ios_backgroundColor={COLORS.surface}
              />
            </View>
          </View>
        ))}
      </View>

      {saving && (
        <View style={styles.savingRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.savingText}>Saving…</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.disableAllBtn}
        onPress={handleDisableAll}
        activeOpacity={0.75}
      >
        <Feather name="bell-off" size={15} color={COLORS.danger} />
        <Text style={styles.disableAllText}>Disable All Notifications</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        You can also manage notifications in your device Settings → Notifications → Tattoo Aftercare.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: SPACING.lg },

  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    ...SHADOWS.card,
  },

  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  prefIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentMuted,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefText: { flex: 1, gap: 3 },
  prefLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  prefDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },

  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  savingText: { color: COLORS.textMuted, fontSize: 12 },

  disableAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dangerMuted,
    backgroundColor: COLORS.dangerMuted,
  },
  disableAllText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '600',
  },

  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
});
