/**
 * HealingTimelineScreen
 * Full visual story of every tattoo — photo strip, 28-day care heatmap,
 * milestone badges, and a connecting timeline line.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Image, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { format, parseISO, subDays } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { getCareLogsForTattoo, getPhotosForTattoo } from '../database/db';
import { getAllMilestonesForTattoo } from '../database/socialDb';
import { getStage, getStageInfo, isHealed, getDayNumber } from '../utils/healingStages';
import { getMilestoneMeta } from '../utils/milestones';

const { width } = Dimensions.get('window');
const HEATMAP_DAYS = 28;
const HEATMAP_COLS = 7;
const HEATMAP_ROWS = HEATMAP_DAYS / HEATMAP_COLS; // 4
const CELL = Math.floor((width - SPACING.lg * 2 - 32 - SPACING.md * 2 - (HEATMAP_COLS - 1) * 3) / HEATMAP_COLS);

function buildHeatmapGrid(logs) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const map = {};
  for (const l of logs) map[l.log_date] = l.health_status || 'good';

  // 28 cells: index 0 = 27 days ago, index 27 = today
  return Array.from({ length: HEATMAP_DAYS }, (_, i) => {
    const date = format(subDays(new Date(), HEATMAP_DAYS - 1 - i), 'yyyy-MM-dd');
    const status = map[date];
    return { date, status };
  });
}

function healthColor(status) {
  if (status === 'doctor') return COLORS.danger;
  if (status === 'attention') return COLORS.warning;
  if (status === 'good') return COLORS.success;
  return COLORS.surface;
}

function CareHeatmap({ logs }) {
  const cells = buildHeatmapGrid(logs);
  const weekLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={heatStyles.wrap}>
      <View style={heatStyles.weekRow}>
        {weekLabels.map((d, i) => (
          <Text key={i} style={heatStyles.weekLabel}>{d}</Text>
        ))}
      </View>
      <View style={heatStyles.grid}>
        {cells.map((cell, i) => (
          <View
            key={cell.date}
            style={[
              heatStyles.cell,
              { backgroundColor: healthColor(cell.status) },
              cell.status && heatStyles.cellActive,
            ]}
          />
        ))}
      </View>
      <View style={heatStyles.legend}>
        {[
          { label: 'Good', color: COLORS.success },
          { label: 'Attention', color: COLORS.warning },
          { label: 'Doctor', color: COLORS.danger },
          { label: 'None', color: COLORS.surface },
        ].map((item) => (
          <View key={item.label} style={heatStyles.legendItem}>
            <View style={[heatStyles.legendDot, { backgroundColor: item.color }]} />
            <Text style={heatStyles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MilestoneBadges({ milestones }) {
  if (!milestones.length) return null;
  return (
    <View style={msStyles.row}>
      {milestones.map((ms) => {
        const meta = getMilestoneMeta(ms.milestone_type);
        if (!meta) return null;
        return (
          <View key={ms.id} style={[msStyles.badge, { borderColor: meta.color + '55', backgroundColor: meta.color + '18' }]}>
            <Text style={msStyles.badgeEmoji}>{meta.emoji}</Text>
            <Text style={[msStyles.badgeLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function PhotoStrip({ photos, onPress }) {
  if (!photos.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={photoStyles.strip}>
      {photos.map((p) => (
        <TouchableOpacity key={p.id} style={photoStyles.thumbWrap} activeOpacity={0.85} onPress={() => onPress?.(p)}>
          <Image source={{ uri: p.uri }} style={photoStyles.thumb} resizeMode="cover" />
          <Text style={photoStyles.dayLabel}>Day {p.day_number}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TattooTimelineCard({ data, index, isLast, navigation }) {
  const { tattoo, logs, photos, milestones } = data;
  const healed = isHealed(tattoo.date_tattooed);
  const stage = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stage);
  const day = getDayNumber(tattoo.date_tattooed);

  let dateStr = tattoo.date_tattooed;
  try { dateStr = format(parseISO(tattoo.date_tattooed), 'MMM d, yyyy'); } catch {}

  const totalLogged = logs.filter((l) => l.washed === 1 || l.moisturized === 1).length;
  const washDays = logs.filter((l) => l.washed === 1).length;

  return (
    <View style={cardStyles.row}>
      {/* Timeline spine */}
      <View style={cardStyles.spine}>
        <View style={[cardStyles.dot, { backgroundColor: healed ? COLORS.info : stageInfo.color, shadowColor: healed ? COLORS.info : stageInfo.color }]} />
        {!isLast && <View style={cardStyles.line} />}
      </View>

      {/* Card */}
      <View style={cardStyles.card}>
        {/* Thumbnail banner */}
        {tattoo.thumbnail_uri ? (
          <Image source={{ uri: tattoo.thumbnail_uri }} style={cardStyles.banner} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[stageInfo.color + '44', stageInfo.color + '11']}
            style={[cardStyles.banner, cardStyles.bannerPlaceholder]}
          >
            <Text style={cardStyles.bannerInitial}>{(tattoo.name || '?')[0].toUpperCase()}</Text>
          </LinearGradient>
        )}

        {/* Stage badge overlay */}
        <View style={[cardStyles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color + '55' }]}>
          <Text style={[cardStyles.stageBadgeText, { color: stageInfo.color }]}>
            {healed ? 'HEALED' : stageInfo.name.toUpperCase()}
          </Text>
        </View>

        <View style={cardStyles.body}>
          {/* Header */}
          <TouchableOpacity
            onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
            activeOpacity={0.8}
            style={cardStyles.headerRow}
            accessibilityRole="button"
            accessibilityLabel={`View ${tattoo.name} detail`}
          >
            <View style={{ flex: 1 }}>
              <Text style={cardStyles.name}>{tattoo.name}</Text>
              {tattoo.artist_name && (
                <Text style={cardStyles.artist}>by {tattoo.artist_name}</Text>
              )}
            </View>
            <Feather name="chevron-right" size={16} color={COLORS.accent} />
          </TouchableOpacity>

          {/* Meta row */}
          <View style={cardStyles.metaRow}>
            <View style={cardStyles.metaChip}>
              <Feather name="calendar" size={10} color={COLORS.textMuted} />
              <Text style={cardStyles.metaText}>{dateStr}</Text>
            </View>
            <View style={cardStyles.metaChip}>
              <Feather name="clock" size={10} color={COLORS.textMuted} />
              <Text style={cardStyles.metaText}>Day {day}</Text>
            </View>
            <View style={cardStyles.metaChip}>
              <Feather name="check-circle" size={10} color={COLORS.textMuted} />
              <Text style={cardStyles.metaText}>{totalLogged} logs</Text>
            </View>
          </View>

          {/* Milestones */}
          <MilestoneBadges milestones={milestones} />

          {/* Photo strip */}
          {photos.length > 0 && (
            <View style={cardStyles.section}>
              <Text style={cardStyles.sectionLabel}>PHOTOS  ({photos.length})</Text>
              <PhotoStrip photos={photos} />
            </View>
          )}

          {/* Care heatmap */}
          {logs.length > 0 && (
            <View style={cardStyles.section}>
              <Text style={cardStyles.sectionLabel}>28-DAY CARE LOG</Text>
              <CareHeatmap logs={logs} />
            </View>
          )}

          {/* Stats footer */}
          <View style={cardStyles.statsFooter}>
            <View style={cardStyles.statItem}>
              <Text style={cardStyles.statValue}>{washDays}</Text>
              <Text style={cardStyles.statLabel}>Wash days</Text>
            </View>
            <View style={cardStyles.statDivider} />
            <View style={cardStyles.statItem}>
              <Text style={cardStyles.statValue}>{photos.length}</Text>
              <Text style={cardStyles.statLabel}>Photos</Text>
            </View>
            <View style={cardStyles.statDivider} />
            <View style={cardStyles.statItem}>
              <Text style={cardStyles.statValue}>{milestones.length}</Text>
              <Text style={cardStyles.statLabel}>Milestones</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function HealingTimelineScreen({ navigation }) {
  const { tattoos } = useApp();
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sorted = [...tattoos].sort((a, b) =>
        (a.date_tattooed || '').localeCompare(b.date_tattooed || '')
      );
      const results = await Promise.all(
        sorted.map(async (tattoo) => {
          const [logs, photos, milestones] = await Promise.all([
            getCareLogsForTattoo(tattoo.id).catch(() => []),
            getPhotosForTattoo(tattoo.id).catch(() => []),
            getAllMilestonesForTattoo(tattoo.id).catch(() => []),
          ]);
          return { tattoo, logs, photos, milestones: milestones || [] };
        })
      );
      setTimelineData(results);
      setLoading(false);
    }
    load();
  }, [tattoos]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!tattoos.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>💉</Text>
        <Text style={styles.emptyTitle}>No tattoos yet</Text>
        <Text style={styles.emptyBody}>Your healing journey will appear here once you add a tattoo.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>HEALING JOURNEY</Text>
        <Text style={styles.headerSub}>{tattoos.length} {tattoos.length === 1 ? 'tattoo' : 'tattoos'}</Text>
      </View>

      {timelineData.map((data, i) => (
        <TattooTimelineCard
          key={data.tattoo.id}
          data={data}
          index={i}
          isLast={i === timelineData.length - 1}
          navigation={navigation}
        />
      ))}

      <View style={styles.endCap}>
        <Text style={styles.endCapText}>💉 The journey continues</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: 100, paddingTop: SPACING.lg },
  centered: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', padding: SPACING.xxl, gap: SPACING.md,
  },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { ...FONTS.headingMedium, textAlign: 'center' },
  emptyBody: { ...FONTS.body, color: COLORS.textMuted, textAlign: 'center', maxWidth: 280 },
  headerRow: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between', marginBottom: SPACING.xl,
  },
  headerTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  headerSub: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  endCap: { alignItems: 'center', paddingVertical: SPACING.xl },
  endCapText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
});

const cardStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: SPACING.xl },
  spine: { width: 24, alignItems: 'center' },
  dot: {
    width: 14, height: 14, borderRadius: RADIUS.full,
    zIndex: 1, marginTop: 16,
    shadowOpacity: 0.6, shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  line: {
    flex: 1, width: 2,
    backgroundColor: COLORS.borderGold,
    marginTop: 4,
  },
  card: {
    flex: 1, marginLeft: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderGold,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  banner: { width: '100%', height: 110 },
  bannerPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  bannerInitial: { color: COLORS.accent, fontSize: 48, fontWeight: '800', opacity: 0.7 },
  stageBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  stageBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  body: { padding: SPACING.md, gap: SPACING.sm },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: SPACING.xs,
  },
  name: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  artist: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  metaText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  section: { gap: SPACING.xs },
  sectionLabel: {
    color: COLORS.textMuted, fontSize: 9, fontWeight: '800',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  statsFooter: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: SPACING.sm, marginTop: SPACING.xs,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
});

const heatStyles = StyleSheet.create({
  wrap: { gap: SPACING.xs },
  weekRow: { flexDirection: 'row', gap: 3 },
  weekLabel: { width: CELL, textAlign: 'center', color: COLORS.textMuted, fontSize: 8, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  cell: {
    width: CELL, height: CELL,
    borderRadius: 2,
    backgroundColor: COLORS.surface,
  },
  cellActive: { opacity: 0.9 },
  legend: { flexDirection: 'row', gap: SPACING.md, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '500' },
});

const msStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  badgeEmoji: { fontSize: 12 },
  badgeLabel: { fontSize: 10, fontWeight: '700' },
});

const photoStyles = StyleSheet.create({
  strip: { gap: SPACING.sm },
  thumbWrap: { alignItems: 'center', gap: 3 },
  thumb: {
    width: 64, height: 64,
    borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  dayLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '600' },
});
