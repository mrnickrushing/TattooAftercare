import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { addTattoo } from '../database/db';
import { scheduleMorningReminder, scheduleEveningReminder } from '../utils/notifications';
import { isHealed } from '../utils/healingStages';

const STYLES = ['Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Blackwork', 'Geometric', 'Tribal', 'Japanese', 'New School', 'Fine Line', 'Other'];
const PLACEMENTS = ['Arm', 'Forearm', 'Upper Arm', 'Sleeve', 'Shoulder', 'Back', 'Chest', 'Ribs', 'Stomach', 'Hip', 'Thigh', 'Calf', 'Ankle', 'Foot', 'Hand', 'Finger', 'Neck', 'Behind Ear', 'Head', 'Other'];

export default function AddTattooScreen({ navigation }) {
  const { tattoos, proStatus, refreshTattoos } = useApp();
  const [saving, setSaving] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showPlacementPicker, setShowPlacementPicker] = useState(false);

  const [name, setName] = useState('');
  const [placement, setPlacement] = useState('');
  const [dateTattooed, setDateTattooed] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [artistName, setArtistName] = useState('');
  const [artistInstagram, setArtistInstagram] = useState('');
  const [shopName, setShopName] = useState('');
  const [style, setStyle] = useState('');
  const [painRating, setPainRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [thumbnailUri, setThumbnailUri] = useState(null);

  const activeTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const needsPro = activeTattoos.length >= 1 && !proStatus;

  if (needsPro) {
    return (
      <View style={[commonStyles.container, styles.proGate]}>
        <Text style={styles.proIcon}>⚡</Text>
        <Text style={styles.proTitle}>Pro Required</Text>
        <Text style={styles.proSubtitle}>
          Free accounts can track 1 active tattoo at a time.{'\n'}
          Upgrade to Pro to add unlimited tattoos.
        </Text>
        <View style={styles.proFeatures}>
          {['Unlimited tattoos', 'Photo timeline per tattoo', 'Shareable portfolio cards', 'Custom reminder schedules'].map((f) => (
            <View key={f} style={styles.proFeatureRow}>
              <Feather name="check" size={14} color={COLORS.accent} />
              <Text style={styles.proFeatureText}>{f}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={[commonStyles.button, { width: '100%' }]}>
          <Text style={commonStyles.buttonText}>Upgrade to Pro — $3.99</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[commonStyles.buttonOutline, { width: '100%', marginTop: SPACING.sm }]}>
          <Text style={commonStyles.buttonOutlineText}>$1.99 / month</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: SPACING.lg }}>
          <Text style={styles.cancelText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to add a thumbnail.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setThumbnailUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a name for your tattoo.');
      return;
    }
    if (!dateTattooed.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Enter date as YYYY-MM-DD (e.g. 2024-03-15).');
      return;
    }

    setSaving(true);
    try {
      await addTattoo({
        name: name.trim(),
        placement: placement.trim() || null,
        date_tattooed: dateTattooed,
        artist_name: artistName.trim() || null,
        artist_instagram: artistInstagram.trim().replace('@', '') || null,
        shop_name: shopName.trim() || null,
        style: style || null,
        pain_rating: painRating || null,
        notes: notes.trim() || null,
        thumbnail_uri: thumbnailUri,
      });

      const isFirstTattoo = tattoos.length === 0;
      if (isFirstTattoo) {
        await scheduleMorningReminder();
        await scheduleEveningReminder();
      }

      await refreshTattoos();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save tattoo. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail */}
        <TouchableOpacity style={styles.thumbnailPicker} onPress={pickImage}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Feather name="camera" size={28} color={COLORS.textMuted} />
              <Text style={styles.thumbnailLabel}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Name */}
        <Text style={commonStyles.label}>Tattoo Name *</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="e.g. Dragon Sleeve, Mom Rose..."
          placeholderTextColor={COLORS.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Placement */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Placement</Text>
        <TouchableOpacity
          style={[commonStyles.input, styles.pickerRow]}
          onPress={() => setShowPlacementPicker(true)}
        >
          <Text style={placement ? styles.pickerValue : styles.pickerPlaceholder}>
            {placement || 'Select placement...'}
          </Text>
          <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Date */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Date Tattooed *</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={COLORS.textMuted}
          value={dateTattooed}
          onChangeText={setDateTattooed}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        {/* Style */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Style</Text>
        <TouchableOpacity
          style={[commonStyles.input, styles.pickerRow]}
          onPress={() => setShowStylePicker(true)}
        >
          <Text style={style ? styles.pickerValue : styles.pickerPlaceholder}>
            {style || 'Select style...'}
          </Text>
          <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Artist */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Artist Name</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="Artist's name"
          placeholderTextColor={COLORS.textMuted}
          value={artistName}
          onChangeText={setArtistName}
        />

        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Artist Instagram</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="@handle"
          placeholderTextColor={COLORS.textMuted}
          value={artistInstagram}
          onChangeText={setArtistInstagram}
          autoCapitalize="none"
        />

        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Shop Name</Text>
        <TextInput
          style={commonStyles.input}
          placeholder="Studio or shop name"
          placeholderTextColor={COLORS.textMuted}
          value={shopName}
          onChangeText={setShopName}
        />

        {/* Pain Rating */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Pain Rating</Text>
        <View style={styles.painRow}>
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.painDot, painRating >= n && styles.painDotActive]}
              onPress={() => setPainRating(n === painRating ? 0 : n)}
            >
              <Text style={[styles.painNum, painRating >= n && styles.painNumActive]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {painRating > 0 && (
          <Text style={styles.painLabel}>
            {painRating <= 3 ? 'Low — barely felt it' : painRating <= 6 ? 'Moderate — manageable' : painRating <= 8 ? 'High — intense' : 'Extreme — brutal placement'}
          </Text>
        )}

        {/* Notes */}
        <Text style={[commonStyles.label, { marginTop: SPACING.md }]}>Notes</Text>
        <TextInput
          style={[commonStyles.input, styles.notesInput]}
          placeholder="Session notes, aftercare instructions from artist, etc."
          placeholderTextColor={COLORS.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[commonStyles.button, { marginTop: SPACING.xl }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={commonStyles.buttonText}>Save Tattoo</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Style Picker Modal */}
      <Modal visible={showStylePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Style</Text>
              <TouchableOpacity onPress={() => setShowStylePicker(false)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {STYLES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.modalOption, s === style && styles.modalOptionActive]}
                  onPress={() => { setStyle(s); setShowStylePicker(false); }}
                >
                  <Text style={[styles.modalOptionText, s === style && styles.modalOptionTextActive]}>{s}</Text>
                  {s === style && <Feather name="check" size={16} color={COLORS.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Placement Picker Modal */}
      <Modal visible={showPlacementPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Placement</Text>
              <TouchableOpacity onPress={() => setShowPlacementPicker(false)}>
                <Feather name="x" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {PLACEMENTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.modalOption, p === placement && styles.modalOptionActive]}
                  onPress={() => { setPlacement(p); setShowPlacementPicker(false); }}
                >
                  <Text style={[styles.modalOptionText, p === placement && styles.modalOptionTextActive]}>{p}</Text>
                  {p === placement && <Feather name="check" size={16} color={COLORS.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
  },
  thumbnailPicker: {
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  thumbnailImage: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
  },
  thumbnailPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  thumbnailLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  pickerPlaceholder: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.md,
  },
  painRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  painDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  painDotActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  painNum: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  painNumActive: {
    color: '#000',
  },
  painLabel: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  notesInput: {
    height: 100,
    paddingTop: SPACING.md,
  },
  proGate: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  proIcon: {
    fontSize: 48,
  },
  proTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
  },
  proSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  proFeatures: {
    alignSelf: 'stretch',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  proFeatureText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionActive: {
    backgroundColor: COLORS.accent + '15',
  },
  modalOptionText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  modalOptionTextActive: {
    color: COLORS.accent,
    fontWeight: FONTS.weights.semibold,
  },
});
