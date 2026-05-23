import { Linking, Share, Platform } from 'react-native';

const IG_APP_PROFILE = (handle) => `instagram://user?username=${handle}`;
const IG_WEB_PROFILE = (handle) => `https://www.instagram.com/${handle}/`;
const IG_APP_POST   = (mediaId) => `instagram://media?id=${mediaId}`;
const IG_WEB_POST   = (mediaId) => `https://www.instagram.com/p/${mediaId}/`;

export async function openInstagramProfile(handle) {
  if (!handle) return;
  const clean = handle.replace(/^@/, '');
  try {
    const supported = await Linking.canOpenURL(IG_APP_PROFILE(clean));
    if (supported) {
      await Linking.openURL(IG_APP_PROFILE(clean));
    } else {
      await Linking.openURL(IG_WEB_PROFILE(clean));
    }
  } catch {
    await Linking.openURL(IG_WEB_PROFILE(clean));
  }
}

export async function openInstagramPost(mediaId) {
  if (!mediaId) return;
  try {
    const supported = await Linking.canOpenURL(IG_APP_POST(mediaId));
    if (supported) {
      await Linking.openURL(IG_APP_POST(mediaId));
    } else {
      await Linking.openURL(IG_WEB_POST(mediaId));
    }
  } catch {
    await Linking.openURL(IG_WEB_POST(mediaId));
  }
}

export async function shareToInstagram({ imageUri, caption, tattooName, dayNumber, handle } = {}) {
  const parts = [];
  if (tattooName) parts.push(`Healing update for ${tattooName}${dayNumber ? ` — Day ${dayNumber}` : ''}`);
  if (caption) parts.push(caption);
  if (handle) parts.push(`Artist: @${handle.replace(/^@/, '')}`);
  parts.push('#TattooHealing #TattooAftercare #BloodRavenInk');
  const message = parts.join('\n\n');

  if (imageUri) {
    // react-native Share can only share a URL/message on most platforms;
    // for actual image sharing we pass both so the OS sheet handles it.
    try {
      await Share.share({
        message,
        url: imageUri,     // iOS picks this up; Android ignores url
        title: 'Share to Instagram',
      });
    } catch {}
  } else {
    try {
      await Share.share({ message, title: 'Share to Instagram' });
    } catch {}
  }
}

export async function isInstagramInstalled() {
  try {
    return await Linking.canOpenURL('instagram://');
  } catch {
    return false;
  }
}
