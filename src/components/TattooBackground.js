/**
 * TattooBackground.js
 * Full-screen background with a traditional tattoo flash aesthetic:
 * — Warm espresso/brown base gradient
 * — Subtle SVG tattoo motifs (panther, dagger, rose, swallow, anchor, skull, heart)
 *   tiled as a faint watermark pattern
 * — Vignette darkening at edges
 *
 * Usage:
 *   <TattooBackground>
 *     {/* your screen content *}
 *   </TattooBackground>
 *
 * Or for screens that need a LinearGradient as the root:
 *   import { BACKGROUND_GRADIENT } from './TattooBackground';
 */
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { COLORS } from '../constants/theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Exported gradient config so LinearGradient screens can match
export const BACKGROUND_GRADIENT = {
  colors: ['#1F1108', '#1A0F0A', '#160D09', '#1A0F0A'],
  locations: [0, 0.3, 0.65, 1],
};

// ── Traditional flash motifs as minimal SVG ──────────────────────────────────
// Each is a single clean outline glyph at ~60×60px, drawn at very low opacity.

const PANTHER_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- simplified panther head outline -->
  <ellipse cx="30" cy="28" rx="16" ry="14" stroke="#C8A951" stroke-width="1.2" fill="none"/>
  <ellipse cx="22" cy="18" rx="5" ry="7" stroke="#C8A951" stroke-width="1.1" fill="none"/>
  <ellipse cx="38" cy="18" rx="5" ry="7" stroke="#C8A951" stroke-width="1.1" fill="none"/>
  <circle cx="24" cy="27" r="3" stroke="#C8A951" stroke-width="1" fill="none"/>
  <circle cx="36" cy="27" r="3" stroke="#C8A951" stroke-width="1" fill="none"/>
  <path d="M27 33 Q30 36 33 33" stroke="#C8A951" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M20 30 L14 28 M20 32 L13 33" stroke="#C8A951" stroke-width="0.8" stroke-linecap="round"/>
  <path d="M40 30 L46 28 M40 32 L47 33" stroke="#C8A951" stroke-width="0.8" stroke-linecap="round"/>
</svg>
`;

const DAGGER_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- classic dagger -->
  <path d="M30 5 L34 22 L30 26 L26 22 Z" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <rect x="24" y="26" width="12" height="5" rx="1" stroke="#C8A951" stroke-width="1.1" fill="none"/>
  <path d="M28 31 L28 52 Q30 55 32 52 L32 31" stroke="#C8A951" stroke-width="1.1" fill="none" stroke-linejoin="round"/>
  <path d="M26 38 L22 40 M34 38 L38 40" stroke="#C8A951" stroke-width="0.9" stroke-linecap="round"/>
</svg>
`;

const ROSE_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- traditional rose -->
  <circle cx="30" cy="22" r="10" stroke="#C8A951" stroke-width="1.2" fill="none"/>
  <path d="M24 18 Q30 14 36 18 Q32 15 30 18 Q28 15 24 18" stroke="#C8A951" stroke-width="1" fill="none"/>
  <path d="M21 24 Q18 22 20 18 Q22 16 24 18" stroke="#C8A951" stroke-width="1" fill="none"/>
  <path d="M39 24 Q42 22 40 18 Q38 16 36 18" stroke="#C8A951" stroke-width="1" fill="none"/>
  <path d="M27 32 Q28 38 27 46 M33 32 Q32 38 33 46" stroke="#C8A951" stroke-width="1.1" stroke-linecap="round" fill="none"/>
  <path d="M27 40 Q24 38 23 42 Q27 44 28 42" stroke="#C8A951" stroke-width="0.9" fill="none"/>
  <path d="M33 38 Q36 36 37 40 Q33 42 32 40" stroke="#C8A951" stroke-width="0.9" fill="none"/>
  <path d="M28 32 L32 32" stroke="#C8A951" stroke-width="1" stroke-linecap="round"/>
</svg>
`;

const SWALLOW_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- classic swallow in flight -->
  <path d="M30 28 Q20 20 8 24 Q16 26 20 30 Q14 34 10 40 Q20 32 30 35" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <path d="M30 28 Q40 20 52 24 Q44 26 40 30 Q46 34 50 40 Q40 32 30 35" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <ellipse cx="30" cy="27" rx="4" ry="3" stroke="#C8A951" stroke-width="1" fill="none"/>
  <path d="M32 26 L35 23" stroke="#C8A951" stroke-width="0.9" stroke-linecap="round"/>
</svg>
`;

const ANCHOR_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- traditional anchor -->
  <circle cx="30" cy="14" r="5" stroke="#C8A951" stroke-width="1.2" fill="none"/>
  <line x1="30" y1="19" x2="30" y2="50" stroke="#C8A951" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M18 28 L42 28" stroke="#C8A951" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M18 50 Q18 42 30 50 Q42 42 42 50" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  <circle cx="18" cy="28" r="2" stroke="#C8A951" stroke-width="1" fill="none"/>
  <circle cx="42" cy="28" r="2" stroke="#C8A951" stroke-width="1" fill="none"/>
