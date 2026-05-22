import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { getLocalUser, saveLocalUser } from '../utils/localUser';
import { getLocalPostsByUser } from '../database/socialDb';
import { getUserBadges, BADGE_META } from '../database/socialDb';

export default function UserProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [badges, setBadges] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', display_name: '', bio: '' });

  const load = useCallback(async () => {
    const u = await getLocalUser();
    setUser(u);
    if (u) {
      setForm({ username: u.username || '', display_name: u.display_name || '', bio: u.bio || '' });
      const p = await getLocalPostsByUser(u.id);
      setPosts(p);
    }
    const b = await getUserBadges();
    setBadges(b);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!form.username.trim()) { Alert.alert('Username required'); return; }
    const updated = { ...user, ...form };
    await saveLocalUser(updated);
    setUser(updated);
    setEditing(false);
  };

  const handleAvatarPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const updated = { ...user, avatar_uri: result.assets[0].uri };
      await saveLocalUser(updated);
      setUser(updated);
    }
  };

  const stats = [
    { label: 'Posts', value: posts.length },
    { label: 'Followers', value: user?.follower_count || 0 },
    { label: 'Following', value: user?.following_count || 0 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handleAvatarPick} activeOpacity={0.8}>
          {user?.avatar_uri
            ? <Image source={{ uri: user.avatar_uri }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{(user?.username || 'U')[0].toUpperCase()}</Text>
              </View>
            )}
          <View style={styles.avatarEditBadge}>
            <Feather name="camera" size={13} color={COLORS.textInverse} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCell}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Profile info / edit */}
      {editing ? (
        <View style={styles.editForm}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={(v) => setForm((p) => ({ ...p, username: v }))}
            placeholder="username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
          <TextInput
            style={styles.input}
            value={form.display_name}
            onChangeText={(v) => setForm((p) => ({ ...p, display_name: v }))}
            placeholder="Display name"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.fieldLabel}>BIO</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={form.bio}
            onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
            placeholder="Tell your ink story…"
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} activeOpacity={0.75}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.75}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{user?.display_name || user?.username || 'Set up your profile'}</Text>
          {user?.username && <Text style={styles.username}>@{user.username}</Text>}
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => setEditing(true)} activeOpacity={0.75}>
            <Feather name="edit-2" size={13} color={COLORS.accent} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BADGES</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
            {badges.map((b) => {
              const meta = BADGE_META[b.badge_type] || { label: b.badge_type, icon: '🏅', desc: '' };
              return (
                <View key={b.badge_type} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{meta.icon}</Text>
                  <Text style={styles.badgeLabel}>{meta.label}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Posts grid */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>INK JOURNAL ({posts.length})</Text>
        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyPostsText}>No journal posts yet. Open a tattoo and tap "Add Journal Post".</Text>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postGridThumb}
                activeOpacity={0.85}
              >
                {post.photo_uris?.[0]
                  ? <Image source={{ uri: post.photo_uris[0] }} style={styles.postGridImage} />
                  : (
                    <View style={styles.postGridImageFallback}>
                      <Text style={styles.postGridDay}>Day {post.healing_day || '?'}</Text>
                    </View>
                  )}
                {post.healing_day ? (
                  <View style={styles.postGridDayBadge}>
                    <Text style={styles.postGridDayBadgeText}>Day {post.healing_day}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 120 },
  avatarSection: { alignItems: 'center', paddingTop: SPACING.xl, marginBottom: SPACING.lg },
  avatar: { width: 88, height: 88, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.accentBorder },
  avatarFallback: {
    width: 88, height: 88, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card,
    borderWidth: 2, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: COLORS.accent, fontSize: 36, fontWeight: '700' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  statCell: { alignItems: 'center', gap: 2 },
  statValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  profileInfo: { paddingHorizontal: SPACING.xl, alignItems: 'center', marginBottom: SPACING.xl },
  displayName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 2 },
  username: { color: COLORS.textMuted, fontSize: 14, marginBottom: SPACING.sm },
  bio: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: SPACING.md },
  editProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    marginTop: SPACING.sm,
  },
  editProfileBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  editForm: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xl, gap: SPACING.sm },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  editActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  cancelBtn: {
    flex: 1, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: SPACING.md,
    borderRadius: RADIUS.md, backgroundColor: COLORS.accent,
    alignItems: 'center', ...SHADOWS.gold,
  },
  saveBtnText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '700' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  badgesRow: { gap: SPACING.sm },
  badgeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 72,
    gap: 4,
  },
  badgeIcon: { fontSize: 24 },
  badgeLabel: { color: COLORS.textSecondary, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  postGridThumb: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  postGridImage: { width: '100%', height: '100%' },
  postGridImageFallback: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  postGridDay: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  postGridDayBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  postGridDayBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  emptyPosts: { padding: SPACING.lg, alignItems: 'center' },
  emptyPostsText: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
