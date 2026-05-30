import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Image, Modal, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { addTattoo, getTattoos, getTattooById } from '../database/db';
import { scheduleMorningReminder, scheduleEveningReminder } from '../utils/notifications';
import { scheduleMilestoneReminders, scheduleAnniversaryNotifications } from '../utils/pushNotifications';
import { checkAndAwardBadges } from '../utils/badgeEngine';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const STYLES = ['Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Blackwork', 'Geometric', 'Tribal', 'Japanese', 'New School', 'Fine Line', 'Other'];
const PLACEMENTS = ['Forearm', 'Upper Arm', 'Bicep', 'Wrist', 'Hand', 'Chest', 'Ribs', 'Back', 'Shoulder', 'Neck', 'Leg', 'Thigh', 'Calf', 'Ankle', 'Foot', 'Hip', 'Other'];

function isValidTattooDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (parsed.getFullYear() !== year || parsed.getMonth() + 1 !== month || parsed.getDate() !== day) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return parsed <= today;
}

export default function AddTattooScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
  const step1Done = name.trim().length > 0;
  const step2Done = isValidTattooDate(date.trim());
  const step3Done = !!(style || placement);
  const step4Done = !!(artistName.trim() || thumbnail);
  const stepsCompleted = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) setThumbnail(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a tattoo name.');
    if (!date.trim()) return Alert.alert('Required', 'Please enter the date tattooed.');
    if (!isValidTattooDate(date.trim())) return Alert.alert('Invalid Date', 'Use a real past or current date in YYYY-MM-DD format.');

    setSaving(true);
    try {
      const newTattooId = await addTattoo({
        name: name.trim(),
        date_tattooed: date.trim(),
        placement: placement || null,
        style: style || null,
        artist_name: artistName.trim() || null,
        artist_instagram: artistInstagram.trim().replace(/^@/, '') || null,
        shop_name: shopName.trim() || null,
        pain_rating: painRating || null,
        notes: notes.trim() || null,
        thumbnail_uri: thumbnail || null,
      });
      await refreshTattoos();
      navigation.goBack();

      // Post-save side effects — failures here must not surface as a save error
      try {
        await scheduleMorningReminder();
        await scheduleEveningReminder();
        const allTattoos = await getTattoos();
        const newTattoo = await getTattooById(newTattooId);
        if (newTattoo) await scheduleMilestoneReminders(newTattoo);
        await scheduleAnniversaryNotifications(allTattoos);
        await checkAndAwardBadges('tattoo_added', { tattoos: allTattoos });
      } catch (e) {
        console.warn('Post-save side effect error:', e);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save tattoo. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isProGated) {
    return (
      <TattooBackground style={[commonStyles.container, styles.gateContainer]}>
        <View style={styles.gateCard}>
          <Text style={styles.gateIcon}>⭐</Text>
          <Text style={styles.gateTitle}>Upgrade to Pro</Text>
          <Text style={styles.gateSubtitle}>The free tier includes 1 active tattoo.{'\n'}Upgrade to track unlimited tattoos, view photo timelines, and share your portfolio.</Text>
          <View style={styles.gateFeatures}>
            {['Unlimited tattoos', 'Photo timelines', 'Shareable portfolio cards', 'Custom reminders'].map((f) => (
              <View key={f} style={styles.gateFeatureRow}>
                <Feather name="check" size={14} color={COLORS.accent} />
                <Text style={styles.gateFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.gateButtonPrimary} onPress={purchasePro} activeOpacity={0.85}>
            <Text style={styles.gateButtonPrimaryText}>Unlock Pro $4.99</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gateButtonSecondary} onPress={restorePurchases} activeOpacity={0.75}>
            <Text style={styles.gateButtonSecondaryText}>Restore Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.gateBack}>Not now</Text>
          </TouchableOpacity>
        </View>
      </TattooBackground>
    );
  }

  return (
    <TattooBackground style={commonStyles.container}>
      <KeyboardAvoidingView style={commonStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenHero
            eyebrow="New tattoo"
            title="Set up the care plan before the ink settles."
            subtitle="Add the basics, attach a photo, and the app will start reminders and milestone tracking."
            icon="plus-circle"
            stats={[{ label: 'Steps', value: `${stepsCompleted}/4` }, { label: 'Style', value: style ? 'Set' : 'Open' }, { label: 'Photo', value: thumbnail ? 'Set' : 'Open' }]}
          />

          <StepProgress steps={4} completed={stepsCompleted} />

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

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TATTOO INFO</Text>
            <View style={styles.card}>
              <FormField label="Name" required valid={step1Done}>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Sleeve, Rose, Geometric" placeholderTextColor={COLORS.textMuted} />
              </FormField>
              <View style={styles.fieldDivider} />
              <FormField label="Date Tattooed" required valid={step2Done}>
                <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} keyboardType="numbers-and-punctuation" />
              </FormField>
            </View>
          </View>

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

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ARTIST INFO</Text>
            <View style={styles.card}>
              <FormField label="Artist Name"><TextInput style={styles.input} value={artistName} onChangeText={setArtistName} placeholder="Artist name" placeholderTextColor={COLORS.textMuted} /></FormField>
              <View style={styles.fieldDivider} />
              <FormField label="Instagram"><TextInput style={styles.input} value={artistInstagram} onChangeText={setArtistInstagram} placeholder="@handle" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" /></FormField>
              <View style={styles.fieldDivider} />
              <FormField label="Shop Name"><TextInput style={styles.input} value={shopName} onChangeText={setShopName} placeholder="Shop name" placeholderTextColor={COLORS.textMuted} /></FormField>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PAIN RATING</Text>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>How painful was it? (1 to 10)</Text>
              <View style={styles.dotsRow}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <TouchableOpacity key={n} style={[styles.dot, painRating >= n && styles.dotActive]} onPress={() => setPainRating(n === painRating ? 0 : n)} activeOpacity={0.7}>
                    <Text style={[styles.dotText, painRating >= n && styles.dotTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput style={styles.notesInput} value={notes} onChangeText={setNotes} placeholder="Anything to remember about this session" placeholderTextColor={COLORS.textMuted} multiline numberOfLines={4} textAlignVertical="top" />
          </View>

          <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add Tattoo'}</Text>
          </TouchableOpacity>
        </ScrollView>

        <PickerModal visible={stylePickerVisible} title="Style" options={STYLES} selected={style} onSelect={(v) => { setStyle(v); setStylePickerVisible(false); }} onClose={() => setStylePickerVisible(false)} />
        <PickerModal visible={placementPickerVisible} title="Placement" options={PLACEMENTS} selected={placement} onSelect={(v) => { setPlacement(v); setPlacementPickerVisible(false); }} onClose={() => setPlacementPickerVisible(false)} />
      </KeyboardAvoidingView>
    </TattooBackground>
  );
}

function FieldCheckmark({ valid }) {
  const scale = useRef(new Animated.Value(0)).current;
  const prevValid = useRef(false);
  useEffect(() => {
    if (valid && !prevValid.current) {
      scale.setValue(0);
      Animated.spring(scale, { toValue: 1, tension: 140, friction: 6, useNativeDriver: true }).start();
    } else if (!valid) {
      scale.setValue(0);
    }
    prevValid.current = valid;
  }, [valid]);
  if (!valid) return null;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={styles.fieldCheckmark}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>✓</Text></View>
    </Animated.View>
  );
}

function StepProgress({ steps, completed }) {
  return (
    <View style={styles.stepProgressWrap}>
      {Array.from({ length: steps }, (_, i) => <StepDot key={i} done={i < completed} />)}
    </View>
  );
}

function StepDot({ done }) {
  const scale = useRef(new Animated.Value(done ? 1 : 0.7)).current;
  const prevDone = useRef(done);
  useEffect(() => {
    if (done !== prevDone.current) {
      Animated.spring(scale, { toValue: done ? 1 : 0.7, tension: 120, friction: 7, useNativeDriver: true }).start();
      prevDone.current = done;
    }
  }, [done]);
  return <Animated.View style={[styles.stepDot, done && styles.stepDotDone, { transform: [{ scale }] }]} />;
}

function FormField({ label, required, valid, children }) {
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
        <FieldCheckmark valid={!!valid} />
      </View>
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
            <TouchableOpacity onPress={onClose}><Feather name="x" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
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
  scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 120 },
  stepProgressWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: SPACING.md },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  stepDotDone: { backgroundColor: COLORS.accent, width: 24, borderRadius: 5 },
  fieldCheckmark: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center' },
  photoSection: { alignItems: 'center', paddingVertical: SPACING.lg },
  photoCircle: { width: 128, height: 128, borderRadius: 64, overflow: 'hidden', ...SHADOWS.gold },
  photoCircleImage: { width: '100%', height: '100%' },
  photoCirclePlaceholder: { width: '100%', height: '100%', backgroundColor: 'rgba(42,26,18,0.96)', borderWidth: 2, borderColor: COLORS.accentBorder, borderStyle: 'dashed', borderRadius: 64, alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  photoCircleText: { color: COLORS.accent, fontSize: 11, fontWeight: '800' },
  section: { marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  card: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, ...SHADOWS.card },
  fieldDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.xs },
  fieldLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 },
  input: { color: COLORS.textPrimary, fontSize: 15, paddingVertical: SPACING.sm },
  pickerRow: { flexDirection: 'row', gap: SPACING.sm },
  pickerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, paddingHorizontal: SPACING.md, paddingVertical: SPACING.lg, ...SHADOWS.card },
  pickerButtonText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: SPACING.sm, flexWrap: 'wrap' },
  dot: { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  dotText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900' },
  dotTextActive: { color: COLORS.textInverse },
  notesInput: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, color: COLORS.textPrimary, fontSize: 15, padding: SPACING.md, minHeight: 94 },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  saveButtonText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, paddingBottom: 40, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { ...FONTS.headingMedium },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  modalOptionActive: { backgroundColor: COLORS.accentMuted },
  modalOptionText: { color: COLORS.textSecondary, fontSize: 15 },
  modalOptionTextActive: { color: COLORS.accent, fontWeight: '700' },
  gateContainer: { justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  gateCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accentBorder, gap: SPACING.md, width: '100%' },
  gateIcon: { fontSize: 40 },
  gateTitle: { ...FONTS.headingLarge },
  gateSubtitle: { ...FONTS.body, textAlign: 'center' },
  gateFeatures: { width: '100%', gap: SPACING.sm, marginVertical: SPACING.sm },
  gateFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  gateFeatureText: { color: COLORS.textSecondary, fontSize: 14 },
  gateButtonPrimary: { width: '100%', backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, alignItems: 'center', ...SHADOWS.gold },
  gateButtonPrimaryText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '800' },
  gateButtonSecondary: { width: '100%', borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, paddingVertical: SPACING.md, alignItems: 'center' },
  gateButtonSecondaryText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  gateBack: { color: COLORS.textMuted, fontSize: 13, marginTop: SPACING.sm },
});
