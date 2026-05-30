import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import { TATTOO_STYLES, BODY_PARTS } from '../constants/tattooStyles';
import { getExplorePosts, getTrendingPosts } from '../database/exploreDb';
import { getCurrentUser, getMyReaction, toggleReactionLocal } from '../database/socialDb';
import EmptyState from '../components/EmptyState';
import ImageWithLoading from '../components/ImageWithLoading';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - SPACING.lg * 2 - SPACING.sm) / 2;
const PAGE_SIZE = 20;

function safeFirstPhoto(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed[0] || null : null;
  } catch {
    return null;
  }
}

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

function ExploreCard({ post, onPress, onToggleReaction, index }) {
  const uri = safeFirstPhoto(post.photo_uris);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const [showQuickReactions, setShowQuickReactions] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 9, delay: (index % 10) * 35, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 240, delay: (index % 10) * 35, useNativeDriver: true }),
    ]).start();
  }, []);

  const tapReaction = (emoji) => {
    Animated.sequence([
      Animated.spring(badgeScale, { toValue: 0.88, useNativeDriver: true, friction: 8 }),
      Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, friction: 8 }),
    ]).start();
    onToggleReaction && onToggleReaction(post, emoji);
  };

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

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.78)']}
          style={styles.cardOverlay}
          pointerEvents="none"
        />

        <Animated.View style={[styles.reactionBadge, post._my_reacted && styles.reactionBadgeActive, { transform: [{ scale: badgeScale }] }] }>
          <TouchableOpacity
            onPress={() => tapReaction('love')}
            onLongPress={() => setShowQuickReactions(true)}
            onPressOut={() => setShowQuickReactions(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="React to post"
          >
            <Text style={[styles.reactionBadgeText, post._my_reacted && styles.reactionBadgeTextActive]}>{post.reaction_count || 0} 🔥</Text>
          </TouchableOpacity>
        </Animated.View>

        {showQuickReactions && (
          <View style={styles.quickReactionsRow} pointerEvents="box-none">
            {['👍', '❤️', '🔥'].map((emoji) => (
              <TouchableOpacity key={emoji} onPress={() => tapReaction(emoji)} style={styles.quickReactionBtn}>
                <Text style={styles.quickReactionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.cardMeta}>
          {post.style ? (
            <View style={styles.cardStyleBadge}>
              <Text style={styles.cardStyleText}>{TATTOO_STYLES.find((s) => s.id === post.style)?.label || post.style}</Text>
            </View>
          ) : null}
          <Text style={styles.cardUsername} numberOfLines={1}>@{post.username || 'user'}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function ExploreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState([]);
  const [activeStyle, setActiveStyle] = useState(null);
  const [activeBodyPart, setActiveBodyPart] = useState(null);
  const [filterMode, setFilterMode] = useState('style');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState([]);
  const offsetRef = useRef(0);

  const handlePostPress = useCallback((post) => {
    if (post.artist_name) {
      navigation.navigate('ArtistProfile', { artistName: post.artist_name });
    } else {
      navigation.navigate('UserProfile', { userId: post.user_id, username: post.username });
    }
  }, [navigation]);

  const syncReactions = useCallback(async (currentPosts, currentTrending) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;
      if (currentPosts?.length) {
        const checks = await Promise.all(currentPosts.map((p) => getMyReaction(p.id, user.id)));
        setPosts(currentPosts.map((p, i) => ({ ...p, _my_reacted: !!checks[i] })));
      }
      if (currentTrending?.length) {
        const checks = await Promise.all(currentTrending.map((p) => getMyReaction(p.id, user.id)));
        setTrendingPosts(currentTrending.map((p, i) => ({ ...p, _my_reacted: !!checks[i] })));
      }
    } catch (e) {
      console.error('syncReactions', e);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const results = await getTrendingPosts({ limit: 6 });
      setTrendingPosts(results);
      syncReactions(null, results);
    } catch (e) {
      console.error('loadTrending:', e);
      setTrendingPosts([]);
    }
  }, [syncReactions]);

  const load = useCallback(async (reset = false) => {
    const offset = reset ? 0 : offsetRef.current;
    const results = await getExplorePosts({ style: activeStyle, bodyPart: activeBodyPart, limit: PAGE_SIZE, offset });
    if (reset) {
      setPosts(results);
      offsetRef.current = results.length;
      syncReactions(results, null);
    } else {
      setPosts((prev) => {
        const merged = [...prev, ...results];
        syncReactions(merged, null);
        return merged;
      });
      offsetRef.current += results.length;
    }
    setHasMore(results.length === PAGE_SIZE);
  }, [activeStyle, activeBodyPart, syncReactions]);

  useFocusEffect(useCallback(() => {
    load(true);
    loadTrending();
  }, [load, loadTrending]));

  useEffect(() => {
    offsetRef.current = 0;
    load(true);
  }, [activeStyle, activeBodyPart]);

  const handleToggleReaction = useCallback(async (post, emoji = 'love') => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        navigation.getParent()?.navigate('ProfileTab');
        return;
      }
      const existing = await getMyReaction(post.id, user.id);
      const updater = (p) => p.id === post.id
        ? { ...p, reaction_count: existing ? Math.max(0, (p.reaction_count || 0) - 1) : ((p.reaction_count || 0) + 1), _my_reacted: !existing }
        : p;
      setPosts((prev) => prev.map(updater));
      setTrendingPosts((prev) => prev.map(updater));
      await toggleReactionLocal(post.id, user.id, emoji);
      await load(true);
      await loadTrending();
    } catch (e) {
      console.error('toggleReaction failed', e);
      load(true);
      loadTrending();
    }
  }, [load, loadTrending, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(true);
    await loadTrending();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  };

  const filters = filterMode === 'style' ? TATTOO_STYLES : BODY_PARTS;
  const activeFilter = filterMode === 'style' ? activeStyle : activeBodyPart;
  const displayedPosts = search.trim()
    ? posts.filter((p) =>
        p.artist_name?.toLowerCase().includes(search.toLowerCase()) ||
        p.username?.toLowerCase().includes(search.toLowerCase()) ||
        p.caption?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl;

  const setFilter = (id) => {
    if (filterMode === 'style') {
      setActiveStyle((prev) => (prev === id ? null : id));
      setActiveBodyPart(null);
    } else {
      setActiveBodyPart((prev) => (prev === id ? null : id));
      setActiveStyle(null);
    }
  };

  const featuredPost = trendingPosts[0];
  const featuredUri = safeFirstPhoto(featuredPost?.photo_uris);

  return (
    <TattooBackground style={styles.container}>
      <FlatList
        data={displayedPosts}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.grid, { paddingTop: insets.top + SPACING.lg, paddingBottom: bottomPad }]}
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
        ListHeaderComponent={(
          <View>
            <ScreenHero
              eyebrow="Explore"
              title="Fresh ink from the community."
              subtitle="Find styles, artists, placements, and healed results that match the look you want."
              icon="compass"
              stats={[
                { label: 'Posts', value: posts.length },
                { label: 'Trending', value: trendingPosts.length },
                { label: 'Filter', value: filterMode === 'style' ? 'Style' : 'Body' },
              ]}
            />

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={14} color={COLORS.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search artist, user, caption"
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

            {featuredPost ? (
              <TouchableOpacity style={styles.featuredCard} onPress={() => handlePostPress(featuredPost)} activeOpacity={0.9}>
                {featuredUri ? (
                  <ImageWithLoading source={{ uri: featuredUri }} style={styles.featuredImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.featuredImage, styles.featuredPlaceholder]}><Text style={styles.featuredPlaceholderText}>Featured</Text></View>
                )}
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.featuredOverlay} />
                <View style={styles.featuredMeta}>
                  <Text style={styles.featuredLabel}>Top pick</Text>
                  <Text style={styles.featuredTitle} numberOfLines={1}>@{featuredPost.username || 'artist'}</Text>
                  <Text style={styles.featuredSub} numberOfLines={1}>{featuredPost.style || 'Tattoo'} · {featuredPost.reaction_count || 0} reactions</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <FlatList
              data={filters}
              horizontal
              keyExtractor={(f) => f.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              renderItem={({ item }) => (
                <FilterChip label={item.label} emoji={item.emoji} active={activeFilter === item.id} onPress={() => setFilter(item.id)} />
              )}
              style={styles.chipsList}
            />

            {(activeStyle || activeBodyPart) && (
              <View style={styles.activeFilterRow}>
                <Text style={styles.activeFilterText}>
                  Showing {activeStyle ? TATTOO_STYLES.find((s) => s.id === activeStyle)?.label : BODY_PARTS.find((b) => b.id === activeBodyPart)?.label}
                </Text>
                <TouchableOpacity onPress={() => { setActiveStyle(null); setActiveBodyPart(null); }}>
                  <Text style={styles.clearFilter}>Clear</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        renderItem={({ item, index }) => <ExploreCard post={item} index={index} onPress={handlePostPress} onToggleReaction={handleToggleReaction} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.accent} style={{ marginVertical: SPACING.lg }} /> : null}
        ListEmptyComponent={!refreshing ? <EmptyState icon="🔍" title="No public posts yet" body="Posts marked Public will appear here." /> : null}
        showsVerticalScrollIndicator={false}
      />
    </TattooBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  gridRow: { gap: SPACING.sm },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(34,21,16,0.92)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  filterToggle: {
    width: 38, height: 38, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  featuredCard: {
    height: 230,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    backgroundColor: COLORS.card,
    marginBottom: SPACING.lg,
    ...SHADOWS.goldStrong,
  },
  featuredImage: { width: '100%', height: '100%' },
  featuredPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  featuredPlaceholderText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '900' },
  featuredOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  featuredMeta: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: SPACING.lg },
  featuredLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  featuredTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 4 },
  featuredSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  chipsList: { maxHeight: 46, marginBottom: SPACING.sm, marginHorizontal: -SPACING.lg },
  chipsRow: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(34,21,16,0.92)', borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, ...SHADOWS.gold },
  chipEmoji: { fontSize: 12 },
  chipLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800' },
  chipLabelActive: { color: COLORS.textInverse },
  activeFilterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  activeFilterText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  clearFilter: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  card: {
    width: CARD_SIZE, height: CARD_SIZE * 1.08,
    borderRadius: RADIUS.lg, overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { backgroundColor: COLORS.cardElevated, alignItems: 'center', justifyContent: 'center' },
  cardOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 86 },
  cardMeta: { position: 'absolute', left: SPACING.sm, right: SPACING.sm, bottom: SPACING.sm, gap: 3 },
  cardStyleBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.58)', borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.borderGold },
  cardStyleText: { color: COLORS.accent, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  cardUsername: { color: 'rgba(255,255,255,0.86)', fontSize: 11, fontWeight: '800' },
  reactionBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.62)',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderGold,
  },
  reactionBadgeActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  reactionBadgeText: { color: COLORS.accent, fontSize: 11, fontWeight: '900' },
  reactionBadgeTextActive: { color: COLORS.textInverse },
  quickReactionsRow: { position: 'absolute', top: SPACING.sm, right: SPACING.sm + 48, flexDirection: 'row', gap: SPACING.xs },
  quickReactionBtn: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.xs },
  quickReactionText: { fontSize: 15 },
});
