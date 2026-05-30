import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getPhotosForTattoo } from '../database/db';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

export default function PhotoTimelineScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tattoos } = useApp();
  const [selectedTattooId, setSelectedTattooId] = useState(tattoos[0]?.id || null);
  const [photos, setPhotos] = useState([]);
  const selectedTattoo = tattoos.find((t) => t.id === selectedTattooId);

  useEffect(() => {
    async function load() {
      if (!selectedTattooId) { setPhotos([]); return; }
      const result = await getPhotosForTattoo(selectedTattooId);
      setPhotos(result || []);
    }
    load();
  }, [selectedTattooId]);

  const addPhoto = () => {
    if (!selectedTattoo) {
      Alert.alert('Add a tattoo first', 'Photo timelines need a tattoo first.');
      return;
    }
    navigation.navigate('TattooDetail', { tattooId: selectedTattoo.id });
  };

  return (
    <TattooBackground style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl }]} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Photo timeline"
          title="Watch healing over time."
          subtitle="Pick a tattoo, review its photo history, and open the detail page to add more progress shots."
          icon="camera"
          stats={[{ label: 'Photos', value: photos.length }, { label: 'Tattoo', value: selectedTattoo ? 'Set' : 'None' }, { label: 'History', value: photos.length > 1 ? 'Ready' : 'Soon' }]}
        />

        {tattoos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picker} contentContainerStyle={styles.pickerContent}>
            {tattoos.map((tattoo) => (
              <TouchableOpacity key={tattoo.id} style={[styles.chip, selectedTattooId === tattoo.id && styles.chipActive]} onPress={() => setSelectedTattooId(tattoo.id)} activeOpacity={0.8}>
                <Text style={[styles.chipText, selectedTattooId === tattoo.id && styles.chipTextActive]}>{tattoo.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {photos.length > 0 ? (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <View style={styles.photoMeta}>
                  <Text style={styles.photoDay}>Day {photo.day_number || '?'}</Text>
                  <Text style={styles.photoDate}>{photo.taken_date}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No timeline photos yet</Text>
            <Text style={styles.emptyBody}>Open the tattoo detail screen and add progress photos.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addBtn} onPress={addPhoto} activeOpacity={0.85}>
          <Feather name="plus" size={18} color={COLORS.textInverse} />
          <Text style={styles.addText}>Add Timeline Photo</Text>
        </TouchableOpacity>
      </ScrollView>
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg },
  picker: { marginBottom: SPACING.md, marginHorizontal: -SPACING.lg },
  pickerContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  chip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(34,21,16,0.9)', borderWidth: 1, borderColor: COLORS.borderGold },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.textMuted, fontWeight: '800' },
  chipTextActive: { color: COLORS.textInverse },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  photoCard: { width: '48.5%', aspectRatio: 0.82, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderGold, ...SHADOWS.card },
  photo: { width: '100%', height: '100%' },
  photoMeta: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.sm, backgroundColor: 'rgba(0,0,0,0.66)' },
  photoDay: { color: COLORS.accent, fontSize: 12, fontWeight: '900' },
  photoDate: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  emptyCard: { backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.xl, alignItems: 'center', ...SHADOWS.card },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: SPACING.sm },
  emptyBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  addBtn: { marginTop: SPACING.lg, flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.lg, ...SHADOWS.gold },
  addText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '900' },
});
