import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import {
  getLocalPosts, savePostLocal, deleteLocalPost,
  saveCommentLocal, getCommentsForPost, deleteCommentLocal,
  upsertReactionLocal, removeReactionLocal, getMyReaction,
} from '../database/socialDb';
import { getLocalUser } from '../utils/localUser';

const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'ink',  emoji: '💉', label: 'Ink'  },
  { type: 'wow',  emoji: '😮', label: 'Wow'  },
];

export default function SocialFeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [reactionPickerPost, setReactionPickerPost] = useState(null);
  const [myReactions, setMyReactions] = useState({});
  const [postComments, setPostComments] = useState({});
  const me = useRef(null);

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    me.current = await getLocalUser();
    const fetched = await getLocalPosts(40);
    setPosts(fetched);
    // pre-load my reactions for each post
    if (me.current) {
      const rxMap = {};
      for (const p of fetched) {
        const r = await getMyReaction(p.id, me.current.id);
        if (r) rxMap[p.id] = r.reaction_type;
      }
      setMyReactions(rxMap);
    }
    if (!silent) setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadFeed(); }, [loadFeed]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true);
    setRefreshing(false);
  };

  const toggleComments = async (postId) => {
    const next = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: next }));
    if (next && !postComments[postId]) {
      const comments = await getCommentsForPost(postId);
      setPostComments((prev) => ({ ...prev, [postId]: comments }));
    }
  };

  const handleAddComment = async (postId) => {
    const body = (commentInputs[postId] || '').trim();
    if (!body || !me.current) return;
    const comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      post_id: postId,
      user_id: me.current.id,
      username: me.current.username || 'You',
      avatar_uri: me.current.avatar_uri || null,
      body,
      parent_comment_id: null,
      created_at: new Date().toISOString(),
    };
    await saveCommentLocal(comment);
    setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    // bump comment_count on post
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
  };

  const handleReact = async (postId, reactionType) => {
    if (!me.current) return;
    const current = myReactions[postId];
    if (current === reactionType) {
      // toggle off
      await removeReactionLocal(postId, me.current.id);
      setMyReactions((prev) => { const n = { ...prev }; delete n[postId]; return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reaction_count: Math.max(0, (p.reaction_count || 1) - 1) } : p));
    } else {
      await upsertReactionLocal({ id: `${postId}-${me.current.id}`, post_id: postId, user_id: me.current.id, reaction_type: reactionType });
      setMyReactions((prev) => ({ ...prev, [postId]: reactionType }));
      if (!current) setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reaction_count: (p.reaction_count || 0) + 1 } : p));
    }
    setReactionPickerPost(null);
  };

  const renderPost = ({ item: post }) => {
    const myRx = myReactions[post.id];
    const rxEmoji = myRx ? REACTIONS.find((r) => r.type === myRx)?.emoji : null;
    const comments = postComments[post.id] || [];
    const commentsOpen = !!expandedComments[post.id];
    let timeAgo = '';
    try { timeAgo = formatDistanceToNow(parseISO(post.created_at), { addSuffix: true }); } catch {}

    return (
      <View style={styles.postCard}>
        {/* Header */}
        <View style={styles.postHeader}>
          <View style={styles.avatarWrap}>
            {post.avatar_uri
              ? <Image source={{ uri: post.avatar_uri }} style={styles.avatar} />
              : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{(post.username || 'U')[0].toUpperCase()}</Text></View>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.postUsername}>{post.username || 'You'}</Text>
            <Text style={styles.postMeta}>
              {post.healing_day ? `Day ${post.healing_day}` : ''}{post.healing_day && timeAgo ? '  ·  ' : ''}{timeAgo}
            </Text>
          </View>
          {post.visibility && (
            <View style={styles.visibilityBadge}>
              <Text style={styles.visibilityText}>{post.visibility}</Text>
            </View>
          )}
        </View>

        {/* Photos */}
        {post.photo_uris?.length > 0 && (
          <FlatList
            data={post.photo_uris}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item: uri }) => (
              <Image source={{ uri }} style={styles.postPhoto} resizeMode="cover" />
            )}
            style={styles.photoList}
          />
        )}

        {/* Caption */}
        {post.caption ? <Text style={styles.postCaption}>{post.caption}</Text> : null}

        {/* Style tags */}
        {post.style_tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {post.style_tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action bar */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setReactionPickerPost(reactionPickerPost === post.id ? null : post.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.reactionEmoji}>{rxEmoji || '🔥'}</Text>
            <Text style={[styles.actionCount, myRx && { color: COLORS.accent }]}>
              {post.reaction_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleComments(post.id)} activeOpacity={0.75}>
            <Feather name="message-circle" size={18} color={commentsOpen ? COLORS.accent : COLORS.textMuted} />
            <Text style={[styles.actionCount, commentsOpen && { color: COLORS.accent }]}>
              {post.comment_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75}>
            <Feather name="share-2" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Reaction picker */}
        {reactionPickerPost === post.id && (
          <View style={styles.reactionPicker}>
            {REACTIONS.map((r) => (
              <TouchableOpacity
                key={r.type}
                style={[styles.reactionPickerBtn, myRx === r.type && styles.reactionPickerBtnActive]}
                onPress={() => handleReact(post.id, r.type)}
                activeOpacity={0.75}
              >
                <Text style={styles.reactionPickerEmoji}>{r.emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comments */}
        {commentsOpen && (
          <View style={styles.commentsSection}>
            {comments.map((c) => (
              <View key={c.id} style={styles.commentRow}>
                <View style={styles.commentAvatarSmall}>
                  <Text style={styles.commentAvatarInitial}>{(c.username || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUsername}>{c.username || 'You'}</Text>
                  <Text style={styles.commentBody}>{c.body}</Text>
                </View>
              </View>
            ))}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment…"
                  placeholderTextColor={COLORS.textMuted}
                  value={commentInputs[post.id] || ''}
                  onChangeText={(v) => setCommentInputs((prev) => ({ ...prev, [post.id]: v }))}
                  returnKeyType="send"
                  onSubmitEditing={() => handleAddComment(post.id)}
                />
                <TouchableOpacity onPress={() => handleAddComment(post.id)} style={styles.commentSendBtn} activeOpacity={0.75}>
                  <Feather name="send" size={16} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💉</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyBody}>Open a tattoo and tap "Add Journal Post" to share your healing journey.</Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : { paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  postCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  avatarWrap: { width: 38, height: 38 },
  avatar: { width: 38, height: 38, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderGold },
  avatarFallback: {
    width: 38, height: 38, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  postUsername: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  postMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  visibilityBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visibilityText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  photoList: { width: '100%' },
  postPhoto: { width: 340, height: 300 },
  postCaption: { color: COLORS.textPrimary, fontSize: 14, lineHeight: 20, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  tagChip: {
    backgroundColor: COLORS.accentBorder + '33',
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  tagText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  actionBar: {
    flexDirection: 'row',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reactionEmoji: { fontSize: 18 },
  actionCount: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  reactionPicker: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reactionPickerBtn: {
    width: 44, height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  reactionPickerBtnActive: { backgroundColor: COLORS.accentBorder + '55', borderWidth: 1, borderColor: COLORS.accent },
  reactionPickerEmoji: { fontSize: 22 },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  commentRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' },
  commentAvatarSmall: {
    width: 26, height: 26, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarInitial: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  commentUsername: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 1 },
  commentBody: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 18 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentSendBtn: {
    width: 36, height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentBorder + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyBody: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
});
