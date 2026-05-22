import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { deleteJournalPost, updateJournalPost } from '../utils/journalPosts';

const VISIBILITY_ICONS = { public: 'globe', friends: 'users', private: 'lock' };
const VISIBILITY_LABELS = { public: 'Public', friends: 'Friends', private: 'Only Me' };
const VISIBILITY_CYCLE = { public: 'friends', friends: 'private', private: 'public' };

export default function JournalPostCard({ post, onDeleted }) {
  const mainPhoto = post.photo_uris?.[0] || null;
  const [visibility, setVisibility] = useState(post.visibility || 'friends');

  let timeAgo = '';
  try { timeAgo = formatDistanceToNow(parseISO(post.created_at), { addSuffix: true }); } catch {}

  const handleDelete = () => {
    Alert.alert('Delete Post', 'Remove this journal post permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteJournalPost(post.id);
          onDeleted && onDeleted(post.id);
        },
      },
    ]);
  };

  const handleVisibilityChange = async () => {
    const next = VISIBILITY_CYCLE[visibility] || 'friends';
    await updateJournalPost(post.id, { visibility: next });
    setVisibility(next);
  };

  return (
    <View style={styles.card}>
      {mainPhoto && (
        <Image source={{ uri: mainPhoto }} style={styles.photo} resizeMode="cover" />
      )}

      <View style={styles.body}>
        {/* Day stamp */}
        <View style={styles.stampRow}>
          <View style={styles.dayStamp}>
            <Feather name="activity" size={11} color={COLORS.accent} />
            <Text style={styles.dayStampText}>Day {post.day_number}</Text>
          </View>
          <TouchableOpacity
            style={styles.visibilityBadge}
            onPress={handleVisibilityChange}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name={VISIBILITY_ICONS[visibility] || 'users'} size={10} color={COLORS.accent} />
            <Text style={styles.visibilityText}>{VISIBILITY_LABELS[visibility] || 'Friends'}</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {!!post.caption && (
          <Text style={styles.caption}>{post.caption}</Text>
        )}

        {/* Artist tag */}
        {!!post.artist_tag && (
          <View style={styles.artistRow}>
            <Feather name="user" size={12} color={COLORS.accentDim} />
            <Text style={styles.artistTag}>{post.artist_tag}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="trash-2" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  body: {
    padding: SPACING.lg,
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  dayStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  dayStampText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visibilityText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  caption: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    marginBottom: SPACING.sm,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  artistTag: {
    color: COLORS.accentDim,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  timeAgo: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '400',
  },
});
