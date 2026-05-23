/**
 * ExploreScreen.js
 * Public explore feed — browse all public posts filtered by style tag and/or body part.
 * Infinite scroll with pull-to-refresh. Tapping a post opens PostDetailModal.
 *
 * Fixes:
 *  - Bug #1: Tapping a post with no artist_name silently did nothing.
 *    Now falls back to UserProfile navigation using post.user_id / post.username.
 *  - Bug #5: Filter chip changes didn't trigger a reload mid-session.
 *    useEffect on [activeStyle, activeBodyPart] now calls load(true).
 *  - Bug #6: `background: 'transparent'` is a web CSS prop, not valid in RN.
 *    Changed to `backgroundColor: 'transparent'`.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Image, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, FONTS } from '../constants/theme';
import { TATTOO_STYLES, BODY_PARTS } from '../constants/tattooStyles';
import { getExplorePosts } from '../database/exploreDb';
import EmptyState from '../components/EmptyState';
import ImageWithLoading from '../components/ImageWithLoading';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - SPACING.lg * 2 - SPACING.sm) / 2;
const PAGE_SIZE = 20;

// ─── Style filter chip ───────────────────────────────────────────────────────
function FilterChip({ label, emoji, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityLabel={`${label} filter${active ? ', active' : ''}`}
      accessibilityRole="button"
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Post grid card ───────────────────────────────────────────────────────────
function ExploreCard({ post, onPress, index }) {
  const uri = post.photo_uris
    ? (typeof post.photo_uris === 'string' ? JSON.parse(post.photo_uris)[0] : post.photo_uris[0])
    : null;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 9, delay: (index % 10) * 45, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 280, delay: (index % 10) * 45, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(post)}
        activeOpacity={0.88}
        accessibilityLabel={`Post by ${post.username || 'user'}${post.style ? `, ${post.style} style` : ''}`}
        accessibilityRole="button"
      >
        {uri ? (
          <ImageWithLoading source={{ uri }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={{ fontSize: 28 }}>💉</Text>
          </View>
        )}
        <View style={styles.cardOverlay}>
          <View style={styles.cardMeta}>
            {post.style ? (
              <View style={styles.cardStyleBadge}>
                <Text style={styles.cardStyleText}>
                  {TATTOO_STYLES.find((s) => s.id === post.style)?.label || post.style}
                </Text>
              </View>
            ) : null}
            <Text style={styles.cardUsername} numberOfLines={1}>@{post.username || 'user'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ExploreScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [activeStyle, setActiveStyle] = useState(null);
  const [activeBodyPart, setActiveBodyPart] = useState(null);
  const [filterMode, setFilterMode] = useState('style'); // 'style' | 'bodypart'
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const load = useCallback(async (reset = false) => {
    const offset = reset ? 0 : offsetRef.current;
    const results = await getExplorePosts({
      style: activeStyle,
      bodyPart: activeBodyPart,
      limit: PAGE_SIZE,
      offset,
    });
    if (reset) {
      setPosts(results);
      offsetRef.current = results.length;
    } else {
      setPosts((prev) => [...prev, ...results]);
      offsetRef.current += results.length;
    }
    setHasMore(results.length === PAGE_SIZE);
  }, [activeStyle, activeBodyPart]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  // Bug #5 fix: re-load when filter changes mid-session
  useEffect(() => {
    offsetRef.current = 0;
    load(true);
  }, [activeStyle, activeBodyPart]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  };

  const handleStyleFilter = (id) => {
    setActiveStyle((prev) => (prev === id ? null : id));
    setActiveBodyPart(null);
  };

  const handleBodyPartFilter = (id) => {
    setActiveBodyPart((prev) => (prev === id ? null : id));
    setActiveStyle(null);
  };

  // Search filters artist names in the post list client-side
  const displayedPosts = search.trim()
    ? posts.filter((p) =>
        p.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.username?.toLowerCase().includes(search.toLowerCase()) ||
        p.caption?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  const listFadeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    listFadeAnim.setValue(0);
    Animated.timing(listFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [search, activeStyle, activeBodyPart]);

  const filters = filterMode === 'style' ? TATTOO_STYLES : BODY_PARTS;
  const activeFilter = filterMode === 'style' ? activeStyle : activeBodyPart;
  const handleFilter = filterMode === 'style' ? handleStyleFilter : handleBodyPartFilter;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={14} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artist, user, caption…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        {/* Filter mode toggle */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setFilterMode((m) => (m === 'style' ? 'bodypart' : 'style'))}
          activeOpacity={0.75}
          accessibilityLabel={`Switch to ${filterMode === 'style' ? 'body part' : 'style'} filter`}
          accessibilityRole="button"
        >
          <Feather name="sliders" size={15} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <FlatList
        data={filters}
        horizontal
        keyExtractor={(f) => f.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        renderItem={({ item }) => (
          <FilterChip
            label={item.label}
            emoji={item.emoji}
            active={activeFilter === item.id}
            onPress={() => handleFilter(item.id)}
          />
        )}
        style={styles.chipsList}
      />

      {/* Active filter label */}
      {(activeStyle || activeBodyPart) && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterText}>
            Showing: {activeStyle
              ? TATTOO_STYLES.find((s) => s.id === activeStyle)?.label
              : BODY_PARTS.find((b) => b.id === activeBodyPart)?.label}
          </Text>
          <TouchableOpacity onPress={() => { setActiveStyle(null); setActiveBodyPart(null); }}>
            <Text style={styles.clearFilter}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Post grid */}
      <Animated.View style={{ flex: 1, opacity: listFadeAnim }}>
      <FlatList
        data={displayedPosts}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        renderItem={({ item, index }) => (
          <ExploreCard
            post={item}
            index={index}
            onPress={(post) => {
              // Bug #1 fix: always navigate — use ArtistProfile if artist tagged,
              // otherwise fall back to UserProfile by user_id/username
              if (post.artist_name) {
                navigation.navigate('ArtistProfile', { artistName: post.artist_name });
              } else {
                navigation.navigate('UserProfile', {
                  userId: post.user_id,
                  username: post.username,
                });
              }
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.lg }} /> : null
        }
        ListEmptyComponent={
          !refreshing ? (
            <EmptyState
              icon="🔍"
              title="No public posts yet"
              body="Posts you and others mark as Public will appear here."
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  filterToggle: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  chipsList: { maxHeight: 44 },
  chipsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  chipEmoji: { fontSize: 12 },
  chipLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  chipLabelActive: { color: COLORS.accent },
  activeFilterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xs,
  },
  activeFilterText: { color: COLORS.textSecondary, fontSize: 12 },
  clearFilter: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  grid: { paddingHorizontal: SPACING.lg, paddingBottom: 100, gap: SPACING.sm },
  row: { gap: SPACING.sm },
  card: {
    width: CARD_SIZE, height: CARD_SIZE,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.card,
    ...SHADOWS.card,
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    backgroundColor: COLORS.cardElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  cardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.sm,
    backgroundColor: 'transparent', // Bug #6 fix: was `background` (web CSS prop)
  },
  cardMeta: { gap: 2 },
  cardStyleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  cardStyleText: { color: COLORS.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardUsername: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
});
