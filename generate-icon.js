#!/usr/bin/env node
/**
 * Generates app icon assets for Blood Raven Aftercare.
 * Place your logo at assets/blood-raven-logo.png (high-res, ideally 1024x1024+)
 * then run: node generate-icon.js
 * Requires: npm install --save-dev sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'assets');
const LOGO_PATH = path.join(OUT, 'blood-raven-logo.png');
const HAS_LOGO = fs.existsSync(LOGO_PATH);

if (!HAS_LOGO) {
  console.warn('⚠  assets/blood-raven-logo.png not found — falling back to generated icon.');
  console.warn('   Save the Blood Raven Ink logo there and re-run to use your real logo.\n');
}

// Fallback SVG (raven feather silhouette) used only if logo image is missing
const fallbackSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1A1A1A"/>
      <stop offset="100%" stop-color="#0A0A0A"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${size * 0.18}"/>
  <text x="${size/2}" y="${size*0.52}" font-family="sans-serif" font-size="${size*0.18}"
    font-weight="900" fill="#C8A951" text-anchor="middle">BRI</text>
  <text x="${size/2}" y="${size*0.68}" font-family="sans-serif" font-size="${size*0.07}"
    font-weight="600" fill="#8B7535" text-anchor="middle" letter-spacing="${size*0.008}">AFTERCARE</text>
</svg>`;

const splashSvg = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#0A0A0A"/>
  <text x="${w/2}" y="${h/2 + 20}" font-family="sans-serif" font-size="32" font-weight="900"
    fill="#C8A951" text-anchor="middle" letter-spacing="4">BLOOD RAVEN INK</text>
  <text x="${w/2}" y="${h/2 + 60}" font-family="sans-serif" font-size="20" font-weight="600"
    fill="#C8A951" text-anchor="middle" letter-spacing="6">AFTERCARE</text>
  <text x="${w/2}" y="${h/2 + 90}" font-family="sans-serif" font-size="13" font-weight="400"
    fill="#555555" text-anchor="middle" letter-spacing="3">HEAL WITH CONFIDENCE</text>
</svg>`;

const notificationSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="transparent"/>
  <text x="${size/2}" y="${size*0.68}" font-family="sans-serif" font-size="${size*0.5}"
    font-weight="900" fill="white" text-anchor="middle">R</text>
</svg>`;

async function makeIconFromLogo(outputSize, outputPath, padding = 0.12) {
  const inner = Math.round(outputSize * (1 - padding * 2));
  const offset = Math.round(outputSize * padding);

  // Dark rounded-rect background
  const bg = await sharp({
    create: {
      width: outputSize,
      height: outputSize,
      channels: 4,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    },
  }).png().toBuffer();

  // Logo resized to fit inside with padding, converted to have white background removed
  // (logo is black on cream — invert so it's white on transparent for dark bg)
  const logo = await sharp(LOGO_PATH)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    // The logo is black on cream/white. We negate to get white on dark, then tint gold.
    .negate({ alpha: false })
    .tint({ r: 200, g: 169, b: 81 }) // #C8A951 gold tint
    .png()
    .toBuffer();

  await sharp(bg)
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toFile(outputPath);
}

async function generate() {
  console.log(`Generating Blood Raven Aftercare icons (logo: ${HAS_LOGO ? 'YES ✓' : 'fallback'})...\n`);

  // icon.png — 1024x1024
  if (HAS_LOGO) {
    await makeIconFromLogo(1024, path.join(OUT, 'icon.png'), 0.10);
  } else {
    await sharp(Buffer.from(fallbackSvg(1024))).resize(1024, 1024).png().toFile(path.join(OUT, 'icon.png'));
  }
  console.log('✓ assets/icon.png (1024x1024)');

  // adaptive-icon.png — more padding for Android safe zone
  if (HAS_LOGO) {
    await makeIconFromLogo(1024, path.join(OUT, 'adaptive-icon.png'), 0.20);
  } else {
    await sharp(Buffer.from(fallbackSvg(1024))).resize(1024, 1024).png().toFile(path.join(OUT, 'adaptive-icon.png'));
  }
  console.log('✓ assets/adaptive-icon.png (1024x1024)');

  // splash.png — 1284x2778
  // Logo centered on dark background with text below
  if (HAS_LOGO) {
    const splashW = 1284;
    const splashH = 2778;
    const logoSize = 520;
    const logoOffset = Math.round((splashW - logoSize) / 2);
    const logoTop = Math.round(splashH / 2 - logoSize / 2 - 80);

    const bg = await sharp({
      create: { width: splashW, height: splashH, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 1 } },
    }).png().toBuffer();

    const logo = await sharp(LOGO_PATH)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .negate({ alpha: false })
      .tint({ r: 200, g: 169, b: 81 })
      .png()
      .toBuffer();

    const textOverlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${splashW}" height="${splashH}">
      <text x="${splashW/2}" y="${logoTop + logoSize + 60}" font-family="sans-serif" font-size="28"
        font-weight="400" fill="#555555" text-anchor="middle" letter-spacing="4">HEAL WITH CONFIDENCE</text>
    </svg>`);

    await sharp(bg)
      .composite([
        { input: logo, top: logoTop, left: logoOffset },
        { input: textOverlay, top: 0, left: 0 },
      ])
      .png()
      .toFile(path.join(OUT, 'splash.png'));
  } else {
    await sharp(Buffer.from(splashSvg(1284, 2778))).resize(1284, 2778).png().toFile(path.join(OUT, 'splash.png'));
  }
  console.log('✓ assets/splash.png (1284x2778)');

  // notification-icon.png — 96x96 white monochrome
  await sharp(Buffer.from(notificationSvg(96))).resize(96, 96).png().toFile(path.join(OUT, 'notification-icon.png'));
  console.log('✓ assets/notification-icon.png (96x96)');

  // favicon.png — 196x196
  if (HAS_LOGO) {
    await makeIconFromLogo(196, path.join(OUT, 'favicon.png'), 0.10);
  } else {
    await sharp(Buffer.from(fallbackSvg(196))).resize(196, 196).png().toFile(path.join(OUT, 'favicon.png'));
  }
  console.log('✓ assets/favicon.png (196x196)');

  console.log('\nAll icons generated successfully.');
}

generate().catch((e) => {
  console.error('Error:', e.message);
  console.error('Make sure sharp is installed: npm install --save-dev sharp');
  process.exit(1);
});
