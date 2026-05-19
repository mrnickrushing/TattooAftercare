import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { STAGES, FAQS } from '../constants/healingContent';
import { useApp } from '../context/AppContext';
import { getStage } from '../utils/healingStages';

function StageCard({ stage, isActive }) {
  const [expanded, setExpanded] = useState(isActive);

  return (
    <View style={[styles.card, isActive && styles.activeCard]}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
          <View>
            <Text style={styles.stageName}>{stage.name}</Text>
            <Text style={styles.timeframe}>{stage.timeframe}</Text>
          </View>
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Current</Text>
            </View>
          )}
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.description}>{stage.description}</Text>

          <Text style={styles.sectionLabel}>DO</Text>
          {stage.doList.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <View style={[styles.listDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>DON'T</Text>
          {stage.dontList.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <View style={[styles.listDot, { backgroundColor: COLORS.danger }]} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}

          {stage.tips && stage.tips.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>TIPS</Text>
              {stage.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipIcon}>💡</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function FaqItem({ faq }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.faqQuestion}>{faq.question}</Text>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.faqBody}>
          <Text style={styles.faqAnswer}>{faq.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function LearnScreen() {
  const { activeTattoos } = useApp();
  const currentStageKey = activeTattoos.length > 0
    ? getStage(activeTattoos[0].date_tattooed)
    : null;

  return (
    <ScrollView
      style={commonStyles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionHeader}>HEALING GUIDE</Text>
      {currentStageKey && (
        <View style={styles.currentBanner}>
          <Feather name="info" size={14} color={COLORS.accent} />
          <Text style={styles.currentBannerText}>
            Your active tattoo is highlighted below
          </Text>
        </View>
      )}

      {STAGES.map((stage) => (
        <StageCard
          key={stage.key}
          stage={stage}
          isActive={stage.key === currentStageKey}
        />
      ))}

      <Text style={[styles.sectionHeader, { marginTop: SPACING.xl }]}>FAQ</Text>
      {FAQS.map((faq, i) => (
        <FaqItem key={i} faq={faq} />
      ))}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
  },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.accent + '18',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  currentBannerText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  activeCard: {
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  stageDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stageName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  timeframe: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: COLORS.accent + '22',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: COLORS.accent + '55',
    marginLeft: SPACING.xs,
  },
  activeBadgeText: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  cardBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    marginVertical: SPACING.md,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  listText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
    flex: 1,
  },
  tipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs + 2,
  },
  tipIcon: {
    fontSize: 13,
    flexShrink: 0,
  },
  tipText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 18,
    flex: 1,
  },
  faqCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  faqQuestion: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    flex: 1,
    lineHeight: 20,
  },
  faqBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  faqAnswer: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
});
