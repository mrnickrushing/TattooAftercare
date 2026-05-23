import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles } from '../constants/theme';
import { getTattooById, getCareLogsForTattoo, getPhotosForTattoo, deleteTattoo, addPhoto, updateTattoo } from '../database/db';
import { getStage, getStageInfo, isHealed, getDayNumber } from '../utils/healingStages';
import { getJournalPostsForTattoo } from '../utils/journalPosts';
import HealingProgressBar from '../components/HealingProgressBar';
import PhotoComparisonSlider from '../components/PhotoComparisonSlider';
import ShareableCard from '../components/ShareableCard';
import JournalPostCard from '../components/JournalPostCard';
import MilestoneCelebrationModal from '../components/MilestoneCelebrationModal';
import { checkAndSaveMilestone, getUncelebratedMilestones, getAllMilestonesForTattoo } from '../database/socialDb';
import { getMilestoneMeta } from '../utils/milestones';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 240;

export default function TattooDetailScreen({ route, navigation }) {
  const { tattooId } = route.params;
  const [tattoo, setTattoo] = useState(null);
  const [logs, setLogs] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [journalPosts, setJournalPosts] = useState([]);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);
  const [milestoneQueue, setMilestoneQueue] = useState([]);
  const [activeMilestone, setActiveMilestone] = useState(null);
  const [allMilestones, setAllMilestones] = useState([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    const t = await getTattooById(tattooId);
    if (!t) { navigation.goBack(); return; }
    setTattoo(t);
    const l = await getCareLogsForTattoo(tattooId);
    setLogs(l.slice(0, 10));
    const p = await getPhotosForTattoo(tattooId);
    setPhotos(p);
    const jp = await getJournalPostsForTattoo(tattooId);
    setJournalPosts(jp);

    // Milestone check: save any newly reached milestones, then queue uncelebrated ones
    const dayNum = getDayNumber(t.date_tattooed);
    try {
      await checkAndSaveMilestone(tattooId, dayNum);
      const uncelebrated = await getUncelebratedMilestones(tattooId);
      if (uncelebrated.length > 0) {
        setMilestoneQueue(uncelebrated);
        setActiveMilestone(uncelebrated[0]);
      }
      const all = await getAllMilestonesForTattoo(tattooId);
      setAllMilestones(all || []);
    } catch {}
  }, [tattooId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
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

  const handleCreatePost = () => {
    navigation.navigate('CreateJournalPost', { tattoo });
  };

  const handleMilestoneDismiss = () => {
    setActiveMilestone(null);
    const remaining = milestoneQueue.slice(1);
    setMilestoneQueue(remaining);
    if (remaining.length > 0) {
      // Show next milestone after a brief pause
      setTimeout(() => setActiveMilestone(remaining[0]), 400);
    }
    // Reload milestones to update history section
    getAllMilestonesForTattoo(tattooId).then((all) => setAllMilestones(all || [])).catch(() => {});
  };

  const handleReshareMilestone = (milestone) => {
    setActiveMilestone({ ...milestone, _reshare: true });
  };

  if (!tattoo) return <View style={commonStyles.container} />;

  const stageKey = getStage(tattoo.date_tattooed);
  const stageInfo = getStageInfo(stageKey);
  const healed = isHealed(tattoo.date_tattooed);
  const day = getDayNumber(tattoo.date_tattooed);
  let dateStr = '';
  try { dateStr = format(parseISO(tattoo.date_tattooed), 'MMMM d, yyyy'); } catch { dateStr = tattoo.date_tattooed; }
  const finalPhotoUri = photos.length > 0 ? photos[photos.length - 1].uri : null;

  const heroTranslate = scrollY.interpolate({ inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT], outputRange: [HERO_HEIGHT * 0.4, 0, -HERO_HEIGHT * 0.3], extrapolate: 'clamp' });
  const heroScale = scrollY.interpolate({ inputRange: [-HERO_HEIGHT, 0], outputRange: [1.4, 1], extrapolate: 'clamp' });

  return (
    <View style={commonStyles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >

        {/* Hero with parallax */}
        <View style={styles.hero}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: heroTranslate }, { scale: heroScale }] }]}>
            {tattoo.thumbnail_uri ? (
              <Image source={{ uri: tattoo.thumbnail_uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#1A1917', '#2A2822', '#1A1917']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              >
                <View style={styles.heroPlaceholder}>
                  <Text style={styles.heroInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
              </LinearGradient>
            )}
          </Animated.View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            locations={[0.45, 1]}
            style={styles.heroGradientOverlay}
          >
            <Text style={styles.heroName}>{tattoo.name}</Text>
            {tattoo.placement && <Text style={styles.heroPlacement}>{tattoo.placement}</Text>}
          </LinearGradient>
          <View style={[
            styles.stageBadge,
            {
              backgroundColor: stageInfo.color + '33',
              borderColor: stageInfo.color + '66',
              shadowColor: stageInfo.color,
              shadowOpacity: 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
              elevation: 4,
            },
          ]}>
            <Text style={[styles.stageBadgeText, { color: stageInfo.color }]}>{stageInfo.name.toUpperCase()}</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={handleMenuPress} activeOpacity={0.75}>
            <Feather name="more-vertical" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
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

        {/* Milestone History */}
        {allMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>HEALING MILESTONES</Text>
            <View style={styles.milestonesCard}>
              {allMilestones.map((ms, i) => {
                const meta = getMilestoneMeta(ms.milestone_type);
                if (!meta) return null;
                return (
                  <StaggeredRow key={ms.id} index={i}>
                    {i > 0 && <View style={styles.logDivider} />}
                    <TouchableOpacity
                      style={styles.milestoneRow}
                      onPress={() => handleReshareMilestone(ms)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.milestoneEmojiBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
                        <Text style={{ fontSize: 18 }}>{meta.emoji}</Text>
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.milestoneTitle}>{meta.title}</Text>
                        <Text style={styles.milestoneDay}>Day {ms.day_number}</Text>
                      </View>
                      <View style={[styles.milestoneShareBtn, { borderColor: meta.color + '55' }]}>
                        <Feather name="share-2" size={13} color={meta.color} />
                        <Text style={[styles.milestoneShareText, { color: meta.color }]}>Reshare</Text>
                      </View>
                    </TouchableOpacity>
                  </StaggeredRow>
                );
              })}
            </View>
          </View>
        )}

        {/* Journal Posts */}
        {journalPosts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INK JOURNAL</Text>
            {journalPosts.map((post) => (
              <JournalPostCard
                key={post.id}
                post={post}
                onDeleted={(id) => setJournalPosts((prev) => prev.filter((p) => p.id !== id))}
              />
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {/* Create Journal Post — always available */}
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonOutline]} onPress={handleCreatePost} activeOpacity={0.85}>
            <Feather name="edit-3" size={16} color={COLORS.accent} />
            <Text style={styles.actionButtonOutlineText}>Add Journal Post</Text>
          </TouchableOpacity>

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
      </Animated.ScrollView>

      {/* Off-screen share card */}
      {sharing && (
        <View style={styles.offScreen}>
          <ShareableCard ref={shareCardRef} tattoo={tattoo} finalPhotoUri={finalPhotoUri} />
        </View>
      )}

      {/* Milestone celebration modal */}
      {activeMilestone && (
        <MilestoneCelebrationModal
          milestone={activeMilestone}
          tattoo={tattoo}
          onDismiss={handleMilestoneDismiss}
        />
      )}
    </View>
  );
}

function StaggeredRow({ children, index }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 70, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, tension: 70, friction: 10, delay: index * 70, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
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
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroInitial: { color: COLORS.accent, fontSize: 72, fontWeight: '700' },
  heroGradientOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, paddingTop: SPACING.xxl,
  },
  heroName: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700', letterSpacing: -0.3 },
  heroPlacement: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  stageBadge: {
    position: 'absolute', top: SPACING.md, right: SPACING.md,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  stageBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  menuBtn: {
    position: 'absolute', top: SPACING.md, left: SPACING.md,
    width: 32, height: 32, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  infoCell: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, minWidth: '45%', flex: 1,
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  infoCellLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  infoCellValue: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  instagramRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
  instagramText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: SPACING.sm },
  ratingsRow: { flexDirection: 'row', gap: SPACING.sm },
  ratingBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    padding: SPACING.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderGold,
  },
  ratingLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  ratingValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700' },
  ratingMax: { color: COLORS.textMuted, fontSize: 14, fontWeight: '400' },
  photoTimeline: { gap: SPACING.sm, paddingRight: SPACING.lg },
  photoThumbWrap: { alignItems: 'center', gap: 4 },
  photoThumb: {
    width: 72, height: 72, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.borderGold,
    ...SHADOWS.card,
  },
  photoThumbDay: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accentBorder, alignSelf: 'flex-start',
  },
  addPhotoBtnText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
  logsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGold, overflow: 'hidden' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  logDivider: { height: 1, backgroundColor: COLORS.border },
  logDot: { width: 7, height: 7, borderRadius: RADIUS.full },
  logDate: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', width: 50 },
  logIcons: { flexDirection: 'row', gap: SPACING.xs },
  logNote: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
  notesCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGold, padding: SPACING.lg },
  notesText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21 },
  actionsRow: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  actionButton: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    ...SHADOWS.gold,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  actionButtonText: { color: COLORS.textInverse, fontSize: 15, fontWeight: '700' },
  actionButtonOutlineText: { color: COLORS.accent, fontSize: 15, fontWeight: '600' },
  offScreen: { position: 'absolute', top: -9999, left: -9999 },
  milestonesCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGold, overflow: 'hidden' },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  milestoneEmojiBadge: {
    width: 42, height: 42, borderRadius: RADIUS.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  milestoneDay: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  milestoneShareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  milestoneShareText: { fontSize: 11, fontWeight: '700' },
});
