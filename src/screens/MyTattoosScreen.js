import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { deleteTattoo } from '../database/db';
import { isHealed, getStage, getStageInfo } from '../utils/healingStages';
import { cancelTouchupReminder } from '../utils/notifications';

export default function MyTattoosScreen({ navigation }) {
  const { tattoos, refreshTattoos } = useApp();
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshTattoos();
    }, [])
  );

  const healingTattoos = tattoos.filter((t) => !isHealed(t.date_tattooed));
  const healedTattoos = tattoos.filter((t) => isHealed(t.date_tattooed));

  const handleDelete = useCallback(
    (tattoo) => {
      Alert.alert(
        'Delete Tattoo',
        `Are you sure you want to delete "${tattoo.name}"? This will also delete all care logs and photos. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await cancelTouchupReminder(tattoo.id);
                await deleteTattoo(tattoo.id);
                await refreshTattoos();
              } catch (error) {
                Alert.alert('Error', 'Could not delete tattoo. Please try again.');
              }
            },
          },
        ]
      );
    },
    [refreshTattoos]
  );

  const renderTattooItem = ({ item: tattoo, isHealed: healed }) => {
    const stageKey = getStage(tattoo.date_tattooed);
    const stageInfo = getStageInfo(stageKey);

    let formattedDate = '';
    try {
      formattedDate = format(parseISO(tattoo.date_tattooed), 'MMM d, yyyy');
    } catch {
      formattedDate = tattoo.date_tattooed;
    }

    return (
      <TouchableOpacity
        style={styles.tattooItem}
        onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
        activeOpacity={0.8}
      >
        <View style={styles.itemLeft}>
          {tattoo.thumbnail_uri ? (
            <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Feather name="image" size={18} color={COLORS.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{tattoo.name}</Text>
            {!healed && (
              <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color }]}>
                <Text style={[styles.stageText, { color: stageInfo.color }]}>{stageInfo.name}</Text>
              </View>
            )}
            {healed && (
              <View style={styles.healedBadge}>
                <Feather name="check-circle" size={12} color={COLORS.info} />
                <Text style={styles.healedBadgeText}>Healed</Text>
              </View>
            )}
          </View>

          {tattoo.placement ? (
            <Text style={styles.itemDetail} numberOfLines={1}>{tattoo.placement}</Text>
          ) : null}

          {tattoo.artist_name ? (
            <Text style={styles.itemDetail} numberOfLines={1}>by {tattoo.artist_name}</Text>
          ) : null}

          <View style={styles.itemFooter}>
            {tattoo.style ? (
              <View style={styles.styleChip}>
                <Text style={styles.styleText}>{tattoo.style}</Text>
              </View>
            ) : null}
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>

          {healed && (
            <TouchableOpacity
              style={styles.portfolioBadge}
              onPress={() => navigation.navigate('Portfolio')}
            >
              <Feather name="image" size={11} color={COLORS.info} />
              <Text style={styles.portfolioText}>View in Portfolio</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(tattoo)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="trash-2" size={16} color={COLORS.danger} />
          </TouchableOpacity>
          <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  const allSections = [];
  if (healingTattoos.length > 0) {
    allSections.push({ type: 'header', title: 'Healing' });
    healingTattoos.forEach((t) => allSections.push({ type: 'tattoo', tattoo: t, isHealed: false }));
  }
  if (healedTattoos.length > 0) {
    allSections.push({ type: 'header', title: 'Healed' });
    healedTattoos.forEach((t) => allSections.push({ type: 'tattoo', tattoo: t, isHealed: true }));
  }

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      {tattoos.length === 0 ? (
        <View style={commonStyles.emptyState}>
          <Feather name="layers" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>No tattoos yet</Text>
          <Text style={commonStyles.emptyStateText}>
            Add your first tattoo to start tracking your healing journey.
          </Text>
          <TouchableOpacity
            style={[commonStyles.button, { marginTop: SPACING.md }]}
            onPress={() => navigation.navigate('AddTattoo')}
          >
            <Text style={commonStyles.buttonText}>Add Tattoo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allSections}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.title}` : `tattoo-${item.tattoo.id}`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={commonStyles.sectionHeader}>{item.title}</Text>;
            }
            return renderTattooItem({ item: item.tattoo, isHealed: item.isHealed });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 32,
  },
  tattooItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  itemLeft: {
    marginRight: SPACING.md,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  itemName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    flex: 1,
  },
  stageBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stageText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  healedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.info + '20',
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  healedBadgeText: {
    color: COLORS.info,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  itemDetail: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  styleChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  styleText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  dateText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
  },
  portfolioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  portfolioText: {
    color: COLORS.info,
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    marginTop: SPACING.md,
  },
});
