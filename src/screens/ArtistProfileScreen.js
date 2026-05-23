/**
 * ArtistProfileScreen.js
 * Shows all tattoos and public journal posts tagged with a given artist name.
 * Displays style breakdown, total works, and a 2-column photo grid.
 * Route params: { artistName: string }
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ScrollView, ActivityIndicator, Share,
} from 'react-native';
import { openInstagramProfile } from '../utils/instagram';
import EmptyState from '../components/EmptyState';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import ImageWithLoading from '../components/ImageWithLoading';
import { getArtistData } from '../database/exploreDb';
import { getStyleById } from '../constants/tattooStyles';

const { width } = Dimensions.get('window');
const THUMB = (width - SPACING.lg * 2 - SPACING.sm) / 2;

function StyleBreakdownPill({ styleId, count }) {
  const meta = getStyleById(styleId);
  return (
    <View style={styles.stylePill}>
      <Text style={styles.stylePillEmoji}>{meta.emoji}</Text>
      <Text style={styles.stylePillLabel}>{meta.label}</Text>
      <Text style={styles.stylePillCount}>{count}</Text>
    </View>
  );
}

function PostThumb({ post }) {
  const uri = post.photo_uris
    ? (typeof post.photo_uris === 'string' ? JSON.parse(post.photo_uris)[0] : post.photo_uris[0])
    : null;
  return (
    <View style={styles.thumb}>
      {uri ? (
        <ImageWithLoading source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
          <Text style={{ fontSize: 24 }}>💉</Text>
        </View>
      )}
      {post.tattoo_name ? (
        <Text style={styles.thumbLabel} numberOfLines={1}>{post.tattoo_name}</Text>
      ) : null}
    </View>
  );
}

export default function ArtistProfileScreen({ route, navigation }) {
  const { artistName } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts'); // 'posts' | 'tattoos'

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getArtistData(artistName);
      setData(result);
      setLoading(false);
    })();
  }, [artistName]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  const styleEntries = Object.entries(data?.styleBreakdown || []).sort((a, b) => b[1] - a[1]);
  const displayItems = tab === 'posts' ? (data?.posts || []) : (data?.tattoos || []);

  return (
    <View style={styles.container}>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => <PostThumb post={tab === 'tattoos' ? { ...item, photo_uris: item.photo_uri ? [item.photo_uri] : null, tattoo_name: item.name } : item} />}
        ListHeaderComponent={
          <View>
            {/* Artist hero */}
            <View style={styles.heroSection}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {(artistName || 'A')[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.artistName}>{artistName}</Text>
              <Text style={styles.artistSubtitle}>Tattoo Artist</Text>

              {/* Instagram deep link button */}
              {data?.instagramHandle && (
                <TouchableOpacity
                  style={styles.igBtn}
                  onPress={() => openInstagramProfile(data.instagramHandle)}
                  activeOpacity={0.75}
                  accessibilityLabel={`Open @${data.instagramHandle} on Instagram`}
                  accessibilityRole="link"
                >
                  <Feather name="instagram" size={15} color="#fff" />
                  <Text style={styles.igBtnText}>@{data.instagramHandle}</Text>
                  <Feather name="external-link" size={11} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              )}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{data?.totalWorks || 0}</Text>
                  <Text style={styles.statLabel}>Tagged Works</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{data?.posts?.length || 0}</Text>
                  <Text style={styles.statLabel}>Journal Posts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{styleEntries.length}</Text>
                  <Text style={styles.statLabel}>Styles</Text>
                </View>
              </View>
            </View>

            {/* Style breakdown */}
            {styleEntries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>STYLES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                  {styleEntries.map(([styleId, count]) => (
                    <StyleBreakdownPill key={styleId} styleId={styleId} count={count} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, tab === 'posts' && styles.tabActive]}
                onPress={() => setTab('posts')}
                activeOpacity={0.75}
                accessibilityLabel="Posts tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'posts' }}
              >
                <Feather name="grid" size={14} color={tab === 'posts' ? COLORS.accent : COLORS.textMuted} />
                <Text style={[styles.tabLabel, tab === 'posts' && styles.tabLabelActive]}>Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, tab === 'tattoos' && styles.tabActive]}
                onPress={() => setTab('tattoos')}
                activeOpacity={0.75}
                accessibilityLabel="Tattoos tab"
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === 'tattoos' }}
              >
                <Feather name="layers" size={14} color={tab === 'tattoos' ? COLORS.accent : COLORS.textMuted} />
                <Text style={[styles.tabLabel, tab === 'tattoos' && styles.tabLabelActive]}>Tattoos</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🎨"
            title={`No ${tab} yet`}
            body={`Public ${tab} tagged with this artist will appear here.`}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  heroSection: {
    alignItems: 'center', paddingTop: SPACING.xxl, paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg, gap: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentMuted, borderWidth: 2, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.gold,
  },
  avatarInitial: { color: COLORS.accent, fontSize: 32, fontWeight: '800' },
  artistName: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  artistSubtitle: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  igBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: '#C13584', borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    marginTop: SPACING.xs,
  },
  igBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statNumber: { color: COLORS.accent, fontSize: 20, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  section: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.sm },
  sectionTitle: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  pillsRow: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  stylePill: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.card, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  stylePillEmoji: { fontSize: 12 },
  stylePillLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  stylePillCount: {
    color: COLORS.accent, fontSize: 11, fontWeight: '700',
    backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.full,
    paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden',
  },
  tabRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginTop: SPACING.md,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.accent },
  tabLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: COLORS.accent },
  gridRow: { gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  gridContent: { gap: SPACING.sm, paddingBottom: 100 },
  thumb: {
    width: THUMB, borderRadius: RADIUS.md, overflow: 'hidden',
    backgroundColor: COLORS.card,
  },
  thumbImage: { width: '100%', height: THUMB },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardElevated },
  thumbLabel: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '600',
    padding: SPACING.xs,
  },
});
