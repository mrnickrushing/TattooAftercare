import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { deleteTattoo } from '../database/db';
import { getStage, getStageInfo, isHealed, getDayNumber } from '../utils/healingStages';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const FILTERS = ['All', 'Healing', 'Healed'];

export default function MyTattoosScreen({ navigation }) {
  const { tattoos, refreshTattoos } = useApp();
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

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

  const healingAll = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const healedAll = tattoos.filter((t) => isHealed(t.date_tattooed));
  const healing = filtered.filter((t) => !isHealed(t.date_tattooed));
  const healed = filtered.filter((t) => isHealed(t.date_tattooed));
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl;

  return (
    <TattooBackground style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg, paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHero
          eyebrow="Your collection"
          title="Every piece, every stage, tracked cleanly."
          subtitle="Watch healing progress, keep care history close, and build a gallery that feels worth opening."
          icon="layers"
          stats={[
            { label: 'Total', value: tattoos.length },
            { label: 'Healing', value: healingAll.length },
            { label: 'Healed', value: healedAll.length },
          ]}
        />

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
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>✒️</Text>
            </View>
            <Text style={styles.emptyTitle}>No tattoos yet</Text>
            <Text style={styles.emptySubtitle}>Add your first piece and the app will build a care plan around it.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddTattoo')}>
              <Text style={styles.emptyButtonText}>Add Tattoo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {(filter === 'All' || filter === 'Healing') && healing.length > 0 && (
              <View style={styles.section}>
                <SectionLabel title="Healing now" count={healing.length} />
                {healing.map((tattoo) => (
                  <TattooRow key={tattoo.id} tattoo={tattoo}
                    onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                    onDelete={() => handleDelete(tattoo)} />
                ))}
              </View>
            )}
            {(filter === 'All' || filter === 'Healed') && healed.length > 0 && (
              <View style={styles.section}>
                <SectionLabel title="Healed gallery" count={healed.length} />
                {healed.map((tattoo) => (
                  <TattooRow key={tattoo.id} tattoo={tattoo} healed
                    onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                    onDelete={() => handleDelete(tattoo)} />
                ))}
              </View>
            )}
            {filtered.length === 0 && (
              <View style={styles.emptyStateCompact}>
                <Text style={styles.emptySubtitle}>No tattoos in this category.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </TattooBackground>
  );
}

function SectionLabel({ title, count }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionRule} />
      <View style={styles.countBadge}><Text style={styles.countBadgeText}>{count}</Text></View>
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
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.82}>
      <View style={styles.cornerTop} />
      <View style={styles.thumbWrap}>
        {tattoo.thumbnail_uri ? (
          <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text>
          </View>
        )}
        {!isHealedProp && <View style={[styles.stageDot, { backgroundColor: stageInfo.color }]} />}
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{tattoo.name}</Text>
          {isHealedProp ? (
            <View style={styles.healedBadge}>
              <Text style={styles.healedBadgeText}>HEALED</Text>
            </View>
          ) : (
            <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color + '66' }]}>
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
          {!isHealedProp ? <Text style={styles.dayText}>Day {day}</Text> : <Text style={styles.dateText}>{dateStr}</Text>}
        </View>
      </View>

      <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="trash-2" size={15} color={COLORS.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: SPACING.lg },
  filterBar: { marginBottom: SPACING.lg, marginHorizontal: -SPACING.lg },
  filterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: 'rgba(34,21,16,0.9)', borderWidth: 1, borderColor: COLORS.borderGold,
  },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, ...SHADOWS.gold },
  filterChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  filterChipTextActive: { color: COLORS.textInverse },
  section: { marginBottom: SPACING.xl },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  sectionLabel: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  sectionRule: { flex: 1, height: 1, backgroundColor: COLORS.borderGold },
  countBadge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder, alignItems: 'center', justifyContent: 'center' },
  countBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '900' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(42,26,18,0.96)',
    borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.borderGold, gap: SPACING.md, ...SHADOWS.card,
    overflow: 'hidden',
  },
  cornerTop: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderTopWidth: 1, borderRightWidth: 1, borderColor: COLORS.accentBorder },
  thumbWrap: { width: 74, height: 86, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.accentBorder, backgroundColor: COLORS.surface },
  thumbImage: { width: '100%', height: '100%' },
  thumbPlaceholder: {
    width: '100%', height: '100%', backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbInitial: { color: COLORS.accent, fontSize: 28, fontWeight: '900' },
  stageDot: { position: 'absolute', right: 7, bottom: 7, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.background },
  rowContent: { flex: 1, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  rowName: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '900', flex: 1 },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  stageBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  healedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, backgroundColor: COLORS.successMuted, borderWidth: 1, borderColor: COLORS.success + '55' },
  healedBadgeText: { color: COLORS.success, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  rowMeta: { color: COLORS.textSecondary, fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  styleChip: { backgroundColor: COLORS.surface, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.borderLight },
  styleChipText: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700' },
  dayText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  dateText: { color: COLORS.textMuted, fontSize: 11 },
  deleteBtn: { padding: SPACING.sm },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xl, gap: SPACING.md, backgroundColor: 'rgba(34,21,16,0.72)', borderWidth: 1, borderColor: COLORS.borderGold, borderRadius: RADIUS.xl },
  emptyStateCompact: { alignItems: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  emptyIconWrap: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { ...FONTS.headingLarge, textAlign: 'center' },
  emptySubtitle: { ...FONTS.body, textAlign: 'center' },
  emptyButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, marginTop: SPACING.sm, ...SHADOWS.gold },
  emptyButtonText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '800' },
});
