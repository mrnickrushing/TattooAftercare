#!/usr/bin/env node
/**
 * Generates app icon assets for Tattoo Aftercare.
 * Run: node generate-icon.js
 * Requires: npm install --save-dev sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'assets');

// Tattoo machine SVG — rotary machine silhouette in gold on dark
const machineSvg = (size, padding = 0.15) => {
  const p = size * padding;
  const w = size - p * 2;
  const cx = size / 2;
  const cy = size / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.18}"/>

  <!-- Machine body (main housing) — angled rectangle -->
  <g transform="translate(${cx}, ${cy}) rotate(-12)">
    <!-- Main body -->
    <rect x="${-w * 0.22}" y="${-w * 0.42}" width="${w * 0.44}" height="${w * 0.52}"
      rx="${w * 0.06}" fill="#C8A951"/>
    <!-- Motor cap (top circle) -->
    <ellipse cx="0" cy="${-w * 0.42}" rx="${w * 0.16}" ry="${w * 0.07}" fill="#B8953E"/>
    <!-- Cam/eccentric circle on body -->
    <circle cx="${w * 0.04}" cy="${-w * 0.2}" r="${w * 0.08}" fill="#0A0A0A" opacity="0.4"/>
    <circle cx="${w * 0.04}" cy="${-w * 0.2}" r="${w * 0.04}" fill="#C8A951"/>
    <!-- Grip tube (lower section) -->
    <rect x="${-w * 0.14}" y="${w * 0.1}" width="${w * 0.28}" height="${w * 0.38}"
      rx="${w * 0.05}" fill="#B8953E"/>
    <!-- Grip knurling lines -->
    <line x1="${-w * 0.14}" y1="${w * 0.18}" x2="${w * 0.14}" y2="${w * 0.18}" stroke="#0A0A0A" stroke-width="${w * 0.012}" opacity="0.35"/>
    <line x1="${-w * 0.14}" y1="${w * 0.26}" x2="${w * 0.14}" y2="${w * 0.26}" stroke="#0A0A0A" stroke-width="${w * 0.012}" opacity="0.35"/>
    <line x1="${-w * 0.14}" y1="${w * 0.34}" x2="${w * 0.14}" y2="${w * 0.34}" stroke="#0A0A0A" stroke-width="${w * 0.012}" opacity="0.35"/>
    <!-- Needle tube -->
    <rect x="${-w * 0.045}" y="${w * 0.46}" width="${w * 0.09}" height="${w * 0.2}"
      rx="${w * 0.03}" fill="#A07828"/>
    <!-- Needle tip (pointed) -->
    <polygon points="0,${w * 0.72} ${-w * 0.03},${w * 0.66} ${w * 0.03},${w * 0.66}"
      fill="#C8A951"/>
    <!-- Ink drop -->
    <ellipse cx="${w * 0.04}" cy="${w * 0.76}" rx="${w * 0.025}" ry="${w * 0.035}" fill="#C8A951" opacity="0.7"/>
  </g>
</svg>`;
};

const splashSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#0A0A0A"/>
  <!-- Centered machine -->
  <g transform="translate(${w / 2 - 80}, ${h / 2 - 160})">
    <g transform="translate(80, 110) rotate(-12)">
      <rect x="-35" y="-67" width="70" height="83" rx="9" fill="#C8A951"/>
      <ellipse cx="0" cy="-67" rx="25" ry="11" fill="#B8953E"/>
      <circle cx="6" cy="-32" r="13" fill="#0A0A0A" opacity="0.4"/>
      <circle cx="6" cy="-32" r="6" fill="#C8A951"/>
      <rect x="-22" y="16" width="44" height="60" rx="8" fill="#B8953E"/>
      <line x1="-22" y1="28" x2="22" y2="28" stroke="#0A0A0A" stroke-width="2" opacity="0.35"/>
      <line x1="-22" y1="41" x2="22" y2="41" stroke="#0A0A0A" stroke-width="2" opacity="0.35"/>
      <line x1="-22" y1="54" x2="22" y2="54" stroke="#0A0A0A" stroke-width="2" opacity="0.35"/>
      <rect x="-7" y="74" width="14" height="32" rx="5" fill="#A07828"/>
      <polygon points="0,115 -5,105 5,105" fill="#C8A951"/>
      <ellipse cx="6" cy="121" rx="4" ry="5" fill="#C8A951" opacity="0.7"/>
    </g>
  </g>
  <!-- App name -->
  <text x="${w / 2}" y="${h / 2 + 90}" font-family="sans-serif" font-size="28" font-weight="700"
    fill="#C8A951" text-anchor="middle" letter-spacing="6">TATTOO</text>
  <text x="${w / 2}" y="${h / 2 + 126}" font-family="sans-serif" font-size="28" font-weight="700"
    fill="#C8A951" text-anchor="middle" letter-spacing="6">AFTERCARE</text>
  <text x="${w / 2}" y="${h / 2 + 154}" font-family="sans-serif" font-size="13" font-weight="400"
    fill="#555555" text-anchor="middle" letter-spacing="3">HEAL WITH CONFIDENCE</text>
</svg>`;

const notificationSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="transparent"/>
  <g transform="translate(${size/2}, ${size/2}) rotate(-12) scale(0.85)">
    <rect x="${-size*0.22}" y="${-size*0.42}" width="${size*0.44}" height="${size*0.52}" rx="${size*0.06}" fill="white"/>
    <ellipse cx="0" cy="${-size*0.42}" rx="${size*0.16}" ry="${size*0.07}" fill="white"/>
    <rect x="${-size*0.14}" y="${size*0.1}" width="${size*0.28}" height="${size*0.38}" rx="${size*0.05}" fill="white"/>
    <rect x="${-size*0.045}" y="${size*0.46}" width="${size*0.09}" height="${size*0.2}" rx="${size*0.03}" fill="white"/>
    <polygon points="0,${size*0.72} ${-size*0.03},${size*0.66} ${size*0.03},${size*0.66}" fill="white"/>
  </g>
</svg>`;

async function generate() {
  console.log('Generating Tattoo Aftercare icons...\n');

  // icon.png — 1024x1024
  await sharp(Buffer.from(machineSvg(1024)))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(OUT, 'icon.png'));
  console.log('✓ assets/icon.png (1024x1024)');

  // adaptive-icon.png — 1024x1024 with more padding
  await sharp(Buffer.from(machineSvg(1024, 0.22)))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(OUT, 'adaptive-icon.png'));
  console.log('✓ assets/adaptive-icon.png (1024x1024)');

  // splash.png — 1284x2778
  await sharp(Buffer.from(splashSvg(1284, 2778)))
    .resize(1284, 2778)
    .png()
    .toFile(path.join(OUT, 'splash.png'));
  console.log('✓ assets/splash.png (1284x2778)');

  // notification-icon.png — 96x96 white monochrome
  await sharp(Buffer.from(notificationSvg(96)))
    .resize(96, 96)
    .png()
    .toFile(path.join(OUT, 'notification-icon.png'));
  console.log('✓ assets/notification-icon.png (96x96)');

  // favicon.png — 196x196
  await sharp(Buffer.from(machineSvg(196)))
    .resize(196, 196)
    .png()
    .toFile(path.join(OUT, 'favicon.png'));
  console.log('✓ assets/favicon.png (196x196)');

  console.log('\nAll icons generated successfully.');
}

generate().catch((e) => {
  console.error('Error:', e.message);
  console.error('Make sure sharp is installed: npm install --save-dev sharp');
  process.exit(1);
});
