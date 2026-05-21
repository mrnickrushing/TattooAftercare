import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed } from '../utils/healingStages';
import { getPhotosForTattoo } from '../database/db';
import ShareableCard from '../components/ShareableCard';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - SPACING.lg * 2 - SPACING.sm) / 2;

export default function PortfolioScreen({ navigation }) {
  const { tattoos, refreshTattoos } = useApp();
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [sharingTattoo, setSharingTattoo] = useState(null);
  const [sharePhoto, setSharePhoto] = useState(null);
  const shareCardRef = useRef(null);

  useFocusEffect(useCallback(() => { refreshTattoos(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTattoos();
    setRefreshing(false);
  }, []);

  const healed = tattoos.filter((t) => isHealed(t.date_tattooed));
  const styles_set = [...new Set(healed.map((t) => t.style).filter(Boolean))];
  const filters = ['All', ...styles_set];
  const filtered = filter === 'All' ? healed : healed.filter((t) => t.style === filter);

  const totalArtists = new Set(healed.map((t) => t.artist_name).filter(Boolean)).size;
  const totalStyles = new Set(healed.map((t) => t.style).filter(Boolean)).size;

  const handleLongPress = async (tattoo) => {
    try {
      const photos = await getPhotosForTattoo(tattoo.id);
      const finalPhoto = photos.length > 0 ? photos[photos.length - 1].uri : tattoo.thumbnail_uri;
      setSharingTattoo(tattoo);
      setSharePhoto(finalPhoto);
      setTimeout(async () => {
        try {
          const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
          await Sharing.shareAsync(uri);
        } catch (e) {
          Alert.alert('Could not share', e.message);
        } finally {
          setSharingTattoo(null);
          setSharePhoto(null);
        }
      }, 400);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Portfolio</Text>
          <Text style={styles.headerSub}>Your completed tattoo collection.</Text>
        </View>

        {healed.length > 0 && (
          <View style={styles.statsRow}>
            <StatPill label="Tattoos" value={healed.length} />
            <View style={styles.statsDivider} />
            <StatPill label="Artists" value={totalArtists || '—'} />
            <View style={styles.statsDivider} />
            <StatPill label="Styles" value={totalStyles || '—'} />
          </View>
        )}

        {filters.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)} activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {healed.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyTitle}>Portfolio is empty</Text>
            <Text style={styles.emptySubtitle}>
              Your healed tattoos will appear here.{'\n'}Complete your healing journey to build your collection.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>No tattoos in this style.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((tattoo) => (
              <GridCell
                key={tattoo.id} tattoo={tattoo}
                onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                onLongPress={() => handleLongPress(tattoo)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {sharingTattoo && (
        <View style={styles.offScreen}>
          <ShareableCard ref={shareCardRef} tattoo={sharingTattoo} finalPhotoUri={sharePhoto} />
        </View>
      )}
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function GridCell({ tattoo, onPress, onLongPress }) {
  return (
    <TouchableOpacity
      style={styles.cell} onPress={onPress} onLongPress={onLongPress}
      activeOpacity={0.85} delayLongPress={400}
    >
      {tattoo.thumbnail_uri ? (
        <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.cellImage} />
      ) : (
        <View style={styles.cellPlaceholder}>
          <Text style={styles.cellInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
      )}
      <View style={styles.cellOverlay}>
        <Text style={styles.cellName} numberOfLines={1}>{tattoo.name}</Text>
        {tattoo.artist_name && (
          <Text style={styles.cellArtist} numberOfLines={1}>by {tattoo.artist_name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerTitle: { ...FONTS.displayMedium, marginBottom: 4 },
  headerSub: { ...FONTS.body },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  statsDivider: { width: 1, height: 30, backgroundColor: COLORS.border },
  statPill: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 },
  filterBar: { marginBottom: SPACING.lg },
  filterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  filterChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  cell: { width: CELL_SIZE, height: CELL_SIZE * 1.2, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: COLORS.card, ...SHADOWS.card },
  cellImage: { width: '100%', height: '100%' },
  cellPlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  cellInitial: { color: COLORS.accent, fontSize: 36, fontWeight: '700' },
  cellOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', padding: SPACING.sm },
  cellName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  cellArtist: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xxl, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...FONTS.headingLarge, textAlign: 'center' },
  emptySubtitle: { ...FONTS.body, textAlign: 'center' },
  offScreen: { position: 'absolute', top: -9999, left: -9999 },
});