</svg>
`;

const SKULL_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- classic skull -->
  <path d="M15 32 Q14 18 30 14 Q46 18 45 32 Q45 38 40 40 L40 46 L20 46 L20 40 Q15 38 15 32Z" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <circle cx="23" cy="30" r="5" stroke="#C8A951" stroke-width="1.1" fill="none"/>
  <circle cx="37" cy="30" r="5" stroke="#C8A951" stroke-width="1.1" fill="none"/>
  <path d="M27 42 L27 46 M30 41 L30 46 M33 42 L33 46" stroke="#C8A951" stroke-width="1" stroke-linecap="round"/>
  <path d="M25 46 L35 46" stroke="#C8A951" stroke-width="1" stroke-linecap="round"/>
  <path d="M27 36 Q30 38 33 36" stroke="#C8A951" stroke-width="0.9" fill="none" stroke-linecap="round"/>
</svg>
`;

const HEART_SVG = `
<svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- traditional sacred heart -->
  <path d="M30 48 Q10 34 10 22 Q10 12 20 12 Q26 12 30 18 Q34 12 40 12 Q50 12 50 22 Q50 34 30 48Z" stroke="#C8A951" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <path d="M22 16 Q18 20 18 25" stroke="#C8A951" stroke-width="0.9" fill="none" stroke-linecap="round"/>
  <!-- flames on top -->
  <path d="M24 12 Q22 8 25 6 Q23 10 27 10 Q25 7 28 5 Q27 9 30 8 Q29 5 32 5 Q31 9 33 10 Q36 10 34 6 Q37 8 35 12" stroke="#C8A951" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- crown -->
  <path d="M20 18 L20 14 L24 17 L30 13 L36 17 L40 14 L40 18" stroke="#C8A951" stroke-width="1" fill="none" stroke-linejoin="round"/>
</svg>
`;

// Layout: tile motifs in a loose grid across the screen
// Each motif placed at specific fractional positions for visual spread
const MOTIF_GRID = [
  { svg: PANTHER_SVG,  x: 0.04, y: 0.04,  size: 58, opacity: 0.07 },
  { svg: SWALLOW_SVG,  x: 0.62, y: 0.02,  size: 62, opacity: 0.06 },
  { svg: ANCHOR_SVG,   x: 0.82, y: 0.14,  size: 52, opacity: 0.065 },
  { svg: DAGGER_SVG,   x: 0.00, y: 0.25,  size: 56, opacity: 0.055 },
  { svg: ROSE_SVG,     x: 0.38, y: 0.18,  size: 60, opacity: 0.07 },
  { svg: HEART_SVG,    x: 0.76, y: 0.35,  size: 54, opacity: 0.065 },
  { svg: SKULL_SVG,    x: 0.10, y: 0.48,  size: 58, opacity: 0.06 },
  { svg: SWALLOW_SVG,  x: 0.52, y: 0.44,  size: 56, opacity: 0.055 },
  { svg: ANCHOR_SVG,   x: 0.82, y: 0.56,  size: 50, opacity: 0.05 },
  { svg: PANTHER_SVG,  x: 0.28, y: 0.62,  size: 60, opacity: 0.06 },
  { svg: DAGGER_SVG,   x: 0.70, y: 0.70,  size: 54, opacity: 0.055 },
  { svg: ROSE_SVG,     x: 0.04, y: 0.74,  size: 58, opacity: 0.065 },
  { svg: HEART_SVG,    x: 0.48, y: 0.78,  size: 52, opacity: 0.07 },
  { svg: SKULL_SVG,    x: 0.82, y: 0.84,  size: 56, opacity: 0.055 },
  { svg: SWALLOW_SVG,  x: 0.18, y: 0.88,  size: 60, opacity: 0.06 },
  { svg: ANCHOR_SVG,   x: 0.60, y: 0.92,  size: 54, opacity: 0.065 },
  // Second sparse pass — rotated positions
  { svg: DAGGER_SVG,   x: 0.44, y: 0.06,  size: 48, opacity: 0.04 },
  { svg: SKULL_SVG,    x: 0.20, y: 0.32,  size: 50, opacity: 0.04 },
  { svg: HEART_SVG,    x: 0.88, y: 0.47,  size: 46, opacity: 0.04 },
  { svg: ROSE_SVG,     x: 0.34, y: 0.86,  size: 50, opacity: 0.04 },
];

export default function TattooBackground({ children, style }) {
  return (
    <View style={[styles.root, style]}>
      {/* Warm gradient base */}
      <LinearGradient
        colors={BACKGROUND_GRADIENT.colors}
        locations={BACKGROUND_GRADIENT.locations}
        style={StyleSheet.absoluteFill}
      />

      {/* Traditional flash motifs — faint watermark layer */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {MOTIF_GRID.map((m, i) => (
          <View
            key={i}
            style={[
              styles.motif,
              {
                left: m.x * SW,
                top: m.y * SH,
                width: m.size,
                height: m.size,
                opacity: m.opacity,
              },
            ]}
          >
            <SvgXml xml={m.svg} width={m.size} height={m.size} />
          </View>
        ))}
      </View>

      {/* Vignette — darkens the corners and edges */}
      <LinearGradient
        colors={['rgba(10,5,2,0.55)', 'transparent', 'transparent', 'rgba(10,5,2,0.6)']}
        locations={[0, 0.25, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  motif: { position: 'absolute' },
});
