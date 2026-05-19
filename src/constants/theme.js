import { StyleSheet } from 'react-native';

export const COLORS = {
  background: '#0D0D0D',
  surface: '#1A1A1A',
  card: '#242424',
  accent: '#C8A951',
  accentDim: '#9A7D3A',

  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',

  danger: '#E05252',
  warning: '#E09452',
  success: '#52C07A',
  info: '#5292C0',

  border: '#2A2A2A',
  borderLight: '#333333',

  stageColors: {
    fresh: '#E05252',
    early: '#E09452',
    peeling: '#C8A951',
    settling: '#52C07A',
    healed: '#5292C0',
  },

  tabBar: '#1A1A1A',
  tabBarActive: '#C8A951',
  tabBarInactive: '#666666',
  tabBarBorder: '#2A2A2A',
};

export const FONTS = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
};

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
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
  textPrimary: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
  },
  textSecondary: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  textMuted: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutlineText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    marginBottom: SPACING.xs,
  },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyStateText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
