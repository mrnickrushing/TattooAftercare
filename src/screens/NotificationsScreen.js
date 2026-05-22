/**
 * NotificationsScreen.js
 * Notification center — shows all in-app notifications with unread dot,
 * mark-all-read, and grouped display by type.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import {
  getNotifications, markAllNotificationsRead, getUnreadNotificationCount,
} from '../database/socialDb';

const TYPE_META = {
  follow:    { icon: 'user-plus',     color: COLORS.info,    label: 'followed you' },
  comment:   { icon: 'message-circle', color: COLORS.accent,  label: 'commented on your post' },
  reaction:  { icon: 'heart',          color: '#E05252',      label: 'reacted to your post' },
  mention:   { icon: 'at-sign',        color: COLORS.success, label: 'mentioned you' },
  milestone: { icon: 'award',          color: COLORS.accent,  label: 'Healing milestone reached!' },
  badge:     { icon: 'star',           color: COLORS.accent,  label: 'New badge earned!' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const notifs = await getNotifications(60);
    setNotifications(notifs);
    const count = await getUnreadNotificationCount();
    setUnread(count);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || TYPE_META.comment;
    let timeAgo = '';
    try { timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }); } catch {}

    return (
      <View style={[styles.notifRow, !item.is_read && styles.notifRowUnread]}>
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
          <Feather name={meta.icon} size={16} color={meta.color} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          {item.actor_username ? (
            <Text style={styles.notifText}>
              <Text style={styles.notifActor}>@{item.actor_username} </Text>
              {meta.label}
            </Text>
          ) : (
            <Text style={styles.notifText}>{item.body || meta.label}</Text>
          )}
          {item.body && item.actor_username ? (
            <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <Text style={styles.notifTime}>{timeAgo}</Text>
        </View>

        {/* Unread dot */}
        {!item.is_read && <View style={styles.unreadDot} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header actions */}
      {unread > 0 && (
        <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead} activeOpacity={0.75}>
          <Feather name="check-circle" size={14} color={COLORS.accent} />
          <Text style={styles.markReadText}>Mark all read ({unread})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyBody}>Activity from your healing milestones, badges, comments, and reactions will show up here.</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  markReadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  markReadText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  notifRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  notifRowUnread: { backgroundColor: COLORS.card },
  iconWrap: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifText: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20 },
  notifActor: { fontWeight: '700', color: COLORS.accent },
  notifBody: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2, lineHeight: 18 },
  notifTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  unreadDot: {
    width: 8, height: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent, marginTop: 6, flexShrink: 0,
  },
  separator: { height: 1, backgroundColor: COLORS.border },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
