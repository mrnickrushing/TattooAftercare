/**
 * FriendsLeaderboardScreen.js
 * Ranks the current user and everyone they follow by care streak.
 * Highlights the current user's row. Pull-to-refresh.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getFriendsLeaderboard } from '../database/exploreDb';
import { getCurrentUser } from '../database/socialDb';

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function LeaderboardRow({ entry, onPress }) {
  const medal = RANK_MEDALS[entry.rank];
  return (
    <TouchableOpacity
      style={[
        styles.row,
        entry.isCurrentUser && styles.rowHighlighted,
      ]}
      onPress={() => onPress && onPress(entry)}
      activeOpacity={0.85}
    >
      {/* Rank */}
      <View style={styles.rankWrap}>
        {medal ? (
          <Text style={styles.medal}>{medal}</Text>
        ) : (
          <Text style={[styles.rankNum, entry.isCurrentUser && styles.rankNumActive]}>#{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.avatar, entry.isCurrentUser && styles.avatarActive]}>
        <Text style={[styles.avatarInitial, entry.isCurrentUser && styles.avatarInitialActive]}>
          {(entry.display_name || entry.username || 'U')[0].toUpperCase()}
        </Text>
      </View>

      {/* Name + stats */}
      <View style={{ flex: 1 }}>
        <Text style={[styles.username, entry.isCurrentUser && styles.usernameActive]} numberOfLines={1}>
          {entry.display_name || entry.username || 'User'}
          {entry.isCurrentUser ? '  (you)' : ''}
        </Text>
        <Text style={styles.statLine}>
          {entry.tattoo_count || 0} tattoos · {entry.total_care_logs || 0} care logs
        </Text>
      </View>

      {/* Streak badge */}
      <View style={[styles.streakBadge, entry.isCurrentUser && styles.streakBadgeActive]}>
        <Text style={styles.streakFire}>🔥</Text>
        <Text style={[styles.streakNum, entry.isCurrentUser && styles.streakNumActive]}>
          {entry.care_streak || 0}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function FriendsLeaderboardScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const load = useCallback(async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
    if (!user?.id) return;
    const data = await getFriendsLeaderboard(user.id);
    setEntries(data);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const myEntry = entries.find((e) => e.isCurrentUser);

  return (
    <View style={styles.container}>
      {/* My rank card */}
      {myEntry && (
        <View style={styles.myRankCard}>
          <View style={{ gap: 2 }}>
            <Text style={styles.myRankLabel}>YOUR RANK</Text>
            <Text style={styles.myRankNum}>
              {RANK_MEDALS[myEntry.rank] || `#${myEntry.rank}`}
            </Text>
          </View>
          <View style={styles.myRankDivider} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={styles.myStatNum}>{myEntry.care_streak || 0}</Text>
            <Text style={styles.myStatLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.myRankDivider} />
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={styles.myStatNum}>{myEntry.tattoo_count || 0}</Text>
            <Text style={styles.myStatLabel}>💉 Tattoos</Text>
          </View>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            onPress={(u) => {
              if (!u.isCurrentUser) {
                navigation.navigate('UserProfile', { userId: u.id });
              }
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <Text style={styles.listHeader}>FRIENDS STREAK BOARD</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyBody}>
              Follow other users on the Explore tab to see their streaks here.
            </Text>
          </View>
        }
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  myRankCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    margin: SPACING.lg, backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold,
    padding: SPACING.xl, ...SHADOWS.gold,
  },
  myRankLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  myRankNum: { color: COLORS.accent, fontSize: 32, fontWeight: '800' },
  myRankDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  myStatNum: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  myStatLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  listHeader: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.5, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  rowHighlighted: { backgroundColor: COLORS.accentMuted },
  rankWrap: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700' },
  rankNumActive: { color: COLORS.accent },
  avatar: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarActive: { borderColor: COLORS.accentBorder, backgroundColor: COLORS.accentMuted },
  avatarInitial: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  avatarInitialActive: { color: COLORS.accent },
  username: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  usernameActive: { color: COLORS.accent },
  statLine: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
  },
  streakBadgeActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  streakFire: { fontSize: 13 },
  streakNum: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '800' },
  streakNumActive: { color: COLORS.accent },
  separator: { height: 1, backgroundColor: COLORS.border },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
