import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { getDayNumber } from '../utils/healingStages';
import { createJournalPost } from '../utils/journalPosts';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: 'globe', desc: 'Anyone can see this' },
  { value: 'friends', label: 'Friends', icon: 'users', desc: 'Only your followers' },
  { value: 'private', label: 'Only Me', icon: 'lock', desc: 'Just you' },
];

export default function CreateJournalPostScreen({ route, navigation }) {
  const { tattoo } = route.params;

  const [caption, setCaption] = useState('');
  const [artistTag, setArtistTag] = useState(tattoo.artist_name || '');
  const [visibility, setVisibility] = useState('friends');
  const [photoUris, setPhotoUris] = useState(
    tattoo.thumbnail_uri ? [tattoo.thumbnail_uri] : []
  );
  const [saving, setSaving] = useState(false);
  const dayNumber = getDayNumber(tattoo.date_tattooed);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 4,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setPhotoUris((prev) => [...new Set([...prev, ...uris])].slice(0, 4));
    }
  };

  const handleRemovePhoto = (uri) => {
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleSave = async () => {
    if (photoUris.length === 0 && !caption.trim()) {
      Alert.alert('Add something', 'Include a photo or caption before posting.');
      return;
    }
    setSaving(true);
    try {
      await createJournalPost({
        tattoo_id: tattoo.id,
        caption: caption.trim(),
        photo_uris: photoUris,
        day_number: dayNumber,
        visibility,
        artist_tag: artistTag.trim() || null,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save post. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Day stamp header */}
        <View style={styles.dayBanner}>
          <Feather name="activity" size={14} color={COLORS.accent} />
          <Text style={styles.dayBannerText}>
            {tattoo.name} — Day {dayNumber}
          </Text>
        </View>

        {/* Photos section */}
        <View style={styles.section}>
          <Text style={styles.label}>PHOTOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photoUris.map((uri) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => handleRemovePhoto(uri)}
                >
                  <Feather name="x" size={10} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            ))}
            {photoUris.length < 4 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickPhoto} activeOpacity={0.75}>
                <Feather name="plus" size={22} color={COLORS.accent} />
                <Text style={styles.addPhotoBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Caption */}
        <View style={styles.section}>
          <Text style={styles.label}>CAPTION</Text>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="How's the healing going? Share the story..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{caption.length}/500</Text>
        </View>

        {/* Artist tag */}
        <View style={styles.section}>
          <Text style={styles.label}>ARTIST TAG</Text>
          <View style={styles.inputRow}>
            <Feather name="user" size={15} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inlineInput}
              value={artistTag}
              onChangeText={setArtistTag}
              placeholder="Artist name or @instagram"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={styles.label}>WHO CAN SEE THIS</Text>
          <View style={styles.visibilityRow}>
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = visibility === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.visibilityOption, active && styles.visibilityOptionActive]}
                  onPress={() => setVisibility(opt.value)}
                  activeOpacity={0.75}
                >
                  <Feather
                    name={opt.icon}
                    size={18}
                    color={active ? COLORS.accent : COLORS.textMuted}
                  />
                  <Text style={[styles.visibilityLabel, active && styles.visibilityLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.visibilityDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.textInverse} />
          ) : (
            <>
              <Feather name="send" size={16} color={COLORS.textInverse} />
              <Text style={styles.saveBtnText}>Post to Journal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  dayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dayBannerText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  photoRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.sm,
  },
  photoThumbWrap: {
    position: 'relative',
  },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  addPhotoBtnText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  captionInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 100,
    lineHeight: 22,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: { marginRight: SPACING.sm },
  inlineInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingVertical: SPACING.md,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  visibilityOption: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  visibilityOptionActive: {
    borderColor: COLORS.accentBorder,
    backgroundColor: COLORS.accentMuted,
    ...SHADOWS.gold,
  },
  visibilityLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  visibilityLabelActive: {
    color: COLORS.accent,
  },
  visibilityDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xxl : SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    ...SHADOWS.gold,
  },
  saveBtnText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
