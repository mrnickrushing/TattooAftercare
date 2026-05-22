/**
 * NestedComments.js
 * Renders a comment thread with top-level comments and nested replies.
 * Supports adding replies inline, delete on long-press.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { saveCommentLocal, deleteCommentLocal } from '../database/socialDb';

function Avatar({ username, size = 28 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.4 }]}>
        {(username || 'U')[0].toUpperCase()}
      </Text>
    </View>
  );
}

function CommentBubble({ comment, onReply, onDelete, depth = 0 }) {
  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true }); } catch {}

  return (
    <View style={[styles.commentWrap, depth > 0 && styles.replyIndent]}>
      {depth > 0 && <View style={styles.replyLine} />}
      <Avatar username={comment.username} size={depth > 0 ? 24 : 30} />
      <View style={{ flex: 1 }}>
        <View style={styles.bubbleHeader}>
          <Text style={styles.commentUsername}>{comment.username || 'You'}</Text>
          <Text style={styles.commentTime}>{timeAgo}</Text>
        </View>
        <TouchableOpacity
          onLongPress={() => {
            Alert.alert('Delete comment?', '', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(comment.id) },
            ]);
          }}
          activeOpacity={0.9}
        >
          <Text style={styles.commentBody}>{comment.body}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply(comment)} style={styles.replyBtn} activeOpacity={0.7}>
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NestedComments({ postId, comments: initialComments, currentUser }) {
  const [comments, setComments] = useState(initialComments || []);
  const [replyingTo, setReplyingTo] = useState(null); // comment object
  const [inputText, setInputText] = useState('');

  const topLevel = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (id) => comments.filter((c) => c.parent_comment_id === id);

  const handleSubmit = async () => {
    const body = inputText.trim();
    if (!body || !currentUser) return;
    const newComment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      post_id: postId,
      user_id: currentUser.id,
      username: currentUser.username || 'You',
      avatar_uri: currentUser.avatar_uri || null,
      body,
      parent_comment_id: replyingTo?.id || null,
      created_at: new Date().toISOString(),
    };
    await saveCommentLocal(newComment);
    setComments((prev) => [...prev, newComment]);
    setInputText('');
    setReplyingTo(null);
  };

  const handleDelete = async (id) => {
    await deleteCommentLocal(id);
    setComments((prev) => prev.filter((c) => c.id !== id && c.parent_comment_id !== id));
  };

  const renderThread = (comment) => (
    <View key={comment.id}>
      <CommentBubble
        comment={comment}
        onReply={setReplyingTo}
        onDelete={handleDelete}
        depth={0}
      />
      {getReplies(comment.id).map((reply) => (
        <CommentBubble
          key={reply.id}
          comment={reply}
          onReply={setReplyingTo}
          onDelete={handleDelete}
          depth={1}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {topLevel.length === 0 && (
        <Text style={styles.emptyComments}>No comments yet. Be the first!</Text>
      )}
      {topLevel.map(renderThread)}

      {/* Input area */}
      <View style={styles.inputSection}>
        {replyingTo && (
          <View style={styles.replyingToBanner}>
            <Feather name="corner-down-right" size={12} color={COLORS.accent} />
            <Text style={styles.replyingToText}>Replying to @{replyingTo.username}</Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ marginLeft: 'auto' }}>
              <Feather name="x" size={14} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <Avatar username={currentUser?.username} size={28} />
          <TextInput
            style={styles.input}
            placeholder={replyingTo ? `Reply to @${replyingTo.username}…` : 'Add a comment…'}
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
            multiline
          />
          <TouchableOpacity onPress={handleSubmit} style={styles.sendBtn} activeOpacity={0.75}>
            <Feather name="send" size={15} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.xs },
  commentWrap: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'flex-start',
  },
  replyIndent: { paddingLeft: SPACING.xl + SPACING.sm, position: 'relative' },
  replyLine: {
    position: 'absolute', left: SPACING.xl - 1,
    top: 0, bottom: 0, width: 1,
    backgroundColor: COLORS.border,
  },
  avatar: {
    backgroundColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: { color: COLORS.accent, fontWeight: '700' },
  bubbleHeader: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center', marginBottom: 2 },
  commentUsername: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  commentTime: { color: COLORS.textMuted, fontSize: 11 },
  commentBody: { color: COLORS.textPrimary, fontSize: 13, lineHeight: 19 },
  replyBtn: { marginTop: 4 },
  replyBtnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
  emptyComments: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: SPACING.lg },
  inputSection: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, gap: SPACING.xs },
  replyingToBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
  },
  replyingToText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  input: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: 13, maxHeight: 80,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: RADIUS.full,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.accentBorder,
  },
});
