import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { format, parseISO } from 'date-fns';

const ShareableCard = React.forwardRef(function ShareableCard({ tattoo, finalPhoto }, ref) {
  let formattedDate = '';
  try {
    formattedDate = format(parseISO(tattoo.date_tattooed), 'MMMM d, yyyy');
  } catch {
    formattedDate = tattoo.date_tattooed;
  }

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Photo */}
      {finalPhoto ? (
        <Image
          source={{ uri: finalPhoto.uri }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : tattoo.thumbnail_uri ? (
        <Image
          source={{ uri: tattoo.thumbnail_uri }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>✦</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.accentLine} />
        <Text style={styles.tattooName}>{tattoo.name}</Text>

        {tattoo.placement ? (
          <Text style={styles.placement}>{tattoo.placement}</Text>
        ) : null}

        {tattoo.artist_name ? (
          <View style={styles.artistRow}>
            <Text style={styles.artistLabel}>Artist</Text>
            <Text style={styles.artistValue}>
              {tattoo.artist_name}
              {tattoo.artist_instagram ? `  @${tattoo.artist_instagram.replace('@', '')}` : ''}
            </Text>
          </View>
        ) : null}

        {tattoo.shop_name ? (
          <View style={styles.artistRow}>
            <Text style={styles.artistLabel}>Shop</Text>
            <Text style={styles.artistValue}>{tattoo.shop_name}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {tattoo.style ? (
            <View style={styles.styleChip}>
              <Text style={styles.styleText}>{tattoo.style}</Text>
            </View>
          ) : null}
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>Tattoo Aftercare App</Text>
        </View>
      </View>
    </View>
  );
});

export default ShareableCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D0D0D',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    width: 340,
  },
  photo: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.surface,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: COLORS.accent,
    fontSize: 48,
  },
  content: {
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  accentLine: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.xs,
  },
  tattooName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.heavy,
    lineHeight: 30,
  },
  placement: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  artistLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    width: 36,
  },
  artistValue: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  styleChip: {
    backgroundColor: COLORS.accent + '20',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accent + '60',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  styleText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  watermark: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    alignItems: 'center',
  },
  watermarkText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
