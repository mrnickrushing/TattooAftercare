import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  Image, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getPhotosForTattoo } from '../database/db';
import ShareableCard from '../components/ShareableCard';

const STYLES = ['All', 'Traditional', 'Neo-Traditional', 'Realism', 'Watercolor', 'Blackwork', 'Geometric', 'Tribal', 'Japanese', 'New School', 'Fine Line', 'Other'];

export default function PortfolioScreen({ navigation }) {
  const { healedTattoos, tattoos, refreshTattoos } = useApp();
  const [filter, setFilter] = useState('All');
  const [shareTarget, setShareTarget] = useState(null);
  const [sharePhoto, setSharePhoto] = useState(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef(null);

  useFocusEffect(useCallback(() => { refreshTattoos(); }, [refreshTattoos]));

  const filtered = filter === 'All'
    ? healedTattoos
    : healedTattoos.filter((t) => t.style === filter);

  const totalArtists = new Set(tattoos.filter((t) => t.artist_name).map((t) => t.artist_name)).size;
  const years = tattoos.length > 0
    ? new Set(tattoos.map((t) => t.date_tattooed?.substring(0, 4))).size
    : 0;

  async function handleShare(tattoo) {
    try {
      setSharing(true);
      const photos = await getPhotosForTattoo(tattoo.id);
      const latest = photos.length > 0 ? photos[photos.length - 1] : null;
      setSharePhoto(latest);
      setShareTarget(tattoo);
    } catch (e) {
      Alert.alert('Error', 'Could not load photo for sharing.');
      setSharing(false);
    }
  }

  async function doShare() {
    try {
      if (!cardRef.current) return;
      const uri = await cardRef.current.capture();
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch (e) {
      Alert.alert('Error', 'Could not generate shareable card.');
    } finally {
      setShareTarget(null);
      setSharePhoto(null);
      setSharing(false);
    }
  }

  function renderTattoo({ item }) {
    const dateStr = item.date_tattooed
      ? format(parseISO(item.date_tattooed), 'MMM yyyy')
      : '';

    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => navigation.navigate('TattooDetail', { tattooId: item.id })}
        onLongPress={() => handleShare(item)}
        activeOpacity={0.85}
      >
        {item.thumbnail_uri ? (
          <Image source={{ uri: item.thumbnail_uri }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.gridPlaceholder]}>
            <Feather name="image" size={24} color={COLORS.textMuted} />
          </View>
        )}
        <View style={styles.gridMeta}>
          <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
          {item.artist_name ? (
            <Text style={styles.gridArtist} numberOfLines={1}>{item.artist_name}</Text>
          ) : null}
          {dateStr ? <Text style={styles.gridDate}>{dateStr}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  }

  const activeStyles = STYLES.filter(
    (s) => s === 'All' || healedTattoos.some((t) => t.style === s)
  );

  return (
    <View style={commonStyles.container}>
      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{tattoos.length}</Text>
          <Text style={styles.statLabel}>Tattoos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{healedTattoos.length}</Text>
          <Text style={styles.statLabel}>Healed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{totalArtists}</Text>
          <Text style={styles.statLabel}>Artists</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{years}</Text>
          <Text style={styles.statLabel}>Years</Text>
        </View>
      </View>

      {/* Filter row */}
      {activeStyles.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {activeStyles.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filter === s && styles.filterChipActive]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {healedTattoos.length === 0 ? (
        <View style={commonStyles.emptyState}>
          <Feather name="image" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>Portfolio Empty</Text>
          <Text style={commonStyles.emptyStateText}>
            Healed tattoos will appear here.{'\n'}Keep logging your care routine to heal your first one!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTattoo}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.filterEmpty}>
              <Text style={styles.filterEmptyText}>No {filter} tattoos in portfolio yet.</Text>
            </View>
          }
        />
      )}

      {/* Off-screen share card */}
      {shareTarget && (
        <View style={styles.offscreen}>
          <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }} onCapture={doShare}>
            <ShareableCard tattoo={shareTarget} finalPhoto={sharePhoto} />
          </ViewShot>
        </View>
      )}

      {sharing && !shareTarget && (
        <View style={styles.sharingOverlay}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.sharingText}>Preparing card...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  filterChip: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent + '22',
    borderColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  filterChipTextActive: {
    color: COLORS.accent,
  },
  grid: {
    padding: SPACING.sm,
    paddingBottom: SPACING.xxl,
  },
  row: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  gridItem: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
  },
  gridPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMeta: {
    padding: SPACING.sm,
    gap: 2,
  },
  gridName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
  },
  gridArtist: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.xs,
  },
  gridDate: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    marginTop: SPACING.md,
  },
  filterEmpty: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  filterEmptyText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  sharingOverlay: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sharingText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
});
