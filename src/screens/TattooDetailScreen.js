import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Dimensions, Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { getTattooById, getCareLogsForTattoo, getPhotosForTattoo, deleteTattoo, addPhoto, updateTattoo } from '../database/db';
import { getStage, getStageInfo, isHealed, getDayNumber } from '../utils/healingStages';
import HealingProgressBar from '../components/HealingProgressBar';
import PhotoComparisonSlider from '../components/PhotoComparisonSlider';
import ShareableCard from '../components/ShareableCard';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 240;

export default function TattooDetailScreen({ route, navigation }) {
  const { tattooId } = route.params;
  const [tattoo, setTattoo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);

  const loadData = useCallback(async () => {
    const t = await getTattooById(tattooId);
    if (!t) { navigation.goBack(); return; }
    setTattoo(t);
    const l = await getCareLogsForTattoo(tattooId);
    setLogs(l.slice(0, 10));
    const p = await getPhotosForTattoo(tattooId);
    setPhotos(p);
  }, [tattooId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const day = getDayNumber(tattoo.date_tattooed);
      const today = format(new Date(), 'yyyy-MM-dd');
      await addPhoto({ tattoo_id: tattooId, uri, taken_date: today, day_number: day });
      if (!tattoo.thumbnail_uri) await updateTattoo(tattooId, { thumbnail_uri: uri });
      await loadData();
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setTimeout(async () => {
      try {
        const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
        await Sharing.shareAsync(uri);
      } catch (e) {
        Alert.alert('Could not share', e.message);
      } finally {
        setSharing(false);
      }
    }, 300);
  };

  const handleDelete = () => {
    Alert.alert('Delete Tattoo', `Remove "${tattoo?.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteTattoo(tattooId);
          navigation.goBack();
        },
      },
    ]);
  };

  const handleMenuPress = () => {
    Alert.alert(tattoo?.name, 'Choose an action', [
      { text: 'Delete', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (!tattoo) return <View style={commonStyles.container} />;

  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const healed = isHealed(tattoo.date_tattooed);
  const day = getDayNumber(tattoo.date_tattooed);
  let dateStr = '';
  try { dateStr = format(parseISO(tattoo.date_tattooed), 'MMMM d, yyyy'); } catch { dateStr = tattoo.date_tattooed; }
  const finalPhoto = photos.length > 0 ? photos[photos.length - 1].uri : null;

  return (
    <View style={commonStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          {tattoo.thumbnail_uri ? (
            <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={styles.heroInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroName}>{tattoo.name}</Text>
            {tattoo.placement && <Text style={styles.heroPlacement}>{tattoo.placement}</Text>}
          </View>
          <View style={[styles.stageBadge, { backgroundColor: stageInfo.color + '33', borderColor: stageInfo.color + '66' }]}>
            <Text style={[styles.stageBadgeText, { color: stageInfo.color }]}>{stageInfo.name.toUpperCase()}</Text>
          </View>
        </View>

        {/* Info grid */}
        <View style={styles.infoGrid}>
          {tattoo.artist_name && <InfoCell label="Artist" value={tattoo.artist_name} />}
          {tattoo.shop_name && <InfoCell label="Shop" value={tattoo.shop_name} />}
          {tattoo.style && <InfoCell label="Style" value={tattoo.style} />}
          <InfoCell label="Date" value={dateStr} />
        </View>

        {tattoo.artist_instagram && (
          <View style={styles.instagramRow}>
            <Feather name="instagram" size={14} color={COLORS.accent} />
            <Text style={styles.instagramText}>@{tattoo.artist_instagram}</Text>
          </View>
        )}

        {/* Progress */}
        {!healed && (
          <View style={styles.section}>
            <HealingProgressBar dateTattooed={tattoo.date_tattooed} />
          </View>
        )}

        {/* Ratings */}
        {(tattoo.pain_rating || tattoo.personal_rating) && (
          <View style={styles.section}>
            <View style={styles.ratingsRow}>
              {tattoo.pain_rating > 0 && (
                <View style={styles.ratingBox}>
                  <Text style={styles.ratingLabel}>PAIN</Text>
                  <Text style={styles.ratingValue}>{tattoo.pain_rating}<Text style={styles.ratingMax}>/10</Text></Text>
                </View>
              )}
              {tattoo.personal_rating > 0 && (
                <View style={styles.ratingBox}>
                  <Text style={styles.ratingLabel}>RATING</Text>
                  <Text style={styles.ratingValue}>{tattoo.personal_rating}<Text style={styles.ratingMax}>/5</Text></Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Photo comparison */}
        {photos.length >= 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PHOTO COMPARISON</Text>
            <PhotoComparisonSlider photos={photos} />
          </View>
        )}

        {/* Photo timeline */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PHOTO TIMELINE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoTimeline}>
              {photos.map((p) => (
                <View key={p.id} style={styles.photoThumbWrap}>
                  <Image source={{ uri: p.uri }} style={styles.photoThumb} />
                  <Text style={styles.photoThumbDay}>Day {p.day_number}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} activeOpacity={0.75}>
          <Feather name="camera" size={16} color={COLORS.accent} />
          <Text style={styles.addPhotoBtnText}>Add Photo</Text>
        </TouchableOpacity>

        {/* Care history */}
        {logs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CARE HISTORY</Text>
            <View style={styles.logsCard}>
              {logs.map((log, i) => {
                let logDate = log.log_date;
                try { logDate = format(parseISO(log.log_date), 'MMM d'); } catch {}
                const sc = log.health_status === 'doctor' ? COLORS.danger : log.health_status === 'attention' ? COLORS.warning : COLORS.success;
                return (
                  <View key={log.id}>
                    {i > 0 && <View style={styles.logDivider} />}
                    <View style={styles.logRow}>
                      <View style={[styles.logDot, { backgroundColor: sc }]} />
                      <Text style={styles.logDate}>{logDate}</Text>
                      <View style={styles.logIcons}>
                        {log.washed === 1 && <Feather name="droplet" size={13} color={COLORS.info} />}
                        {log.moisturized === 1 && <Feather name="wind" size={13} color={COLORS.success} />}
                      </View>
                      {log.notes ? <Text style={styles.logNote} numberOfLines={1}>{log.notes}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Notes */}
        {tattoo.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{tattoo.notes}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {!healed && (
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CareLog')} activeOpacity={0.85}>
              <Feather name="clipboard" size={16} color={COLORS.textInverse} />
              <Text style={styles.actionButtonText}>Log Today's Care</Text>
            </TouchableOpacity>
          )}
          {healed && (
            <TouchableOpacity style={[styles.actionButton, sharing && { opacity: 0.6 }]} onPress={handleShare} disabled={sharing} activeOpacity={0.85}>
              <Feather name="share-2" size={16} color={COLORS.textInverse} />
              <Text style={styles.actionButtonText}>{sharing ? 'Preparing...' : 'Share Portfolio Card'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Off-screen share card */}
      {sharing && (
        <View style={styles.offScreen}>
          <ShareableCard ref={shareCardRef} tattoo={tattoo} finalPhoto={finalPhoto} />
        </View>
      )}
    </View>
  );
}

function InfoCell({ label, value }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={styles.infoCellValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 120 },
  hero: { height: HERO_HEIGHT, position: 'relative', overflow: 'hidden', marginBottom: SPACING.lg },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  heroInitial: { color: COLORS.accent, fontSize: 72, fontWeight: '700' },
  heroOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: SPACING.lg },
  heroName: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  heroPlacement: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  stageBadge: { position: 'absolute', top: SPACING.md, right: SPACING.md, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  stageBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  infoCell: { backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, minWidth: '45%', flex: 1, borderWidth: 1, borderColor: COLORS.border },
  infoCellLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  infoCellValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  instagramRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  instagramText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  ratingsRow: { flexDirection: 'row', gap: SPACING.sm },
  ratingBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  ratingLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  ratingValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700' },
  ratingMax: { color: COLORS.textMuted, fontSize: 14, fontWeight: '400' },
  photoTimeline: { gap: SPACING.sm, paddingRight: SPACING.lg },
  photoThumbWrap: { alignItems: 'center', gap: 4 },
  photoThumb: { width: 72, height: 72, borderRadius: RADIUS.md },
  photoThumbDay: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginHorizontal: SPACING.lg, marginBottom: SPACING.xl, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accentBorder, alignSelf: 'flex-start' },
  addPhotoBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  logsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  logDivider: { height: 1, backgroundColor: COLORS.border },
  logDot: { width: 7, height: 7, borderRadius: RADIUS.full },
  logDate: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', width: 50 },
  logIcons: { flexDirection: 'row', gap: SPACING.xs },
  logNote: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  notesCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg },
  notesText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  actionsRow: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  actionButton: { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, ...SHADOWS.gold },
  actionButtonText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700' },
  offScreen: { position: 'absolute', top: -9999, left: -9999 },
});
