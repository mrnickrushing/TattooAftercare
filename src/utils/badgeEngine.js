/**
 * badgeEngine.js
 * Evaluates badge eligibility and awards badges + saves a notification.
 *
 * Call checkAndAwardBadges(event, data) at badge-relevant trigger points.
 *
 * Supported events:
 *   'tattoo_added'    - data: { tattoos }
 *   'care_log_saved'  - data: { tattoos, streak, careLogs, tattooId }
 *   'post_created'    - data: { postCount }
 *   'follower_gained' - data: { followerCount }
 *   'reaction_gained' - data: { reactionCount }
 *   'check_all'       - data: { tattoos, streak, careLogs, postCount, followerCount }
 */
import {
  earnBadge, saveNotification,
  BADGE_TYPES, BADGE_META,
} from '../database/socialDb';

/**
 * Event-driven badge checker.
 * @param {string} event
 * @param {object} data
 * @returns {Array} newly earned badge types
 */
export async function checkAndAwardBadges(event, data = {}) {
  // Legacy call signature: checkAndAwardBadges(tattoos, streak)
  // Detect and handle backwards-compatible form
  if (Array.isArray(event)) {
    const tattoos = event;
    const streak = data;
    return _legacyCheck(tattoos, typeof streak === 'number' ? streak : 0);
  }

  const newBadges = [];

  switch (event) {
    case 'tattoo_added': {
      const { tattoos = [] } = data;
      // Fresh Ink — first tattoo ever
      if (tattoos.length >= 1) {
        if (await earnBadge(BADGE_TYPES.FRESH_INK)) newBadges.push(BADGE_TYPES.FRESH_INK);
      }
      // Ink Collector — 5+ tattoos
      if (tattoos.length >= 5) {
        if (await earnBadge(BADGE_TYPES.INK_COLLECTOR)) newBadges.push(BADGE_TYPES.INK_COLLECTOR);
      }
      // Style Passport — 3+ unique styles
      const styles = [...new Set(tattoos.map((t) => t.style).filter(Boolean))];
      if (styles.length >= 3) {
        if (await earnBadge(BADGE_TYPES.STYLE_PASSPORT)) newBadges.push(BADGE_TYPES.STYLE_PASSPORT);
      }
      break;
    }

    case 'care_log_saved': {
      const { tattoos = [], streak = 0, careLogs = [], tattooId } = data;

      // Dedicated — 7-day care streak
      if (streak >= 7) {
        if (await earnBadge(BADGE_TYPES.DEDICATED)) newBadges.push(BADGE_TYPES.DEDICATED);
      }

      // 30-Day Healer — any tattoo >= 30 days old
      const hasOldTattoo = tattoos.some((t) => {
        if (!t.date_tattooed) return false;
        const days = Math.floor((Date.now() - new Date(t.date_tattooed).getTime()) / 86400000);
        return days >= 30;
      });
      if (hasOldTattoo) {
        if (await earnBadge(BADGE_TYPES.DAY_HEALER_30)) newBadges.push(BADGE_TYPES.DAY_HEALER_30);
      }

      // Iron Skin — 30-day log with zero "bad day" entries
      // A "bad day" is a care log entry where health_status is 'attention' or 'doctor'
      if (tattooId && careLogs.length >= 30) {
        const badDays = careLogs.filter(
          (l) => l.health_status === 'attention' || l.health_status === 'doctor'
        );
        if (badDays.length === 0) {
          if (await earnBadge(BADGE_TYPES.IRON_SKIN)) newBadges.push(BADGE_TYPES.IRON_SKIN);
        }
      }

      // Style Passport
      const styles = [...new Set(tattoos.map((t) => t.style).filter(Boolean))];
      if (styles.length >= 3) {
        if (await earnBadge(BADGE_TYPES.STYLE_PASSPORT)) newBadges.push(BADGE_TYPES.STYLE_PASSPORT);
      }
      break;
    }

    case 'post_created': {
      const { postCount = 1 } = data;
      // First Post
      if (postCount >= 1) {
        if (await earnBadge(BADGE_TYPES.FIRST_POST)) newBadges.push(BADGE_TYPES.FIRST_POST);
      }
      break;
    }

    case 'follower_gained': {
      const { followerCount = 0 } = data;
      // Social Butterfly — 10+ followers
      if (followerCount >= 10) {
        if (await earnBadge(BADGE_TYPES.SOCIAL_BUTTERFLY)) newBadges.push(BADGE_TYPES.SOCIAL_BUTTERFLY);
      }
      break;
    }

    case 'reaction_gained': {
      const { reactionCount = 0 } = data;
      // Trendsetter — post reaches 50 reactions
      if (reactionCount >= 50) {
        if (await earnBadge(BADGE_TYPES.TRENDSETTER)) newBadges.push(BADGE_TYPES.TRENDSETTER);
      }
      break;
    }

    case 'check_all':
    default: {
      // Run all checks
      const { tattoos = [], streak = 0, careLogs = [], postCount = 0, followerCount = 0 } = data;
      const combined = [
        ...(await checkAndAwardBadges('tattoo_added', { tattoos })),
        ...(await checkAndAwardBadges('care_log_saved', { tattoos, streak, careLogs })),
        ...(await checkAndAwardBadges('post_created', { postCount })),
        ...(await checkAndAwardBadges('follower_gained', { followerCount })),
      ];
      // de-dupe
      const unique = [...new Set(combined)];
      return unique; // notifications already saved in sub-calls
    }
  }

  // Save in-app notifications for each newly earned badge
  for (const badgeType of newBadges) {
    const meta = BADGE_META[badgeType];
    if (meta) {
      await saveNotification({
        id: `badge-${badgeType}-${Date.now()}`,
        type: 'badge',
        body: `${meta.icon} You earned the "${meta.label}" badge! ${meta.desc}`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }
  }

  return newBadges;
}

/**
 * Legacy signature support: checkAndAwardBadges(tattoos[], streak)
 */
async function _legacyCheck(tattoos = [], streak = 0) {
  const newBadges = [];

  if (tattoos.length >= 1) {
    if (await earnBadge(BADGE_TYPES.FRESH_INK)) newBadges.push(BADGE_TYPES.FRESH_INK);
  }
  if (streak >= 7) {
    if (await earnBadge(BADGE_TYPES.DEDICATED)) newBadges.push(BADGE_TYPES.DEDICATED);
  }
  if (streak >= 14) {
    if (await earnBadge(BADGE_TYPES.IRON_SKIN)) newBadges.push(BADGE_TYPES.IRON_SKIN);
  }
  const hasOldTattoo = tattoos.some((t) => {
    if (!t.date_tattooed) return false;
    const days = Math.floor((Date.now() - new Date(t.date_tattooed).getTime()) / 86400000);
    return days >= 30;
  });
  if (hasOldTattoo) {
    if (await earnBadge(BADGE_TYPES.DAY_HEALER_30)) newBadges.push(BADGE_TYPES.DAY_HEALER_30);
  }
  if (tattoos.length >= 5) {
    if (await earnBadge(BADGE_TYPES.INK_COLLECTOR)) newBadges.push(BADGE_TYPES.INK_COLLECTOR);
  }
  const styles = [...new Set(tattoos.map((t) => t.style).filter(Boolean))];
  if (styles.length >= 3) {
    if (await earnBadge(BADGE_TYPES.STYLE_PASSPORT)) newBadges.push(BADGE_TYPES.STYLE_PASSPORT);
  }
  for (const badgeType of newBadges) {
    const meta = BADGE_META[badgeType];
    if (meta) {
      await saveNotification({
        id: `badge-${badgeType}-${Date.now()}`,
        type: 'badge',
        body: `${meta.icon} You earned the "${meta.label}" badge! ${meta.desc}`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }
  }
  return newBadges;
}

/**
 * Check milestones for a tattoo and save notifications for any newly reached ones.
 * @param {object} tattoo
 * @param {Array}  newlyEarnedMilestones  - returned by checkAndSaveMilestone()
 */
export async function notifyMilestones(tattoo, newlyEarnedMilestones = []) {
  const MILESTONE_LABELS = {
    day3:   { emoji: '🌱', title: 'Day 3 milestone reached!' },
    day7:   { emoji: '⚡', title: 'One Week Strong!' },
    day14:  { emoji: '✨', title: 'Two Weeks In!' },
    day30:  { emoji: '🏆', title: '30-Day Healer!' },
    healed: { emoji: '💉', title: 'Fully Healed!' },
  };

  for (const type of newlyEarnedMilestones) {
    const meta = MILESTONE_LABELS[type] || { emoji: '🎯', title: 'Milestone reached!' };
    await saveNotification({
      id: `milestone-${tattoo.id}-${type}-${Date.now()}`,
      type: 'milestone',
      entity_id: String(tattoo.id),
      body: `${meta.emoji} ${meta.title} — ${tattoo.name}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
  }
}
