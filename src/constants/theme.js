import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#0C0B08',
  surface: '#141410',
  card: '#1C1B16',
  cardElevated: '#232218',
  border: '#2A2820',
  borderLight: '#333228',
  borderGold: 'rgba(200,169,81,0.18)',

  accent: '#C8A951',
  accentDim: '#8B7535',
  accentMuted: 'rgba(200,169,81,0.12)',
  accentBorder: 'rgba(200,169,81,0.3)',

  textPrimary: '#F5F5F0',
  textSecondary: '#A0A090',
  textMuted: '#585548',
  textInverse: '#0C0B08',

  success: '#4CAF7D',
  successMuted: 'rgba(76,175,125,0.15)',
  warning: '#E09452',
  warningMuted: 'rgba(224,148,82,0.15)',
  danger: '#E05252',
  dangerMuted: 'rgba(224,82,82,0.15)',
  info: '#5292C0',

  stageColors: {
    fresh: '#E05252',
    early: '#E09452',
    peeling: '#C8A951',
    settling: '#4CAF7D',
    healed: '#5292C0',
  },

  tabBar: 'transparent',
  tabBarActive: '#C8A951',
  tabBarInactive: '#555548',
  tabBarBorder: 'rgba(200,169,81,0.15)',
};

export const FONTS = {
  displayLarge: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, color: COLORS.textPrimary },
  displayMedium: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, color: COLORS.textPrimary },
  headingLarge: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, color: COLORS.textPrimary },
  headingMedium: { fontSize: 18, fontWeight: '600', letterSpacing: -0.1, color: COLORS.textPrimary },
  headingSmall: { fontSize: 15, fontWeight: '600', letterSpacing: 0, color: COLORS.textPrimary },
  labelLarge: { fontSize: 13, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: COLORS.textSecondary },
  labelSmall: { fontSize: 11, fontWeight: '600', letterSpacing: 1.0, textTransform: 'uppercase', color: COLORS.textMuted },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22, color: COLORS.textSecondary },
  bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 19, color: COLORS.textSecondary },

  sizes: {
    xs: 11, sm: 13, md: 15, lg: 18, xl: 22, xxl: 28, xxxl: 34,
  },
  weights: {
    regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800',
  },
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 };

export const SHADOWS = {
  card: {
    shadowColor: '#C8A951',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 8,
  },
  cardDeep: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  gold: {
    shadowColor: '#C8A951',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  goldStrong: {
    shadowColor: '#C8A951',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
  },
  surface: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
});
