import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';
import { format, parseISO } from 'date-fns';

const ShareableCard = React.forwardRef(function ShareableCard({ tattoo, finalPhotoUri }, ref) {
  let formattedDate = '';
  try {
    formattedDate = format(parseISO(tattoo.date_tattooed), 'MMMM d, yyyy');
  } catch {
    formattedDate = tattoo.date_tattooed;
  }

  const photoUri = finalPhotoUri || tattoo.thumbnail_uri;
  const instagram = tattoo.artist_instagram
    ? (tattoo.artist_instagram.startsWith('@') ? tattoo.artist_instagram : '@' + tattoo.artist_instagram)
    : null;

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Photo section */}
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          {/* Dark layered placeholder simulating depth */}
          <View style={styles.placeholderInner} />
          <Text style={styles.photoPlaceholderInitial}>
            {tattoo.name ? tattoo.name.charAt(0).toUpperCase() : '✦'}
          </Text>
        </View>
      )}

      {/* Thin gold divider */}
      <View style={styles.goldDivider} />

      {/* Content */}
      <View style={styles.content}>
        {/* Tattoo name */}
        <Text style={styles.tattooName}>{tattoo.name}</Text>

        {/* Artist & shop row */}
        {(tattoo.artist_name || tattoo.shop_name) && (
          <Text style={styles.artistShopRow}>
            {[tattoo.artist_name, tattoo.shop_name].filter(Boolean).join('  •  ')}
          </Text>
        )}

        {/* Instagram */}
        {instagram ? (
          <Text style={styles.instagram}>{instagram}</Text>
        ) : null}

        {/* Style & placement chips */}
        {(tattoo.style || tattoo.placement) && (
          <View style={styles.chipsRow}>
            {tattoo.style ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{tattoo.style}</Text>
              </View>
            ) : null}
            {tattoo.placement ? (
              <View style={[styles.chip, styles.chipMuted]}>
                <Text style={[styles.chipText, styles.chipTextMuted]}>{tattoo.placement}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Date */}
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Watermark */}
        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>TATTOO AFTERCARE</Text>
        </View>
      </View>
    </View>
  );
});

export default ShareableCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    width: 340,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surface,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholderInner: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.surface,
    opacity: 0.8,
  },
  photoPlaceholderInitial: {
    color: COLORS.accent,
    fontSize: 56,
    fontWeight: '700',
  },
  goldDivider: {
    height: 1,
    backgroundColor: COLORS.accentBorder,
    marginHorizontal: SPACING.xl,
  },
  content: {
    padding: SPACING.xl,
    gap: SPACING.sm,
  },
  tattooName: {
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  artistShopRow: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '400',
  },
  instagram: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  chip: {
    backgroundColor: COLORS.accentMuted,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  chipMuted: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  chipText: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chipTextMuted: {
    color: COLORS.textSecondary,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '400',
    marginTop: 2,
  },
  watermark: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    alignItems: 'center',
  },
  watermarkText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
});
