import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { addTattoo } from '../database/db';
import { scheduleMorningReminder, scheduleEveningReminder } from '../utils/notifications';
import { scheduleMilestoneReminders, scheduleAnniversaryNotifications } from '../utils/pushNotifications';
import { checkAndAwardBadges } from '../utils/badgeEngine';
import { getTattoos } from '../database/db';

const STYLES = ['Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Blackwork', 'Geometric', 'Tribal', 'Japanese', 'New School', 'Fine Line', 'Other'];
const PLACEMENTS = ['Forearm', 'Upper Arm', 'Bicep', 'Wrist', 'Hand', 'Chest', 'Ribs', 'Back', 'Shoulder', 'Neck', 'Leg', 'Thigh', 'Calf', 'Ankle', 'Foot', 'Hip', 'Other'];

export default function AddTattooScreen({ navigation }) {
  const { proStatus, activeCount, refreshTattoos, purchasePro, restorePurchases } = useApp();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [placement, setPlacement] = useState('');
  const [style, setStyle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [artistInstagram, setArtistInstagram] = useState('');
  const [shopName, setShopName] = useState('');
  const [painRating, setPainRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stylePickerVisible, setStylePickerVisible] = useState(false);
  const [placementPickerVisible, setPlacementPickerVisible] = useState(false);

  const isProGated = !proStatus && activeCount >= 1;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setThumbnail(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a tattoo name.');
    if (!date.trim()) return Alert.alert('Required', 'Please enter the date tattooed (YYYY-MM-DD).');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) return Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format (e.g. 2024-03-15).');

    setSaving(true);
    try {
      await addTattoo({
        name: name.trim(), date_tattooed: date.trim(), placement: placement || null,
        style: style || null, artist_name: artistName.trim() || null,
        artist_instagram: artistInstagram.trim().replace(/^@/, '') || null,
        shop_name: shopName.trim() || null, pain_rating: painRating || null,
        notes: notes.trim() || null, thumbnail_uri: thumbnail || null,
      });
      await refreshTattoos();
      await scheduleMorningReminder();
      await scheduleEveningReminder();

      // Schedule per-tattoo milestone and anniversary notifications
      const allTattoos = await getTattoos();
      const newTattoo = allTattoos.find((t) => t.name === name.trim());
      if (newTattoo) {
        await scheduleMilestoneReminders(newTattoo);
      }
      await scheduleAnniversaryNotifications(allTattoos);

      // Check and award badges
      await checkAndAwardBadges('tattoo_added', { tattoos: allTattoos });

      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save tattoo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isProGated) {
    return (
      <View style={[commonStyles.container, styles.gateContainer]}>
        <View style={styles.gateCard}>
          <Text style={styles.gateIcon}>⭐</Text>
          <Text style={styles.gateTitle}>Upgrade to Pro</Text>
          <Text style={styles.gateSubtitle}>
            The free tier includes 1 active tattoo.{'\n'}Upgrade to track unlimited tattoos, view photo timelines, and share your portfolio.
          </Text>
          <View style={styles.gateFeatures}>
            {['Unlimited tattoos', 'Photo timelines', 'Shareable portfolio cards', 'Custom reminders'].map((f) => (
              <View key={f} style={styles.gateFeatureRow}>
                <Feather name="check" size={14} color={COLORS.accent} />
                <Text style={styles.gateFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.gateButtonPrimary} onPress={purchasePro} activeOpacity={0.85}>
            <Text style={styles.gateButtonPrimaryText}>Unlock Pro — $4.99</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gateButtonSecondary} onPress={restorePurchases} activeOpacity={0.75}>
            <Text style={styles.gateButtonSecondaryText}>Restore Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.gateBack}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={commonStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoCircle} onPress={handlePickPhoto} activeOpacity={0.8}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={styles.photoCircleImage} />
            ) : (
              <View style={styles.photoCirclePlaceholder}>
                <Feather name="camera" size={24} color={COLORS.accent} />
                <Text style={styles.photoCircleText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tattoo Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TATTOO INFO</Text>
          <View style={styles.card}>
            <FormField label="Name" required>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Sleeve, Rose, Geometric" placeholderTextColor={COLORS.textMuted} />
            </FormField>
            <View style={styles.fieldDivider} />
            <FormField label="Date Tattooed" required>
              <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" />
            </FormField>
          </View>
        </View>

        {/* Style & Placement */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>STYLE & PLACEMENT</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setStylePickerVisible(true)} activeOpacity={0.75}>
              <Text style={[styles.pickerButtonText, !style && { color: COLORS.textMuted }]}>{style || 'Style'}</Text>
              <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setPlacementPickerVisible(true)} activeOpacity={0.75}>
              <Text style={[styles.pickerButtonText, !placement && { color: COLORS.textMuted }]}>{placement || 'Placement'}</Text>
              <Feather name="chevron-down" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Artist Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ARTIST INFO</Text>
          <View style={styles.card}>
            <FormField label="Artist Name">
              <TextInput style={styles.input} value={artistName} onChangeText={setArtistName} placeholder="Artist name" placeholderTextColor={COLORS.textMuted} />
            </FormField>
            <View style={styles.fieldDivider} />
            <FormField label="Instagram">
              <TextInput style={styles.input} value={artistInstagram} onChangeText={setArtistInstagram} placeholder="@handle" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
            </FormField>
            <View style={styles.fieldDivider} />
            <FormField label="Shop Name">
              <TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Shop name" placeholderTextColor={COLORS.textMuted} />
            </FormField>
          </View>
        </View>

        {/* Pain Rating */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAIN RATING</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>How painful was it? (1–10)</Text>
            <View style={styles.dotsRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <TouchableOpacity
                  key={n} style={[styles.dot, painRating >= n && styles.dotActive]}
                  onPress={() => setPainRating(n === painRating ? 0 : n)} activeOpacity={0.7}
                >
                  <Text style={[styles.dotText, painRating >= n && styles.dotTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <TextInput
            style={styles.notesInput} value={notes} onChangeText={setNotes}
            placeholder="Anything to remember about this session..." placeholderTextColor={COLORS.textMuted}
            multiline numberOfLines={4} textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add Tattoo'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Style picker modal */}
      <PickerModal visible={stylePickerVisible} title="Style" options={STYLES} selected={style}
        onSelect={(v) => { setStyle(v); setStylePickerVisible(false); }}
        onClose={() => setStylePickerVisible(false)} />

      {/* Placement picker modal */}
      <PickerModal visible={placementPickerVisible} title="Placement" options={PLACEMENTS} selected={placement}
        onSelect={(v) => { setPlacement(v); setPlacementPickerVisible(false); }}
        onClose={() => setPlacementPickerVisible(false)} />
    </KeyboardAvoidingView>
  );
}

function FormField({ label, required, children }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      {children}
    </View>
  );
}

function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <TouchableOpacity key={opt} style={[styles.modalOption, selected === opt && styles.modalOptionActive]} onPress={() => onSelect(opt)} activeOpacity={0.7}>
                <Text style={[styles.modalOptionText, selected === opt && styles.modalOptionTextActive]}>{opt}</Text>
                {selected === opt && <Feather name="check" size={16} color={COLORS.accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  photoSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  photoCircle: { width: 120, height: 120, borderRadius: 60, overflow: 'hidden' },
  photoCircleImage: { width: '100%', height: '100%' },
  photoCirclePlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.accentBorder, borderStyle: 'dashed', borderRadius: 60, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  photoCircleText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  fieldDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  fieldLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  input: { color: COLORS.textPrimary, fontSize: 15, paddingVertical: SPACING.sm },
  pickerRow: { flexDirection: 'row', gap: SPACING.sm },
  pickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg },
  pickerButtonText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm },
  dot: { width: 26, height: 26, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },
  dotTextActive: { color: COLORS.textInverse },
  notesInput: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, color: COLORS.textPrimary, fontSize: 15, padding: SPACING.md, minHeight: 90 },
  saveButton: { marginHorizontal: SPACING.lg, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  saveButtonText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...FONTS.headingMedium },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  modalOptionActive: { backgroundColor: COLORS.accentMuted },
  modalOptionText: { color: COLORS.textSecondary, fontSize: 15 },
  modalOptionTextActive: { color: COLORS.accent, fontWeight: '600' },
  gateContainer: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  gateCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accentBorder, gap: SPACING.md, width: '100%' },
  gateIcon: { fontSize: 40 },
  gateTitle: { ...FONTS.headingLarge },
  gateSubtitle: { ...FONTS.body, textAlign: 'center' },
  gateFeatures: { width: '100%', gap: SPACING.sm, marginVertical: SPACING.sm },
  gateFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gateFeatureText: { color: COLORS.textSecondary, fontSize: 14 },
  gateButtonPrimary: { width: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  gateButtonPrimaryText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700' },
  gateButtonSecondary: { width: '100%', borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  gateButtonSecondaryText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },
  gateBack: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.sm },
});
