import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, RefreshControl, Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, commonStyles, TAB_BAR_HEIGHT } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { isHealed } from '../utils/healingStages';
import { getPhotosForTattoo } from '../database/db';
import ShareableCard from '../components/ShareableCard';
import JournalPostCard from '../components/JournalPostCard';
import { getAllJournalPosts } from '../utils/journalPosts';
import { Feather } from '@expo/vector-icons';
import TattooBackground from '../components/TattooBackground';
import ScreenHero from '../components/ScreenHero';

const { width } = Dimensions.get('window');
const CELL_SIZE = (width - SPACING.lg * 2 - SPACING.sm) / 2;

export default function PortfolioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { tattoos, refreshTattoos } = useApp();
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [sharingTattoo, setSharingTattoo] = useState(null);
  const [sharePhoto, setSharePhoto] = useState(null);
  const shareCardRef = useRef(null);
  const [journalPosts, setJournalPosts] = useState([]);
  const [journalTab, setJournalTab] = useState('portfolio');

  const loadJournalPosts = useCallback(async () => {
    const posts = await getAllJournalPosts();
    setJournalPosts(posts);
  }, []);

  useFocusEffect(useCallback(() => {
    refreshTattoos();
    loadJournalPosts();
  }, [loadJournalPosts]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshTattoos();
    await loadJournalPosts();
    setRefreshing(false);
  }, [loadJournalPosts]);

  const healed = tattoos.filter((t) => isHealed(t.date_tattooed));
  const stylesSet = [...new Set(healed.map((t) => t.style).filter(Boolean))];
  const filters = ['All', ...stylesSet];
  const filtered = filter === 'All' ? healed : healed.filter((t) => t.style === filter);
  const totalArtists = new Set(healed.map((t) => t.artist_name).filter(Boolean)).size;
  const coverTattoo = healed.find((t) => t.thumbnail_uri) || healed[0] || null;
  const bottomPad = insets.bottom + TAB_BAR_HEIGHT + SPACING.xxxl;

  const handleLongPress = async (tattoo) => {
    try {
      const photos = await getPhotosForTattoo(tattoo.id);
      const finalPhoto = photos.length > 0 ? photos[photos.length - 1].uri : tattoo.thumbnail_uri;
      setSharingTattoo(tattoo);
      setSharePhoto(finalPhoto);
      setTimeout(async () => {
        try {
          const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
          await Sharing.shareAsync(uri);
        } catch (e) {
          Alert.alert('Could not share', e.message);
        } finally {
          setSharingTattoo(null);
          setSharePhoto(null);
        }
      }, 400);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <TattooBackground style={commonStyles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + SPACING.lg, paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHero
          eyebrow="Portfolio"
          title="Your healed work deserves a gallery."
          subtitle="Hold any tattoo card to make a shareable portfolio image. Keep healed pieces and journal posts together."
          icon="image"
          stats={[
            { label: 'Tattoos', value: healed.length },
            { label: 'Artists', value: totalArtists || 0 },
            { label: 'Posts', value: journalPosts.length },
          ]}
        />

        {coverTattoo ? (
          <TouchableOpacity
            style={styles.coverCard}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('TattooDetail', { tattooId: coverTattoo.id })}
            onLongPress={() => handleLongPress(coverTattoo)}
          >
            {coverTattoo.thumbnail_uri ? (
              <Image source={{ uri: coverTattoo.thumbnail_uri }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverImage, styles.coverPlaceholder]}><Text style={styles.coverInitial}>{coverTattoo.name?.[0]?.toUpperCase() || '?'}</Text></View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={styles.coverOverlay} />
            <View style={styles.coverMeta}>
              <Text style={styles.coverLabel}>Gallery cover</Text>
              <Text style={styles.coverTitle} numberOfLines={1}>{coverTattoo.name}</Text>
              <Text style={styles.coverSub} numberOfLines={1}>{coverTattoo.artist_name ? `by ${coverTattoo.artist_name}` : coverTattoo.style || 'Healed tattoo'}</Text>
            </View>
            <View style={styles.holdHint}><Text style={styles.holdHintText}>Hold to share</Text></View>
          </TouchableOpacity>
        ) : null}

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBtn, journalTab === 'portfolio' && styles.tabBtnActive]} onPress={() => setJournalTab('portfolio')} activeOpacity={0.75}>
            <Feather name="image" size={14} color={journalTab === 'portfolio' ? COLORS.textInverse : COLORS.textMuted} />
            <Text style={[styles.tabBtnText, journalTab === 'portfolio' && styles.tabBtnTextActive]}>Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, journalTab === 'journal' && styles.tabBtnActive]} onPress={() => setJournalTab('journal')} activeOpacity={0.75}>
            <Feather name="edit-3" size={14} color={journalTab === 'journal' ? COLORS.textInverse : COLORS.textMuted} />
            <Text style={[styles.tabBtnText, journalTab === 'journal' && styles.tabBtnTextActive]}>Ink Journal {journalPosts.length > 0 ? `(${journalPosts.length})` : ''}</Text>
          </TouchableOpacity>
        </View>

        {journalTab === 'portfolio' ? (
          <>
            {filters.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
                {filters.map((f) => (
                  <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)} activeOpacity={0.7}>
                    <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {healed.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}><Text style={styles.emptyIcon}>🖼️</Text></View>
                <Text style={styles.emptyTitle}>Portfolio is empty</Text>
                <Text style={styles.emptySubtitle}>Your healed tattoos will appear here when the healing journey is complete.</Text>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.emptyStateCompact}><Text style={styles.emptySubtitle}>No tattoos in this style.</Text></View>
            ) : (
              <View style={styles.grid}>
                {filtered.map((tattoo, index) => (
                  <GridCell
                    key={tattoo.id}
                    tattoo={tattoo}
                    tall={index % 5 === 0}
                    onPress={() => navigation.navigate('TattooDetail', { tattooId: tattoo.id })}
                    onLongPress={() => handleLongPress(tattoo)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.journalSection}>
            {journalPosts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrap}><Text style={styles.emptyIcon}>✏️</Text></View>
                <Text style={styles.emptyTitle}>No journal posts yet</Text>
                <Text style={styles.emptySubtitle}>Open any tattoo and add a journal post to share your healing story.</Text>
              </View>
            ) : (
              journalPosts.map((post) => (
                <JournalPostCard key={post.id} post={post} onDeleted={(id) => setJournalPosts((prev) => prev.filter((p) => p.id !== id))} />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {sharingTattoo && (
        <View style={styles.offScreen}>
          <ShareableCard ref={shareCardRef} tattoo={sharingTattoo} finalPhotoUri={sharePhoto} />
        </View>
      )}
    </TattooBackground>
  );
}

function GridCell({ tattoo, onPress, onLongPress, tall }) {
  return (
    <TouchableOpacity style={[styles.cell, tall && styles.cellTall]} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.85} delayLongPress={400}>
      {tattoo.thumbnail_uri ? (
        <Image source={{ uri: tattoo.thumbnail_uri }} style={styles.cellImage} />
      ) : (
        <View style={styles.cellPlaceholder}><Text style={styles.cellInitial}>{tattoo.name?.[0]?.toUpperCase() || '?'}</Text></View>
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.cellOverlay} />
      <View style={styles.cellMeta}>
        <Text style={styles.cellName} numberOfLines={1}>{tattoo.name}</Text>
        <Text style={styles.cellArtist} numberOfLines={1}>{tattoo.artist_name ? `by ${tattoo.artist_name}` : tattoo.style || 'Healed'}</Text>
      </View>
      <View style={styles.shareHint}><Feather name="share-2" size={12} color={COLORS.accent} /></View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: SPACING.lg },
  coverCard: { height: 260, borderRadius: RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderGold, backgroundColor: COLORS.card, marginBottom: SPACING.lg, ...SHADOWS.goldStrong },
  coverImage: { width: '100%', height: '100%' },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardElevated },
  coverInitial: { color: COLORS.accent, fontSize: 54, fontWeight: '900' },
  coverOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 },
  coverMeta: { position: 'absolute', left: SPACING.lg, right: SPACING.lg, bottom: SPACING.lg },
  coverLabel: { color: COLORS.accent, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.4 },
  coverTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 4 },
  coverSub: { color: COLORS.textSecondary, fontSize: 13, marginTop: 2 },
  holdHint: { position: 'absolute', top: SPACING.md, right: SPACING.md, backgroundColor: 'rgba(0,0,0,0.62)', borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderWidth: 1, borderColor: COLORS.borderGold },
  holdHintText: { color: COLORS.accent, fontSize: 11, fontWeight: '900' },
  tabRow: { flexDirection: 'row', marginBottom: SPACING.lg, backgroundColor: 'rgba(34,21,16,0.9)', borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.borderGold, overflow: 'hidden' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md },
  tabBtnActive: { backgroundColor: COLORS.accent },
  tabBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '800' },
  tabBtnTextActive: { color: COLORS.textInverse },
  filterBar: { marginBottom: SPACING.lg, marginHorizontal: -SPACING.lg },
  filterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  filterChip: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, backgroundColor: 'rgba(34,21,16,0.9)', borderWidth: 1, borderColor: COLORS.borderGold },
  filterChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, ...SHADOWS.gold },
  filterChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '800' },
  filterChipTextActive: { color: COLORS.textInverse },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  cell: { width: CELL_SIZE, height: CELL_SIZE * 1.15, borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.borderGold, ...SHADOWS.card },
  cellTall: { height: CELL_SIZE * 1.38 },
  cellImage: { width: '100%', height: '100%' },
  cellPlaceholder: { width: '100%', height: '100%', backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  cellInitial: { color: COLORS.accent, fontSize: 36, fontWeight: '900' },
  cellOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 86 },
  cellMeta: { position: 'absolute', bottom: SPACING.sm, left: SPACING.sm, right: SPACING.sm },
  cellName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '900' },
  cellArtist: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  shareHint: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: COLORS.borderGold, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2, paddingHorizontal: SPACING.xl, gap: SPACING.md, backgroundColor: 'rgba(34,21,16,0.72)', borderWidth: 1, borderColor: COLORS.borderGold, borderRadius: RADIUS.xl },
  emptyStateCompact: { alignItems: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl },
  emptyIconWrap: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { ...FONTS.headingLarge, textAlign: 'center' },
  emptySubtitle: { ...FONTS.body, textAlign: 'center' },
  journalSection: { gap: SPACING.md },
  offScreen: { position: 'absolute', top: -9999, left: -9999 },
});
