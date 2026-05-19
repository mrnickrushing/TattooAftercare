import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { deleteTattoo } from '../database/db';
import { getStage, getStageInfo, isHealed, getDayNumber } from '../utils/healingStages';

const FILTERS = ['All', 'Healing', 'Healed'];

export default function MyTattoosScreen({ navigation }) {
  const { tattoos, refreshTattoos } = useApp();
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { refreshTattoos(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTattoos();
    setRefreshing(false);
  }, []);

  const handleDelete = (tattoo) => {
    Alert.alert(
      'Delete Tattoo',
      `Remove "${tattoo.name}" and all its care logs and photos? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteTattoo(tattoo.id);
            await refreshTattoos();
          },
        },
      ]
    );
  };

  const filtered = tattoos.filter((t) => {
    if (filter === 'Healing') return !isHealed(t.date_tattooed);
    if (filter === 'Healed') return isHealed(t.date_tattooed);
    return true;
  });

  const healing = filtered.filter((t) => !isHealed(t.date_tattooed));
  const healed = filtered.filter((t) => isHealed(t.date_tattooed));

  return (
    <View style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {tattoos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖊️</Text>
            <Text style={styles.emptyTitle}>No tattoos yet</Text>
            <Text style={styles.emptySubtitle}>Add your first tattoo to start tracking your healing journey.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddTattoo')}>
              <Text style={styles.emptyButtonText}>Add Tattoo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(filter === 'All' || filter === 'Healing') && healing.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>HEALING ({healing.length})</Text>
                {healing.map((tattoo) => (
                  <TattooRow key={tattoo.id} tattoo={tattoo}
                    onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                    onDelete={() => handleDelete(tattoo)} />
                ))}
              </View>
            )}
            {(filter === 'All' || filter === 'Healed') && healed.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>HEALED ({healed.length})</Text>
                {healed.map((tattoo) => (
                  <TattooRow key={tattoo.id} tattoo={tattoo} healed
                    onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                    onDelete={() => handleDelete(tattoo)} />
                ))}
              </View>
            )}
            {filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptySubtitle}>No tattoos in this category.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TattooRow({ tattoo, onPress, onDelete, healed: isHealedProp }) {
  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const day = getDayNumber(tattoo.date_tattooed);
  let dateStr = '';
  try { dateStr = format(parseISO(tattoo.date_tattooed), 'MMM d, yyyy'); } catch { dateStr = tattoo.date_tattooed; }

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.thumb}>
        {tattoo.thumbnail_uri ? (
          <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{tattoo.name}</Text>
          {isHealedProp ? (
            <View style={styles.healedBadge}>
              <Text style={styles.healedBadgeText}>HEALED</Text>
            </View>
          ) : (
            <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color + '55' }]}>
              <Text style={[styles.stageBadgeText, { color: stageInfo.color }]}>{stageInfo.name.toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {tattoo.placement ? `${tattoo.placement}  ·  ` : ''}
          {tattoo.artist_name ? `by ${tattoo.artist_name}` : dateStr}
        </Text>
        <View style={styles.rowBottom}>
          {tattoo.style && (
            <View style={styles.styleChip}>
              <Text style={styles.styleChipText}>{tattoo.style}</Text>
            </View>
          )}
          {!isHealedProp && <Text style={styles.dayText}>Day {day}</Text>}
          {isHealedProp && <Text style={styles.dateText}>{dateStr}</Text>}
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="trash-2" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  filterBar: { marginBottom: SPACING.lg },
  filterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  filterChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.accent },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md, ...SHADOWS.card,
  },
  thumb: { width: 60, height: 60, borderRadius: RADIUS.md, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%', height: '100%', backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.accentBorder,
  },
  thumbInitial: { color: COLORS.accent, fontSize: 22, fontWeight: '700' },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  rowName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  stageBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  stageBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  healedBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: RADIUS.full, backgroundColor: COLORS.successMuted, borderWidth: 1, borderColor: COLORS.success + '44' },
  healedBadgeText: { color: COLORS.success, fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  rowMeta: { color: COLORS.textMuted, fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  styleChip: { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.borderLight },
  styleChipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  dayText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  dateText: { color: COLORS.textMuted, fontSize: 11 },
  deleteBtn: { padding: SPACING.sm },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xxl, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...FONTS.headingLarge, textAlign: 'center' },
  emptySubtitle: { ...FONTS.body, textAlign: 'center' },
  emptyButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.sm, ...SHADOWS.gold },
  emptyButtonText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '700' },
});
