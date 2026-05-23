/**
 * UserProfileScreen.js  — Issue #16
 *
 * Fixes:
 *  - Bug #3: Viewing another user's profile always showed your own data because both
 *    branches of the isOwn check called getLocalUser(). Now falls back to getCachedUser()
 *    for other profiles, with a further fallback to route.params for data passed inline.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { openInstagramProfile } from '../utils/instagram';
import {
  getLocalUser, saveLocalUser,
  getLocalPostsByUser,
  getUserBadges, BADGE_META,
  followUser, unfollowUser, isFollowing,
  createNotification,
  getCachedUser,
} from '../database/socialDb';

export default function UserProfileScreen({ route, navigation }) {
  const viewingUserId = route?.params?.userId || null;
  // Allow screens to pass basic info inline so the profile isn't empty on first render
  const inlineUsername = route?.params?.username || null;

  const [me, setMe] = useState(null);
  const [user, setUser] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [following, setFollowing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [badges, setBadges] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', display_name: '', bio: '', instagram_handle: '' });

  const load = useCallback(async () => {
    const localUser = await getLocalUser();
    setMe(localUser);

    const targetId = viewingUserId || localUser?.id;
    const isOwn = !viewingUserId || viewingUserId === localUser?.id;
    setIsOwnProfile(isOwn);

    let profileUser;
    if (isOwn) {
      profileUser = localUser;
    } else {
      // Bug #3 fix: look up cached user data for other profiles.
      // Fall back to a minimal object from route.params so the screen
      // isn't blank if the user hasn't been cached yet.
      profileUser = await getCachedUser(viewingUserId);
      if (!profileUser) {
        profileUser = {
          id: viewingUserId,
          username: inlineUsername || 'user',
          display_name: null,
          bio: null,
          avatar_uri: null,
          follower_count: 0,
          following_count: 0,
        };
      }
    }
    setUser(profileUser);

    if (profileUser) {
      setForm({ username: profileUser.username || '', display_name: profileUser.display_name || '', bio: profileUser.bio || '', instagram_handle: profileUser.instagram_handle || '' });
      const p = await getLocalPostsByUser(targetId || profileUser.id);
      setPosts(p);
    }
    // Evaluate and fetch badges for the profile owner
    if (isOwn && localUser?.id) {
      // award badges if criteria met
      const newly = await evaluateBadgesForUser(localUser.id);
      if (newly && newly.length > 0) {
        // optionally create notifications for new badges
        for (const nb of newly) {
          await createNotification({ userId: localUser.id, type: 'badge', actorId: null, refId: nb, body: `You earned the ${BADGE_META[nb]?.label || nb} badge!` });
        }
      }
    }
    const b = await getUserBadges(user?.id || null);
    setBadges(b);

    if (!isOwn && localUser?.id && viewingUserId) {
      const f = await isFollowing(localUser.id, viewingUserId);
      setFollowing(f);
    }
  }, [viewingUserId, inlineUsername]);

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

  const handleFollowToggle = async () => {
    if (!me?.id || !viewingUserId) return;
    if (following) {
      await unfollowUser(me.id, viewingUserId);
      setFollowing(false);
      setUser((prev) => prev ? { ...prev, follower_count: Math.max(0, (prev.follower_count || 0) - 1) } : prev);
    } else {
      await followUser(me.id, viewingUserId);
      setFollowing(true);
      setUser((prev) => prev ? { ...prev, follower_count: (prev.follower_count || 0) + 1 } : prev);
      await createNotification({
        userId: viewingUserId,
        type: 'follow',
        actorId: me.id,
        body: `@${me.username || 'Someone'} started following you.`,
      });
    }
  };

  const stats = [
    { label: 'Posts',     value: posts.length },
    { label: 'Followers', value: user?.follower_count || 0 },
    { label: 'Following', value: user?.following_count || 0 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={isOwnProfile ? handleAvatarPick : undefined} activeOpacity={isOwnProfile ? 0.8 : 1}>
          {user?.avatar_uri
            ? <Image source={{ uri: user.avatar_uri }} style={styles.avatar} />
            : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{(user?.username || 'U')[0].toUpperCase()}</Text>
              </View>
            )}
          {isOwnProfile && (
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={13} color={COLORS.textInverse} />
            </View>
          )}
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

      {/* Badge progress */}
      <View style={styles.badgeProgressRow}>
        <Text style={styles.badgeProgressLabel}>Badges</Text>
        <View style={styles.badgeProgressBarBg}>
          <View style={[styles.badgeProgressBarFill, { width: `${(badges.length / Object.keys(BADGE_META).length) * 100}%` }]} />
        </View>
        <Text style={styles.badgeProgressCount}>{badges.length} / {Object.keys(BADGE_META).length}</Text>
      </View>

      {/* Follow / Edit button */}
      {isOwnProfile ? (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => setEditing((e) => !e)}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>{editing ? 'Cancel' : 'Edit Profile'}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.editBtn, following && styles.followingBtn]}
          onPress={handleFollowToggle}
          activeOpacity={0.8}
        >
          <Text style={[styles.editBtnText, following && styles.followingBtnText]}>
            {following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Edit form */}
      {editing && isOwnProfile && (
        <View style={styles.editForm}>
          <Text style={styles.fieldLabel}>USERNAME</Text>
          <TextInput
            style={styles.input}
            value={form.username}
            onChangeText={(v) => setForm((f) => ({ ...f, username: v }))}
            placeholder="username"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
          />
          <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
          <TextInput
            style={styles.input}
            value={form.display_name}
            onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))}
            placeholder="Display name"
            placeholderTextColor={COLORS.textMuted}
          />
          <Text style={styles.fieldLabel}>BIO</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={form.bio}
            onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
            placeholder="Tell your ink story…"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
          <Text style={styles.fieldLabel}>INSTAGRAM HANDLE</Text>
          <View style={styles.igInputRow}>
            <Feather name="instagram" size={16} color={COLORS.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={[styles.input, styles.igInput]}
              value={form.instagram_handle}
              onChangeText={(v) => setForm((f) => ({ ...f, instagram_handle: v.replace(/^@/, '') }))}
              placeholder="yourhandle"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Display name / bio */}
      {!editing && (
        <View style={styles.bioSection}>
          {user?.display_name ? (
            <Text style={styles.displayName}>{user.display_name}</Text>
          ) : null}
          {user?.username ? (
            <Text style={styles.usernameHandle}>@{user.username}</Text>
          ) : null}
          {user?.bio ? (
            <Text style={styles.bio}>{user.bio}</Text>
          ) : null}
          {user?.instagram_handle ? (
            <TouchableOpacity
              style={styles.igHandleRow}
              onPress={() => openInstagramProfile(user.instagram_handle)}
              activeOpacity={0.7}
              accessibilityLabel={`Open @${user.instagram_handle} on Instagram`}
              accessibilityRole="link"
            >
              <Feather name="instagram" size={14} color="#C13584" />
              <Text style={styles.igHandle}>@{user.instagram_handle}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Quick links (own profile only) */}
      {isOwnProfile && (
        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={[styles.quickLinkBtn, styles.quickLinkBtnIg]}
            onPress={user?.instagram_handle
              ? () => openInstagramProfile(user.instagram_handle)
              : () => setEditing(true)}
            activeOpacity={0.8}
            accessibilityLabel={user?.instagram_handle ? `Open @${user.instagram_handle} on Instagram` : 'Add Instagram handle'}
          >
            <Feather name="instagram" size={20} color="#C13584" />
            <Text style={styles.quickLinkText}>{user?.instagram_handle ? 'Instagram' : 'Add IG'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkBtn}
            onPress={() => navigation.navigate('BadgeCabinet', { userId: user?.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkEmoji}>🏆</Text>
            <Text style={styles.quickLinkText}>Badges</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkBtn}
            onPress={() => navigation.navigate('FriendsLeaderboard')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkEmoji}>🔥</Text>
            <Text style={styles.quickLinkText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickLinkBtn}
            onPress={() => navigation.navigate('NotificationSettings')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickLinkEmoji}>🔔</Text>
            <Text style={styles.quickLinkText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts grid */}
      {posts.length > 0 && (
        <View style={styles.postsSection}>
          <Text style={styles.sectionHeader}>POSTS</Text>
          <View style={styles.postsGrid}>
            {posts.map((p) => {
              const uri = p.photo_uris?.[0];
              return (
                <View key={p.id} style={styles.postThumb}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.postThumbImg} />
                  ) : (
                    <View style={[styles.postThumbImg, styles.postThumbPlaceholder]}>
                      <Text style={{ fontSize: 20 }}>💉</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', marginTop: SPACING.md },
  avatar: { width: 90, height: 90, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.accentBorder },
  avatarFallback: {
    width: 90, height: 90, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: COLORS.accent, fontSize: 36, fontWeight: '800' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingVertical: SPACING.lg, ...SHADOWS.card,
  },
  statCell: { alignItems: 'center', gap: 2 },
  statValue: { color: COLORS.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  editBtn: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.xl,
    alignSelf: 'center',
  },
  editBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  followingBtn: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder },
  followingBtnText: { color: COLORS.accent },
  editForm: { gap: SPACING.sm },
  fieldLabel: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: -SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontSize: 14,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm,
  },
  saveBtnText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '700' },
  igHandleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  igHandle: { color: '#C13584', fontSize: 13, fontWeight: '600' },
  igInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md },
  igInput: { flex: 1, borderWidth: 0, borderRadius: 0, paddingHorizontal: 0 },
  quickLinkBtnIg: { borderColor: '#C1358433' },
  bioSection: { gap: SPACING.xs, alignItems: 'center' },
  displayName: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  usernameHandle: { color: COLORS.textMuted, fontSize: 13 },
  bio: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  quickLinks: {
    flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center',
  },
  quickLinkBtn: {
    flex: 1, alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingVertical: SPACING.md, ...SHADOWS.card,
  },
  quickLinkEmoji: { fontSize: 22 },
  quickLinkText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  postsSection: { gap: SPACING.sm },
  sectionHeader: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
  },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  postThumb: { width: '31%', aspectRatio: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  postThumbImg: { width: '100%', height: '100%' },
  postThumbPlaceholder: {
    backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
  },
  badgeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md },
  badgeProgressLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', width: 60 },
  badgeProgressBarBg: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  badgeProgressBarFill: { height: '100%', backgroundColor: COLORS.accent },
  badgeProgressCount: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700', width: 54, textAlign: 'right' },
});
