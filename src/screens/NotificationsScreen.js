/**
 * NotificationsScreen.js
 * Notification center — shows all in-app notifications with unread dot,
 * mark-all-read, and grouped display by type.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import {
  getNotifications, markAllNotificationsRead, getUnreadNotificationCount, markNotificationRead,
} from '../database/socialDb';

const TYPE_META = {
  follow:    { icon: 'user-plus',     color: COLORS.info,    label: 'followed you' },
  comment:   { icon: 'message-circle', color: COLORS.accent,  label: 'commented on your post' },
  reaction:  { icon: 'heart',          color: '#E05252',      label: 'reacted to your post' },
  mention:   { icon: 'at-sign',        color: COLORS.success, label: 'mentioned you' },
  milestone: { icon: 'award',          color: COLORS.accent,  label: 'Healing milestone reached!' },
  badge:     { icon: 'star',           color: COLORS.accent,  label: 'New badge earned!' },
};

function SwipeableNotifRow({ item, meta, timeAgo, onDismiss }) {
  const swipeRef = useRef(null);
  const dotOpacity = useRef(new Animated.Value(item.is_read ? 0 : 1)).current;

  useEffect(() => {
    if (item.is_read) {
      Animated.timing(dotOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    }
  }, [item.is_read]);

  const renderRightActions = (progress, dragX) => {
    const opacity = dragX.interpolate({ inputRange: [-80, -20], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.swipeAction, { opacity }]}>
        <Feather name="x" size={18} color="#fff" />
        <Text style={styles.swipeActionText}>Dismiss</Text>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      onSwipeableOpen={() => {
        swipeRef.current?.close();
        onDismiss();
      }}
    >
      <View style={[styles.notifRow, !item.is_read && styles.notifRowUnread]}>
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
          <Feather name={meta.icon} size={16} color={meta.color} />
        </View>
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
        <Animated.View style={[styles.unreadDot, { opacity: dotOpacity }]} />
      </View>
    </Swipeable>
  );
}

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

  const handleDismiss = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnread((prev) => Math.max(0, prev - 1));
  }, []);

  const renderItem = ({ item }) => {
    const meta = TYPE_META[item.type] || TYPE_META.comment;
    let timeAgo = '';
    try { timeAgo = formatDistanceToNow(parseISO(item.created_at), { addSuffix: true }); } catch {}

    return (
      <SwipeableNotifRow item={item} meta={meta} timeAgo={timeAgo} onDismiss={() => handleDismiss(item.id)} />
    );
  };

  return (
    <View style={styles.container}>
      {/* Header actions */}
      {unread > 0 && (
        <TouchableOpacity
          style={styles.markReadBtn}
          onPress={handleMarkAllRead}
          activeOpacity={0.75}
          accessibilityLabel={`Mark all ${unread} notifications as read`}
          accessibilityRole="button"
        >
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
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            body="Activity from your healing milestones, badges, comments, and reactions will show up here."
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
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
  swipeAction: {
    backgroundColor: '#E05252', width: 80, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  swipeActionText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
