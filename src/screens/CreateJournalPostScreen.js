/**
 * CreateJournalPostScreen.js  — Issue #15
 *
 * Fixed:
 *  - Saves to socialDb (addPost) so posts appear in SocialFeedScreen
 *  - Style tags picker (tap-to-toggle chips)
 *  - Safe area footer via useSafeAreaInsets
 *  - healing_day auto-stamped
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { getDayNumber } from '../utils/healingStages';
import { addPost, getLocalUser } from '../database/socialDb';
import { createJournalPost } from '../utils/journalPosts';

const VISIBILITY_OPTIONS = [
  { value: 'public',  label: 'Public',  icon: 'globe',  desc: 'Anyone' },
  { value: 'friends', label: 'Friends', icon: 'users',  desc: 'Followers' },
  { value: 'private', label: 'Only Me', icon: 'lock',   desc: 'Just you' },
];

const STYLE_TAGS = [
  { id: 'traditional',  label: 'Traditional',   emoji: '⚓' },
  { id: 'realism',      label: 'Realism',        emoji: '🎨' },
  { id: 'neo_trad',     label: 'Neo-Trad',       emoji: '🌹' },
  { id: 'blackwork',    label: 'Blackwork',      emoji: '⬛' },
  { id: 'watercolor',   label: 'Watercolor',     emoji: '💧' },
  { id: 'minimalist',   label: 'Minimalist',     emoji: '〰️' },
  { id: 'japanese',     label: 'Japanese',       emoji: '🐉' },
  { id: 'tribal',       label: 'Tribal',         emoji: '🔱' },
  { id: 'geometric',    label: 'Geometric',      emoji: '🔷' },
  { id: 'fine_line',    label: 'Fine Line',      emoji: '✏️' },
  { id: 'dotwork',      label: 'Dotwork',        emoji: '⚬' },
  { id: 'portrait',     label: 'Portrait',       emoji: '🧑' },
];

export default function CreateJournalPostScreen({ route, navigation }) {
  const { tattoo } = route.params;
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState('');
  const [artistTag, setArtistTag] = useState(tattoo.artist_name || '');
  const [visibility, setVisibility] = useState('friends');
  const [selectedStyles, setSelectedStyles] = useState([]);
  const [photoUris, setPhotoUris] = useState(
    tattoo.thumbnail_uri ? [tattoo.thumbnail_uri] : []
  );
  const [saving, setSaving] = useState(false);
  const dayNumber = getDayNumber(tattoo.date_tattooed);

  const toggleStyle = (id) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

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
      const me = await getLocalUser();
      const userId = me?.id || `local-${Date.now()}`;

      // Save to SQLite for social feed
      await addPost({
        userId,
        tattooId: tattoo.id,
        caption: caption.trim(),
        photoUris,
        healingDay: dayNumber,
        visibility,
        styleTags: selectedStyles,
        artistTag: artistTag.trim() || null,
      });
      // Also save to AsyncStorage for TattooDetailScreen / PortfolioScreen
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
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
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

        {/* Photos */}
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

        {/* Style tags */}
        <View style={styles.section}>
          <Text style={styles.label}>STYLE TAGS</Text>
          <View style={styles.tagsGrid}>
            {STYLE_TAGS.map((tag) => {
              const active = selectedStyles.includes(tag.id);
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagChip, active && styles.tagChipActive]}
                  onPress={() => toggleStyle(tag.id)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.tagEmoji}>{tag.emoji}</Text>
                  <Text style={[styles.tagLabel, active && styles.tagLabelActive]}>{tag.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
                  <Feather name={opt.icon} size={18} color={active ? COLORS.accent : COLORS.textMuted} />
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

      {/* Safe-area-aware footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
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
  scroll: { paddingTop: 0 },
  dayBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dayBannerText: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl },
  label: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: SPACING.sm,
  },
  photoRow: { gap: SPACING.sm, paddingRight: SPACING.sm },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.borderGold },
  removePhotoBtn: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  addPhotoBtn: {
    width: 90, height: 90, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accentBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
  },
  addPhotoBtnText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  captionInput: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontSize: 15,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    minHeight: 100, lineHeight: 22,
  },
  charCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: SPACING.xs },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.card, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tagChipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  tagEmoji: { fontSize: 12 },
  tagLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  tagLabelActive: { color: COLORS.accent },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
  },
  inputIcon: { marginRight: SPACING.sm },
  inlineInput: { flex: 1, color: COLORS.textPrimary, fontSize: 15, paddingVertical: SPACING.md },
  visibilityRow: { flexDirection: 'row', gap: SPACING.sm },
  visibilityOption: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, alignItems: 'center', gap: SPACING.xs,
  },
  visibilityOptionActive: { borderColor: COLORS.accentBorder, backgroundColor: COLORS.accentMuted, ...SHADOWS.gold },
  visibilityLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  visibilityLabelActive: { color: COLORS.accent },
  visibilityDesc: { color: COLORS.textMuted, fontSize: 10, textAlign: 'center', lineHeight: 13 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    ...SHADOWS.gold,
  },
  saveBtnText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
});
