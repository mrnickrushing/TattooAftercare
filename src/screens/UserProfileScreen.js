import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, SHADOWS, TAB_BAR_HEIGHT } from '../constants/theme';
import { openInstagramProfile } from '../utils/instagram';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';
import {
  getLocalUser, saveLocalUser,
  getLocalPostsByUser,
  getUserBadges, BADGE_META,
  followUser, unfollowUser, isFollowing,
  createNotification,
  getCachedUser,
  evaluateBadgesForUser,
} from '../database/socialDb';

function firstPhoto(post) {
  if (!post?.photo_uris) return null;
  if (Array.isArray(post.photo_uris)) return post.photo_uris[0] || null;
  try {
    const parsed = JSON.parse(post.photo_uris);
    return Array.isArray(parsed) ? parsed[0] || null : null;
  } catch {
    return null;
  }
}

export default function UserProfileScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const viewingUserId = route?.params?.userId || null;
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
    const own = !viewingUserId || viewingUserId === localUser?.id;
    setIsOwnProfile(own);

    let profileUser;
    if (own) {
      profileUser = localUser;
    } else {
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
      setForm({
        username: profileUser.username || '',
        display_name: profileUser.display_name || '',
        bio: profileUser.bio || '',
        instagram_handle: profileUser.instagram_handle || '',
      });
      const profilePosts = await getLocalPostsByUser(targetId || profileUser.id);
      setPosts(profilePosts);
    }

    if (own && localUser?.id) {
      const newly = await evaluateBadgesForUser(localUser.id);
      for (const badgeType of newly || []) {
        await createNotification({
          userId: localUser.id,
          type: 'badge',
          actorId: null,
          refId: badgeType,
          body: `You earned the ${BADGE_META[badgeType]?.label || badgeType} badge!`,
        });
      }
    }

    const earnedBadges = await getUserBadges(profileUser?.id || null);
    setBadges(earnedBadges);

    if (!own && localUser?.id && viewingUserId) {
      const isFriend = await isFollowing(localUser.id, viewingUserId);
      setFollowing(isFriend);
    }
  }, [viewingUserId, inlineUsername]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    if (!form.username.trim()) { Alert.alert('Username required'); return; }
    const updated = { ...user, ...form, instagram_handle: form.instagram_handle.replace(/^@/, '') };
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

  const totalBadges = Object.keys(BADGE_META).length || 1;
  const badgePercent = Math.min(100, Math.round((badges.length / totalBadges) * 100));
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl;

  return (
    <TattooBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.lg, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHero
          eyebrow={isOwnProfile ? 'My profile' : 'Artist profile'}
          title={user?.display_name || user?.username || 'Ink profile'}
          subtitle={user?.bio || 'Build your public ink identity with posts, badges, streaks, and artist links.'}
          icon="user"
          stats={[
            { label: 'Posts', value: posts.length },
            { label: 'Followers', value: user?.follower_count || 0 },
            { label: 'Badges', value: badges.length },
          ]}
        />

        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={isOwnProfile ? handleAvatarPick : undefined} activeOpacity={isOwnProfile ? 0.8 : 1}>
              {user?.avatar_uri ? (
                <Image source={{ uri: user.avatar_uri }} style={styles.avatar} />
              ) : (
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

          {!editing && (
            <View style={styles.bioSection}>
              {user?.username ? <Text style={styles.usernameHandle}>@{user.username}</Text> : null}
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

          <View style={styles.badgeProgressRow}>
            <Text style={styles.badgeProgressLabel}>Badge meter</Text>
            <View style={styles.badgeProgressBarBg}>
              <View style={[styles.badgeProgressBarFill, { width: `${badgePercent}%` }]} />
            </View>
            <Text style={styles.badgeProgressCount}>{badges.length} / {totalBadges}</Text>
          </View>

          {isOwnProfile ? (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing((e) => !e)} activeOpacity={0.8}>
              <Text style={styles.editBtnText}>{editing ? 'Cancel' : 'Edit Profile'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.editBtn, following && styles.followingBtn]} onPress={handleFollowToggle} activeOpacity={0.8}>
              <Text style={[styles.editBtnText, following && styles.followingBtnText]}>{following ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing && isOwnProfile && (
          <View style={styles.editForm}>
            <Field label="Username">
              <TextInput style={styles.input} value={form.username} onChangeText={(v) => setForm((f) => ({ ...f, username: v }))} placeholder="username" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" />
            </Field>
            <Field label="Display name">
              <TextInput style={styles.input} value={form.display_name} onChangeText={(v) => setForm((f) => ({ ...f, display_name: v }))} placeholder="Display name" placeholderTextColor={COLORS.textMuted} />
            </Field>
            <Field label="Bio">
              <TextInput style={[styles.input, styles.bioInput]} value={form.bio} onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))} placeholder="Tell your ink story" placeholderTextColor={COLORS.textMuted} multiline />
            </Field>
            <Field label="Instagram">
              <TextInput style={styles.input} value={form.instagram_handle} onChangeText={(v) => setForm((f) => ({ ...f, instagram_handle: v.replace(/^@/, '') }))} placeholder="yourhandle" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" autoCorrect={false} />
            </Field>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {isOwnProfile && (
          <View style={styles.quickLinks}>
            <QuickLink icon="instagram" label={user?.instagram_handle ? 'Instagram' : 'Add IG'} color="#C13584" onPress={user?.instagram_handle ? () => openInstagramProfile(user.instagram_handle) : () => setEditing(true)} />
            <QuickLink emoji="🏆" label="Badges" onPress={() => navigation.navigate('BadgeCabinet', { userId: user?.id })} />
            <QuickLink emoji="🔥" label="Leaderboard" onPress={() => navigation.navigate('FriendsLeaderboard')} />
            <QuickLink emoji="🔔" label="Alerts" onPress={() => navigation.navigate('NotificationSettings')} />
          </View>
        )}

        {posts.length > 0 ? (
          <View style={styles.postsSection}>
            <Text style={styles.sectionHeader}>POSTS</Text>
            <View style={styles.postsGrid}>
              {posts.map((post) => {
                const uri = firstPhoto(post);
                return (
                  <View key={post.id} style={styles.postThumb}>
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
        ) : (
          <View style={styles.emptyPosts}>
            <Text style={styles.emptyPostsTitle}>No posts yet</Text>
            <Text style={styles.emptyPostsText}>Public journal posts will show up here.</Text>
          </View>
        )}
      </ScrollView>
    </TattooBackground>
  );
}

function Field({ label, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function QuickLink({ icon, emoji, label, color = COLORS.accent, onPress }) {
  return (
    <TouchableOpacity style={styles.quickLinkBtn} onPress={onPress} activeOpacity={0.82}>
      {icon ? <Feather name={icon} size={20} color={color} /> : <Text style={styles.quickLinkEmoji}>{emoji}</Text>}
      <Text style={styles.quickLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, gap: SPACING.lg },
  profileCard: {
    backgroundColor: 'rgba(42,26,18,0.96)',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.card,
  },
  avatarSection: { alignItems: 'center', marginTop: -SPACING.xs },
  avatar: { width: 96, height: 96, borderRadius: RADIUS.full, borderWidth: 2, borderColor: COLORS.accentBorder },
  avatarFallback: {
    width: 96, height: 96, borderRadius: RADIUS.full,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: COLORS.accent, fontSize: 38, fontWeight: '900' },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  bioSection: { gap: SPACING.xs, alignItems: 'center' },
  usernameHandle: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  igHandleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  igHandle: { color: '#C13584', fontSize: 13, fontWeight: '700' },
  badgeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  badgeProgressLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', width: 78, textTransform: 'uppercase' },
  badgeProgressBarBg: { flex: 1, height: 9, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden' },
  badgeProgressBarFill: { height: '100%', backgroundColor: COLORS.accent },
  badgeProgressCount: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800', width: 54, textAlign: 'right' },
  editBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.full,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    alignSelf: 'center', ...SHADOWS.gold,
  },
  editBtnText: { color: COLORS.textInverse, fontSize: 13, fontWeight: '900' },
  followingBtn: { backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder },
  followingBtnText: { color: COLORS.accent },
  editForm: { gap: SPACING.md, backgroundColor: 'rgba(34,21,16,0.9)', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg },
  fieldWrap: { gap: SPACING.xs },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrimary, fontSize: 14,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  bioInput: { minHeight: 82, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: COLORS.accent, borderRadius: RADIUS.full, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.xs, ...SHADOWS.gold },
  saveBtnText: { color: COLORS.textInverse, fontSize: 14, fontWeight: '900' },
  quickLinks: { flexDirection: 'row', gap: SPACING.sm },
  quickLinkBtn: {
    flex: 1, alignItems: 'center', gap: SPACING.xs,
    backgroundColor: 'rgba(42,26,18,0.96)', borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.borderGold,
    paddingVertical: SPACING.md, ...SHADOWS.card,
  },
  quickLinkEmoji: { fontSize: 22 },
  quickLinkText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '800' },
  postsSection: { gap: SPACING.sm },
  sectionHeader: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  postThumb: { width: '31.5%', aspectRatio: 1, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGold, backgroundColor: COLORS.card },
  postThumbImg: { width: '100%', height: '100%' },
  postThumbPlaceholder: { backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' },
  emptyPosts: { alignItems: 'center', paddingVertical: SPACING.xxl, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.borderGold, backgroundColor: 'rgba(34,21,16,0.7)' },
  emptyPostsTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '900' },
  emptyPostsText: { color: COLORS.textMuted, fontSize: 13, marginTop: 4 },
});
