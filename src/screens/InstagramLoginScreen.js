/**
 * InstagramLoginScreen.js
 *
 * Stub UI for "Login with Instagram". The full OAuth flow requires a Meta App Review
 * approval (which can take several weeks). This screen explains the status to the user
 * and offers deep-link alternatives in the meantime.
 *
 * When Meta approval is granted, replace the body of handleLogin with:
 *   1. Open the Instagram OAuth URL in a WebView / expo-web-browser
 *   2. Capture the redirect with the auth code
 *   3. Exchange code for access token via your backend
 *   4. Store token and navigate back
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const IG_GRADIENT = ['#833AB4', '#C13584', '#E1306C', '#F56040', '#FFDC80'];

export default function InstagramLoginScreen({ navigation }) {
  const [loading] = useState(false);

  const handleLogin = () => {
    Alert.alert(
      'Instagram Login — Coming Soon',
      'Instagram OAuth requires Meta App Review approval, which is currently in progress.\n\nYou can still link your Instagram handle in your profile settings.',
      [
        {
          text: 'Open Instagram App',
          onPress: () => Linking.openURL('instagram://').catch(() => Linking.openURL('https://www.instagram.com/')),
        },
        {
          text: 'Edit Profile Handle',
          onPress: () => navigation.navigate('UserProfile'),
        },
        { text: 'OK', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={IG_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
        <Feather name="instagram" size={36} color="#fff" />
      </LinearGradient>

      <Text style={styles.title}>Connect Instagram</Text>
      <Text style={styles.subtitle}>
        Link your Instagram account to share healing updates, discover artists, and showcase your ink journey.
      </Text>

      <View style={styles.featureList}>
        {[
          { icon: 'share-2',    text: 'Share healing updates directly to Stories & Feed' },
          { icon: 'user',       text: 'Display your Instagram profile on your public page' },
          { icon: 'search',     text: 'Find tattoo artists via their Instagram handle' },
          { icon: 'image',      text: 'Import your Instagram tattoo photos' },
        ].map(({ icon, text }) => (
          <View key={icon} style={styles.featureRow}>
            <View style={styles.featureIconWrap}>
              <Feather name={icon} size={15} color={COLORS.accent} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.loginBtn, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
        accessibilityLabel="Login with Instagram"
        accessibilityRole="button"
      >
        <LinearGradient colors={IG_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginBtnGradient}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="instagram" size={18} color="#fff" />
              <Text style={styles.loginBtnText}>Login with Instagram</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.statusCard}>
        <Feather name="clock" size={14} color={COLORS.warning} />
        <Text style={styles.statusText}>
          Full OAuth login requires Meta App Review approval — currently pending.
          In the meantime you can link your handle in your profile.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.skipBtn}
        onPress={() => navigation.navigate('UserProfile')}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Link handle instead →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xl, gap: SPACING.xl,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.gold,
  },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  featureList: { width: '100%', gap: SPACING.sm },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  featureIconWrap: {
    width: 30, height: 30, borderRadius: RADIUS.md,
    backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, flex: 1, paddingTop: 5 },
  loginBtn: { width: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  loginBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.lg,
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  statusCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    backgroundColor: COLORS.warningMuted + '44',
    borderRadius: RADIUS.md, padding: SPACING.md,
    borderWidth: 1, borderColor: COLORS.warning + '44', width: '100%',
  },
  statusText: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },
  skipBtn: { paddingVertical: SPACING.sm },
  skipText: { color: COLORS.accent, fontSize: 13, fontWeight: '600' },
});
