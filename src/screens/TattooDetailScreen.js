import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { COLORS, FONTS, SPACING, RADIUS, commonStyles } from '../constants/theme';
import {
  getTattooById,
  getCareLogsForTattoo,
  getPhotosForTattoo,
  addPhoto,
  updateTattoo,
  deleteTattoo,
} from '../database/db';
import {
  getStage,
  getStageInfo,
  getDayNumber,
  getHealingProgress,
  getDaysUntilHealed,
  isHealed,
} from '../utils/healingStages';
import { scheduleTouchupReminder, cancelTouchupReminder } from '../utils/notifications';
import { useApp } from '../context/AppContext';
import HealingProgressBar from '../components/HealingProgressBar';
import PhotoComparisonSlider from '../components/PhotoComparisonSlider';
import ShareableCard from '../components/ShareableCard';

export default function TattooDetailScreen({ route, navigation }) {
  const { tattooId } = route.params;
  const { refreshTattoos } = useApp();
  const [tattoo, setTattoo] = useState(null);
  const [careLogs, setCareLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const t = await getTattooById(tattooId);
      const logs = await getCareLogsForTattoo(tattooId);
      const p = await getPhotosForTattoo(tattooId);
      setTattoo(t);
      setCareLogs(logs);
      setPhotos(p);
    } catch (error) {
      Alert.alert('Error', 'Could not load tattoo data.');
    } finally {
      setLoading(false);
    }
  }, [tattooId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      const dayNum = getDayNumber(tattoo.date_tattooed);
      try {
        await addPhoto({
          tattoo_id: tattooId,
          uri,
          taken_date: format(new Date(), 'yyyy-MM-dd'),
          day_number: dayNum,
        });
        await loadData();
      } catch {
        Alert.alert('Error', 'Could not save photo.');
      }
    }
  }, [tattoo, tattooId, loadData]);

  const handleToggleTouchupReminder = useCallback(async () => {
    if (!tattoo) return;
    const enabled = tattoo.touchup_reminder_enabled === 1;
    const newValue = enabled ? 0 : 1;

    try {
      await updateTattoo(tattooId, { ...tattoo, touchup_reminder_enabled: newValue });
      if (newValue === 1) {
        await scheduleTouchupReminder(tattooId, tattoo.name, tattoo.date_tattooed);
        Alert.alert('Reminder Set', 'You will be reminded 3 months after your tattoo is healed to consider a touch-up.');
      } else {
        await cancelTouchupReminder(tattooId);
        Alert.alert('Reminder Cancelled', 'Touch-up reminder has been removed.');
      }
      await loadData();
    } catch {
      Alert.alert('Error', 'Could not update reminder.');
    }
  }, [tattoo, tattooId, loadData]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Tattoo',
      `Delete "${tattoo?.name}"? All care logs and photos will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTouchupReminder(tattooId);
              await deleteTattoo(tattooId);
              await refreshTattoos();
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Could not delete tattoo.');
            }
          },
        },
      ]
    );
  }, [tattoo, tattooId, navigation, refreshTattoos]);

  const handleSharePortfolioCard = useCallback(async () => {
    setShowShareCard(true);
    setTimeout(async () => {
      try {
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1.0,
        });
        setShowShareCard(false);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Share ${tattoo?.name} Portfolio Card`,
          });
        } else {
          Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        }
      } catch (error) {
        setShowShareCard(false);
        Alert.alert('Error', 'Could not generate share card.');
      }
    }, 300);
  }, [tattoo]);

  const handleMenuPress = useCallback(() => {
    Alert.alert(tattoo?.name || 'Options', undefined, [
      {
        text: tattoo?.touchup_reminder_enabled ? 'Disable Touch-up Reminder' : 'Enable Touch-up Reminder',
        onPress: handleToggleTouchupReminder,
      },
      {
        text: 'Edit Tattoo',
        onPress: () => navigation.navigate('AddTattoo', { tattooId, editMode: true }),
      },
      { text: 'Delete Tattoo', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [tattoo, handleToggleTouchupReminder, handleDelete, navigation, tattooId]);

  if (loading) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </View>
    );
  }

  if (!tattoo) {
    return (
      <View style={[commonStyles.container, styles.center]}>
        <Text style={styles.errorText}>Tattoo not found.</Text>
      </View>
    );
  }

  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const dayNumber = getDayNumber(tattoo.date_tattooed);
  const healed = isHealed(tattoo.date_tattooed);
  const daysLeft = getDaysUntilHealed(tattoo.date_tattooed);
  const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;

  let formattedDate = '';
  try {
    formattedDate = format(parseISO(tattoo.date_tattooed), 'MMMM d, yyyy');
  } catch {
    formattedDate = tattoo.date_tattooed;
  }

  return (
    <View style={commonStyles.container}>
      {/* Header buttons */}
      <View style={styles.headerButtons}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuBtn}>
          <Feather name="more-vertical" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        {tattoo.thumbnail_uri ? (
          <Image
            source={{ uri: tattoo.thumbnail_uri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Feather name="image" size={40} color={COLORS.textMuted} />
            <Text style={styles.placeholderText}>No photo added</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Title & Info */}
          <View style={styles.titleSection}>
            <Text style={styles.tattooName}>{tattoo.name}</Text>
            <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '22', borderColor: stageInfo.color }]}>
              <Text style={[styles.stageText, { color: stageInfo.color }]}>{stageInfo.name}</Text>
            </View>
          </View>

          {tattoo.placement && <Text style={styles.meta}>{tattoo.placement}</Text>}

          <View style={styles.infoGrid}>
            {tattoo.artist_name && (
              <View style={styles.infoRow}>
                <Feather name="user" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{tattoo.artist_name}</Text>
              </View>
            )}
            {tattoo.artist_instagram && (
              <View style={styles.infoRow}>
                <Feather name="instagram" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>@{tattoo.artist_instagram.replace('@', '')}</Text>
              </View>
            )}
            {tattoo.shop_name && (
              <View style={styles.infoRow}>
                <Feather name="map-pin" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{tattoo.shop_name}</Text>
              </View>
            )}
            {tattoo.style && (
              <View style={styles.infoRow}>
                <Feather name="tag" size={14} color={COLORS.textMuted} />
                <Text style={styles.infoText}>{tattoo.style}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Feather name="calendar" size={14} color={COLORS.textMuted} />
              <Text style={styles.infoText}>{formattedDate}</Text>
            </View>
          </View>

          {/* Pain & Personal Rating */}
          {(tattoo.pain_rating || tattoo.personal_rating) && (
            <View style={styles.ratingsRow}>
              {tattoo.pain_rating && (
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Pain</Text>
                  <Text style={styles.ratingValue}>{tattoo.pain_rating}/10</Text>
                </View>
              )}
              {tattoo.personal_rating && (
                <View style={styles.ratingItem}>
                  <Text style={styles.ratingLabel}>Rating</Text>
                  <Text style={styles.ratingValue}>
                    {'★'.repeat(tattoo.personal_rating)}{'☆'.repeat(5 - tattoo.personal_rating)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Healing Progress */}
          {!healed && (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Healing Progress</Text>
              <HealingProgressBar dateTattooed={tattoo.date_tattooed} />
              <Text style={styles.stageDescription}>{stageInfo.description}</Text>
            </View>
          )}

          {healed && (
            <View style={styles.healedBanner}>
              <Feather name="check-circle" size={20} color={COLORS.info} />
              <Text style={styles.healedText}>Fully Healed</Text>
            </View>
          )}

          {/* Photo Timeline */}
          <View style={styles.photoSection}>
            <Text style={styles.sectionTitle}>Progress Photos</Text>
            {photos.length === 0 ? (
              <View style={styles.photoEmpty}>
                <Text style={styles.photoEmptyText}>No photos yet. Add your first progress photo!</Text>
              </View>
            ) : (
              <>
                <PhotoComparisonSlider photos={photos} style={{ marginBottom: SPACING.md }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {photos.map((p) => (
                    <View key={p.id} style={styles.photoThumb}>
                      <Image source={{ uri: p.uri }} style={styles.thumbImg} />
                      <Text style={styles.thumbLabel}>Day {p.day_number || '?'}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity style={[commonStyles.buttonOutline, styles.addPhotoBtn]} onPress={handleAddPhoto}>
              <Feather name="camera" size={16} color={COLORS.accent} />
              <Text style={commonStyles.buttonOutlineText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          {tattoo.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{tattoo.notes}</Text>
            </View>
          )}

          {/* Care Log History */}
          {careLogs.length > 0 && (
            <View style={styles.logsSection}>
              <Text style={styles.sectionTitle}>Care Log History</Text>
              {careLogs.slice(0, 10).map((log) => {
                let logDate = '';
                try { logDate = format(parseISO(log.log_date), 'MMM d'); } catch { logDate = log.log_date; }
                const statusColor = log.health_status === 'doctor' ? COLORS.danger : log.health_status === 'attention' ? COLORS.warning : COLORS.success;
                return (
                  <View key={log.id} style={styles.logRow}>
                    <Text style={styles.logDate}>{logDate}</Text>
                    <View style={styles.logIcons}>
                      {log.washed ? <Feather name="droplet" size={14} color={COLORS.info} /> : null}
                      {log.moisturized ? <Feather name="activity" size={14} color={COLORS.success} /> : null}
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  </View>
                );
              })}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={commonStyles.button}
              onPress={() => navigation.navigate('CareLog', { tattooId })}
            >
              <Text style={commonStyles.buttonText}>Log Today's Care</Text>
            </TouchableOpacity>

            {healed && (
              <TouchableOpacity
                style={[commonStyles.buttonOutline, { marginTop: SPACING.sm }]}
                onPress={handleSharePortfolioCard}
              >
                <Text style={commonStyles.buttonOutlineText}>Share Portfolio Card</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Off-screen ShareableCard for capture */}
      {showShareCard && (
        <View style={styles.offScreen}>
          <ShareableCard ref={shareCardRef} tattoo={tattoo} finalPhoto={latestPhoto} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    zIndex: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.full,
    padding: SPACING.sm,
  },
  menuBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: RADIUS.full,
    padding: SPACING.sm,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroImage: {
    width: '100%',
    height: 260,
    backgroundColor: COLORS.surface,
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  tattooName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.heavy,
    flex: 1,
  },
  stageBadge: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  stageText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
    marginTop: -SPACING.sm,
  },
  infoGrid: {
    gap: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  ratingItem: {
    gap: 4,
  },
  ratingLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ratingValue: {
    color: COLORS.accent,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  progressSection: {
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    marginBottom: 4,
  },
  stageDescription: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
  },
  healedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.info + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.info + '40',
  },
  healedText: {
    color: COLORS.info,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  photoSection: {
    gap: SPACING.sm,
  },
  photoEmpty: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  photoEmptyText: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
  },
  photoThumb: {
    marginRight: SPACING.sm,
    alignItems: 'center',
  },
  thumbImg: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  thumbLabel: {
    color: COLORS.textMuted,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  notesSection: {},
  notesText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    lineHeight: 20,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  logsSection: {
    gap: SPACING.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  logDate: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.sm,
    width: 48,
  },
  logIcons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.sizes.md,
  },
  offScreen: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    opacity: 0,
  },
});
