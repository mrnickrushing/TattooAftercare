import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { HEALING_STAGES, FAQS } from '../constants/healingContent';
import { getStage, isHealed } from '../utils/healingStages';

export default function LearnScreen() {
  const { tattoos } = useApp();
  const [expandedStage, setExpandedStage] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const activeTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const currentStageKey = activeTattoos.length > 0 ? getStage(activeTattoos[0].date_tattooed) : null;

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Healing Guide</Text>
          <Text style={styles.headerSub}>Everything you need to know, stage by stage.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HEALING STAGES</Text>
          {HEALING_STAGES.map((stage) => {
            const isExpanded = expandedStage === stage.key;
            const isCurrent = currentStageKey === stage.key;
            return (
              <View key={stage.key} style={[styles.stageCard, isCurrent && styles.stageCardCurrent]}>
                {isCurrent && <View style={styles.currentAccent} />}
                <TouchableOpacity
                  style={styles.stageHeader}
                  onPress={() => setExpandedStage(isExpanded ? null : stage.key)}
                  activeOpacity={0.75}
                >
                  <View style={styles.stageHeaderLeft}>
                    <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                    <View>
                      <View style={styles.stageTitleRow}>
                        <Text style={styles.stageName}>{stage.name}</Text>
                        {isCurrent && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>CURRENT</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.stageTimeframe}>{stage.timeframe}</Text>
                    </View>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.stageBody}>
                    <View style={styles.divider} />
                    <Text style={styles.stageDescription}>{stage.description}</Text>
                    {stage.doList?.length > 0 && (
                      <View style={styles.listSection}>
                        <Text style={styles.listLabel}>DO</Text>
                        {stage.doList.map((item, i) => (
                          <View key={i} style={styles.listRow}>
                            <Text style={[styles.listBullet, { color: COLORS.success }]}>✓</Text>
                            <Text style={styles.listText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {stage.dontList?.length > 0 && (
                      <View style={styles.listSection}>
                        <Text style={styles.listLabel}>DON'T</Text>
                        {stage.dontList.map((item, i) => (
                          <View key={i} style={styles.listRow}>
                            <Text style={[styles.listBullet, { color: COLORS.danger }]}>✗</Text>
                            <Text style={styles.listText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {stage.tips?.length > 0 && (
                      <View style={styles.listSection}>
                        <Text style={styles.listLabel}>TIPS</Text>
                        {stage.tips.map((item, i) => (
                          <View key={i} style={styles.listRow}>
                            <Text style={[styles.listBullet, { color: COLORS.accent }]}>·</Text>
                            <Text style={styles.listText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAQ</Text>
          {FAQS.map((faq, i) => {
            const isExpanded = expandedFaq === i;
            return (
              <TouchableOpacity
                key={i} style={styles.faqCard}
                onPress={() => setExpandedFaq(isExpanded ? null : i)}
                activeOpacity={0.75}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.textMuted} />
                </View>
                {isExpanded && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.faqAnswer}>{faq.answer}</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  headerTitle: { ...FONTS.displayMedium, marginBottom: 4 },
  headerSub: { ...FONTS.body },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  stageCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  stageCardCurrent: { borderColor: COLORS.accentBorder },
  currentAccent: { height: 2, backgroundColor: COLORS.accent },
  stageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg },
  stageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  stageDot: { width: 10, height: 10, borderRadius: RADIUS.full },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stageName: { ...FONTS.headingSmall },
  currentBadge: { backgroundColor: COLORS.accentMuted, borderRadius: RADIUS.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.accentBorder },
  currentBadgeText: { color: COLORS.accent, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  stageTimeframe: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  stageBody: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.md },
  stageDescription: { ...FONTS.body, marginBottom: SPACING.md },
  listSection: { marginBottom: SPACING.md },
  listLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.0, textTransform: 'uppercase', marginBottom: SPACING.xs },
  listRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 4 },
  listBullet: { fontSize: 14, fontWeight: '700', width: 14, marginTop: 2 },
  listText: { ...FONTS.bodySmall, flex: 1 },
  faqCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACING.md },
  faqQuestion: { ...FONTS.headingSmall, flex: 1 },
  faqAnswer: { ...FONTS.body },
});
