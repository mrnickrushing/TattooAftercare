/**
 * SocialFeedScreen.js  — Issue #16 + #17
 *
 * Fixes:
 *  - Bug #2: Empty state "Find Friends" button called navigation.navigate('Explore')
 *    which fails from inside ProfileStack. Fixed to use navigation.getParent()?.navigate('ExploreTab').
 *  - Bug #7: updatePostReactionCount was opening a brand new SQLite connection on every
 *    reaction instead of using the shared singleton. Fixed to import and use getDB from socialDb.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, RefreshControl, Animated, Alert, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import EmptyState from '../components/EmptyState';
import ImageWithLoading from '../components/ImageWithLoading';
import {
  getLocalPosts, deleteLocalPost,
  saveCommentLocal, getCommentsForPost, deleteCommentLocal,
  upsertReactionLocal, removeReactionLocal, getMyReaction,
  getLocalUser, createNotification,
  getDB,
} from '../database/socialDb';

// Bug #7 fix: use the shared DB singleton instead of opening a new connection
async function updatePostReactionCount(postId, delta) {
  try {
    const db = await getDB();
    await db.runAsync(
      'UPDATE posts SET reaction_count = MAX(0, reaction_count + ?), updated_at = datetime(\'now\') WHERE id = ?',
      [delta, postId]
    );
  } catch (e) {
    console.warn('updatePostReactionCount:', e);
  }
}

// Issue #17: exactly 3 reaction types
const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'ink',  emoji: '💉', label: 'Ink'  },
];

function SpringReactionPicker({ reactions, myReaction, onReact }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 130, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[reactionPickerStyle, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      {reactions.map((r) => (
        <TouchableOpacity
          key={r.type}
          style={[reactionBtnStyle, myReaction === r.type && reactionBtnActiveStyle]}
          onPress={() => onReact(r.type)}
          activeOpacity={0.75}
        >
          <Text style={{ fontSize: 22 }}>{r.emoji}</Text>
          <Text style={reactionLabelStyle}>{r.label}</Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
}

function AnimatedReactionCount({ value, style }) {
  const animVal = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(animVal, { toValue: value, duration: 300, useNativeDriver: false }).start();
    return () => animVal.removeListener(listener);
  }, [value]);
  return <Text style={style}>{display}</Text>;
}

// Inline styles for the spring picker (avoid StyleSheet reference before it's declared)
const reactionPickerStyle = { flexDirection: 'row', padding: 8, gap: 8, justifyContent: 'center' };
const reactionBtnStyle = { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', gap: 4 };
const reactionBtnActiveStyle = { backgroundColor: 'rgba(200,169,81,0.18)' };
const reactionLabelStyle = { color: '#999', fontSize: 11, fontWeight: '600' };

export default function SocialFeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [replyingTo, setReplyingTo] = useState({}); // { postId: { commentId, username } }
  const [reactionPickerPost, setReactionPickerPost] = useState(null);
  const [myReactions, setMyReactions] = useState({});
  const [postComments, setPostComments] = useState({});
  const [healingQuestionPost, setHealingQuestionPost] = useState({}); // postId -> bool
  const me = useRef(null);

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    me.current = await getLocalUser();
    const fetched = await getLocalPosts(40);
    setPosts(fetched);
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

  // ─── Reactions ──────────────────────────────────────────────────────────────

  const handleReact = async (postId, reactionType) => {
    if (!me.current) return;
    const existing = myReactions[postId];

    if (existing === reactionType) {
      await removeReactionLocal(postId, me.current.id);
      await updatePostReactionCount(postId, -1);
      setMyReactions((prev) => { const n = { ...prev }; delete n[postId]; return n; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reaction_count: Math.max(0, (p.reaction_count || 0) - 1) } : p));
    } else {
      const id = `rxn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await upsertReactionLocal({ id, post_id: postId, user_id: me.current.id, reaction_type: reactionType });
      const delta = existing ? 0 : 1;
      if (delta > 0) {
        await updatePostReactionCount(postId, 1);
        const post = posts.find((p) => p.id === postId);
        if (post && post.user_id && post.user_id !== me.current.id) {
          const rxn = REACTIONS.find((r) => r.type === reactionType);
          await createNotification({
            userId: post.user_id,
            type: 'reaction',
            actorId: me.current.id,
            refId: postId,
            body: `@${me.current.username || 'Someone'} reacted ${rxn?.emoji || ''} to your post.`,
          });
        }
      }
      setMyReactions((prev) => ({ ...prev, [postId]: reactionType }));
      if (delta > 0) setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, reaction_count: (p.reaction_count || 0) + 1 } : p));
    }
    setReactionPickerPost(null);
  };

  // ─── Comments ───────────────────────────────────────────────────────────────

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
    const parentInfo = replyingTo[postId];
    const isHealingQ = !!healingQuestionPost[postId];
    const commentBody = isHealingQ ? `[healing] ${body}` : body;
    const comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      post_id: postId,
      user_id: me.current.id,
      username: me.current.username || 'You',
      avatar_uri: me.current.avatar_uri || null,
      body: commentBody,
      parent_comment_id: parentInfo?.commentId || null,
      created_at: new Date().toISOString(),
    };
    await saveCommentLocal(comment);
    setPostComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    setReplyingTo((prev) => { const n = { ...prev }; delete n[postId]; return n; });
    setHealingQuestionPost((prev) => { const n = { ...prev }; delete n[postId]; return n; });
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
    const post = posts.find((p) => p.id === postId);
    if (post && post.user_id && post.user_id !== me.current.id) {
      await createNotification({
        userId: post.user_id,
        type: 'comment',
        actorId: me.current.id,
        refId: postId,
        body: `@${me.current.username || 'Someone'} commented: "${body.slice(0, 60)}${body.length > 60 ? '…' : ''}"`,
      });
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    Alert.alert('Delete comment?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteCommentLocal(commentId);
          setPostComments((prev) => ({
            ...prev,
            [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
          }));
          setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p));
        },
      },
    ]);
  };

  const handleReplyTo = (postId, commentId, username) => {
    setReplyingTo((prev) => ({ ...prev, [postId]: { commentId, username } }));
    setCommentInputs((prev) => ({ ...prev, [postId]: `@${username} ` }));
  };

  // ─── Delete post ────────────────────────────────────────────────────────────

  const handleLongPressPost = (post) => {
    if (post.user_id !== me.current?.id) return;
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteLocalPost(post.id);
          setPosts((prev) => prev.filter((p) => p.id !== post.id));
        },
      },
    ]);
  };

  // ─── Share post ─────────────────────────────────────────────────────────────

  const handleSharePost = async (post) => {
    try {
      const dayLabel = post.healing_day ? ` — Day ${post.healing_day}` : '';
      await Share.share({
        message: `${post.caption || 'Check out my tattoo healing journey'}${dayLabel} 💉 #TattooAftercare`,
      });
    } catch (e) {
      // User dismissed share sheet — no-op
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <EmptyState
          icon="💉"
          title="Your feed is empty"
          body="Posts from the people you follow will appear here."
          action={{
            label: 'Find Friends in Explore',
            // Bug #2 fix: navigate to ExploreTab from a cross-stack context
            onPress: () => navigation.getParent()?.navigate('ExploreTab'),
          }}
        >
          <Text style={styles.emptyHint}>
            Or open a tattoo → Add Journal Post to share your own healing story.
          </Text>
        </EmptyState>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={8}
        initialNumToRender={6}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.accent} />
        }
        renderItem={({ item: post }) => {
          const myRx = myReactions[post.id];
          const rxEmoji = REACTIONS.find((r) => r.type === myRx)?.emoji;
          const comments = postComments[post.id] || [];
          const topComments = comments.filter((c) => !c.parent_comment_id);
          const repliesFor = (parentId) => comments.filter((c) => c.parent_comment_id === parentId);
          const isMyPost = post.user_id === me.current?.id;
          const replyInfo = replyingTo[post.id];

          let timeAgo = '';
          try { timeAgo = formatDistanceToNow(parseISO(post.created_at), { addSuffix: true }); } catch {}

          return (
            <TouchableOpacity
              activeOpacity={0.98}
              onLongPress={() => handleLongPressPost(post)}
              delayLongPress={600}
              accessibilityLabel={`Post by ${post.username || 'user'}${post.caption ? `: ${post.caption.slice(0, 60)}` : ''}`}
              accessibilityRole="button"
            >
              <View style={styles.postCard}>
                {/* Header */}
                <View style={styles.postHeader}>
                  <View style={styles.postAvatarWrap}>
                    {post.avatar_uri
                      ? <Image source={{ uri: post.avatar_uri }} style={styles.postAvatar} />
                      : (
                        <View style={styles.postAvatarFallback}>
                          <Text style={styles.postAvatarInitial}>
                            {(post.username || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                  </View>
                  <View style={styles.postHeaderMeta}>
                    <Text style={styles.postUsername}>{post.username || 'Ink Artist'}</Text>
                    <Text style={styles.postTime}>
                      {post.healing_day ? `Day ${post.healing_day}` : ''}
                      {post.healing_day && timeAgo ? '  ·  ' : ''}
                      {timeAgo}
                    </Text>
                  </View>
                  {isMyPost && (
                    <TouchableOpacity
                      style={styles.postMenuBtn}
                      onPress={() => handleLongPressPost(post)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Photos */}
                {post.photo_uris?.length > 0 && (
                  <ImageWithLoading
                    source={{ uri: post.photo_uris[0] }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}

                {/* Style tags */}
                {post.style_tags?.length > 0 && (
                  <View style={styles.postStyleTags}>
                    {post.style_tags.map((tag) => (
                      <View key={tag} style={styles.postStyleTag}>
                        <Text style={styles.postStyleTagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Caption */}
                {post.caption ? <Text style={styles.postCaption}>{post.caption}</Text> : null}

                {/* Action bar */}
                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() =>
                      setReactionPickerPost((prev) => (prev === post.id ? null : post.id))
                    }
                    activeOpacity={0.75}
                    accessibilityLabel={`React to post, ${post.reaction_count || 0} reactions`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.actionBtnEmoji}>{rxEmoji || '🔥'}</Text>
                    <AnimatedReactionCount value={post.reaction_count || 0} style={[styles.actionBtnText, myRx && styles.actionBtnTextActive]} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => toggleComments(post.id)}
                    activeOpacity={0.75}
                    accessibilityLabel={`${expandedComments[post.id] ? 'Hide' : 'Show'} comments, ${post.comment_count || 0} comments`}
                    accessibilityRole="button"
                  >
                    <Feather name="message-circle" size={18} color={COLORS.textMuted} />
                    <Text style={styles.actionBtnText}>{post.comment_count || 0}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleSharePost(post)}
                    activeOpacity={0.75}
                  >
                    <Feather name="share" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Reaction picker */}
                {reactionPickerPost === post.id && (
                  <SpringReactionPicker
                    reactions={REACTIONS}
                    myReaction={myRx}
                    onReact={(type) => handleReact(post.id, type)}
                  />
                )}

                {/* Comments section */}
                {expandedComments[post.id] && (
                  <View style={styles.commentsSection}>
                    {topComments.map((comment) => (
                      <View key={comment.id}>
                        {(() => {
                          const isHealingComment = comment.body?.startsWith('[healing] ');
                          const displayBody = isHealingComment
                            ? comment.body.replace('[healing] ', '')
                            : comment.body;
                          return (
                            <View style={[styles.commentRow, isHealingComment && styles.healingCommentRow]}>
                              <View style={styles.commentAvatarFallback}>
                                <Text style={styles.commentAvatarInitial}>
                                  {(comment.username || 'U')[0].toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.commentContent}>
                                {isHealingComment && (
                                  <View style={styles.healingBadge}>
                                    <Text style={styles.healingBadgeText}>💉 How's it healing?</Text>
                                  </View>
                                )}
                                <Text style={styles.commentUsername}>{comment.username || 'User'}</Text>
                                <Text style={[styles.commentBody, isHealingComment && styles.healingCommentBody]}>
                                  {displayBody}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleReplyTo(post.id, comment.id, comment.username || 'user')}
                                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                >
                                  <Text style={styles.replyBtn}>Reply</Text>
                                </TouchableOpacity>
                              </View>
                              {comment.user_id === me.current?.id && (
                                <TouchableOpacity
                                  onPress={() => handleDeleteComment(post.id, comment.id)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Feather name="x" size={12} color={COLORS.textMuted} />
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })()}

                        {repliesFor(comment.id).map((reply) => (
                          <View key={reply.id} style={styles.replyRow}>
                            <View style={styles.replyIndent} />
                            <View style={styles.commentAvatarFallbackSm}>
                              <Text style={styles.commentAvatarInitialSm}>
                                {(reply.username || 'U')[0].toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.commentContent}>
                              <Text style={styles.commentUsername}>{reply.username || 'User'}</Text>
                              <Text style={styles.commentBody}>{reply.body}</Text>
                            </View>
                            {reply.user_id === me.current?.id && (
                              <TouchableOpacity
                                onPress={() => handleDeleteComment(post.id, reply.id)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Feather name="x" size={12} color={COLORS.textMuted} />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}

                    <View style={styles.commentInputRow}>
                      {replyInfo && (
                        <View style={styles.replyingToBanner}>
                          <Text style={styles.replyingToText}>Replying to @{replyInfo.username}</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setReplyingTo((prev) => { const n = { ...prev }; delete n[post.id]; return n; });
                              setCommentInputs((prev) => ({ ...prev, [post.id]: '' }));
                            }}
                          >
                            <Feather name="x" size={12} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        </View>
                      )}
                      {!replyInfo && (
                        <TouchableOpacity
                          style={[
                            styles.healingToggle,
                            healingQuestionPost[post.id] && styles.healingToggleActive,
                          ]}
                          onPress={() =>
                            setHealingQuestionPost((prev) => ({
                              ...prev,
                              [post.id]: !prev[post.id],
                            }))
                          }
                          activeOpacity={0.75}
                        >
                          <Text style={styles.healingToggleText}>
                            💉 {healingQuestionPost[post.id] ? "How's it healing? ✓" : "How's it healing?"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <View style={styles.commentInputWrap}>
                        <TextInput
                          style={styles.commentInput}
                          value={commentInputs[post.id] || ''}
                          onChangeText={(v) =>
                            setCommentInputs((prev) => ({ ...prev, [post.id]: v }))
                          }
                          placeholder={
                            healingQuestionPost[post.id]
                              ? "How's it healing? Describe the progress…"
                              : replyInfo
                              ? `Reply to @${replyInfo.username}…`
                              : 'Add a comment…'
                          }
                          placeholderTextColor={COLORS.textMuted}
                          returnKeyType="send"
                          onSubmitEditing={() => handleAddComment(post.id)}
                          blurOnSubmit={false}
                        />
                        <TouchableOpacity
                          onPress={() => handleAddComment(post.id)}
                          disabled={!(commentInputs[post.id] || '').trim()}
                          style={styles.sendBtn}
                        >
                          <Feather
                            name="send"
                            size={16}
                            color={(commentInputs[post.id] || '').trim() ? COLORS.accent : COLORS.textMuted}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  list: { paddingBottom: 120 },
  emptyHint: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', maxWidth: 240, lineHeight: 18 },
  postCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  postHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: SPACING.md, gap: SPACING.sm,
  },
  postAvatarWrap: { flexShrink: 0 },
  postAvatar: { width: 36, height: 36, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.accentBorder },
  postAvatarFallback: {
    width: 36, height: 36, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  postAvatarInitial: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  postHeaderMeta: { flex: 1 },
  postUsername: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  postTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  postMenuBtn: { padding: SPACING.xs },
  postImage: { width: '100%', aspectRatio: 1.2 },
  postStyleTags: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm,
  },
  postStyleTag: {
    backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: COLORS.accentBorder,
  },
  postStyleTagText: { color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  postCaption: {
    color: COLORS.textSecondary, fontSize: 14, lineHeight: 20,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  postActions: {
    flexDirection: 'row', gap: SPACING.lg,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  actionBtnEmoji: { fontSize: 18 },
  actionBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  actionBtnTextActive: { color: COLORS.accent },
  reactionPicker: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  reactionBtn: {
    alignItems: 'center', gap: 2,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  reactionBtnActive: { backgroundColor: COLORS.accentMuted },
  reactionEmoji: { fontSize: 24 },
  reactionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  commentsSection: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  commentRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.sm,
  },
  replyRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, gap: SPACING.sm,
  },
  replyIndent: { width: 20 },
  commentAvatarFallback: {
    width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarInitial: { color: COLORS.accent, fontSize: 11, fontWeight: '700' },
  commentAvatarFallbackSm: {
    width: 22, height: 22, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  commentAvatarInitialSm: { color: COLORS.accent, fontSize: 9, fontWeight: '700' },
  commentContent: { flex: 1, gap: 2 },
  commentUsername: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  commentBody: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 18 },
  replyBtn: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  commentInputRow: {
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, paddingTop: SPACING.xs, gap: SPACING.xs,
  },
  replyingToBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm, paddingVertical: 3,
    backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.sm,
  },
  replyingToText: { color: COLORS.accent, fontSize: 11, fontWeight: '600' },
  commentInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  commentInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13, paddingVertical: SPACING.sm },
  sendBtn: { padding: SPACING.xs },
  healingCommentRow: {
    backgroundColor: 'rgba(200,169,81,0.06)',
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  healingBadge: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 3,
  },
  healingBadgeText: {
    color: COLORS.accent, fontSize: 10, fontWeight: '700', letterSpacing: 0.3,
  },
  healingCommentBody: { color: COLORS.textPrimary },
  healingToggle: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.xs,
  },
  healingToggleActive: {
    backgroundColor: COLORS.accentMuted, borderColor: COLORS.accentBorder,
  },
  healingToggleText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
});
