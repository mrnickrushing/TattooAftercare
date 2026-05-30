import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Platform, Dimensions, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import AppleSignInButton from '../components/AppleSignInButton';

const { width, height } = Dimensions.get('window');

export default function LandingScreen({ navigation }) {
  const { continueAsGuest } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0D0603', '#1A0F0A', '#221510']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative top border strip */}
      <View style={styles.topStrip} />

      <SafeAreaView style={styles.safe}>
        {/* Logo + branding */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRing}>
            <Image
              source={require('../../assets/blood-raven-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>TATTOO{'\n'}AFTERCARE</Text>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Feather name="star" size={10} color={COLORS.accent} style={styles.dividerStar} />
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.tagline}>Track your healing.{'\n'}Honor your ink.</Text>
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
          <AppleSignInButton navigation={navigation} />

          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SignUp')}
          >
            <LinearGradient
              colors={[COLORS.accent, '#A88840']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Feather name="user-plus" size={16} color={COLORS.textInverse} style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Feather name="log-in" size={16} color={COLORS.accent} style={styles.btnIcon} />
            <Text style={styles.secondaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            activeOpacity={0.65}
            onPress={continueAsGuest}
          >
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom legal */}
        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </SafeAreaView>

      {/* Decorative bottom border strip */}
      <View style={styles.bottomStrip} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 12 },
  topStrip: {
    height: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.7,
  },
  bottomStrip: {
    height: 3,
    backgroundColor: COLORS.accent,
    opacity: 0.7,
  },

  hero: { alignItems: 'center', marginTop: height * 0.06 },
  logoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
    backgroundColor: 'rgba(200,169,81,0.06)',
  },
  logo: { width: 80, height: 80 },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    width: 180,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.accent, opacity: 0.4 },
  dividerStar: { marginHorizontal: 8 },
  tagline: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    letterSpacing: 1.2,
    lineHeight: 22,
  },

  actions: { width: '100%', gap: 12, marginBottom: 8 },

  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  primaryBtnText: {
    color: COLORS.textInverse,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(200,169,81,0.06)',
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  btnIcon: { marginRight: 8 },

  guestBtn: { alignItems: 'center', paddingVertical: 10 },
  guestBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
  },

  legal: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 4,
    lineHeight: 15,
  },
});
