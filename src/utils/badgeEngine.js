/**
 * badgeEngine.js
 * Evaluates badge eligibility and awards badges + saves a notification.
 * Call checkAndAwardBadges(tattoos, careStreak) from HomeScreen on focus.
 */
import {
  earnBadge, saveNotification,
  BADGE_TYPES, BADGE_META,
} from '../database/socialDb';

/**
 * @param {Array} tattoos  - array of tattoo objects from getTattoos()
 * @param {number} streak  - current care streak count
 * @returns {Array}        - newly earned badge types (strings)
 */
export async function checkAndAwardBadges(tattoos = [], streak = 0) {
  const newBadges = [];

  // Fresh Ink — first tattoo ever added
  if (tattoos.length >= 1) {
    if (await earnBadge(BADGE_TYPES.FRESH_INK)) newBadges.push(BADGE_TYPES.FRESH_INK);
  }

  // Dedicated — 7-day care streak
  if (streak >= 7) {
    if (await earnBadge(BADGE_TYPES.DEDICATED)) newBadges.push(BADGE_TYPES.DEDICATED);
  }

  // Iron Skin — 14-day care streak
  if (streak >= 14) {
    if (await earnBadge(BADGE_TYPES.IRON_SKIN)) newBadges.push(BADGE_TYPES.IRON_SKIN);
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

  // Ink Collector — 5+ tattoos
  if (tattoos.length >= 5) {
    if (await earnBadge(BADGE_TYPES.INK_COLLECTOR)) newBadges.push(BADGE_TYPES.INK_COLLECTOR);
  }

  // Style Passport — 3+ unique styles
  const styles = [...new Set(tattoos.map((t) => t.style).filter(Boolean))];
  if (styles.length >= 3) {
    if (await earnBadge(BADGE_TYPES.STYLE_PASSPORT)) newBadges.push(BADGE_TYPES.STYLE_PASSPORT);
  }

  // Save a notification for each newly earned badge
  for (const badgeType of newBadges) {
    const meta = BADGE_META[badgeType];
    await saveNotification({
      id: `badge-${badgeType}-${Date.now()}`,
      type: 'badge',
      body: `${meta.icon} You earned the "${meta.label}" badge! ${meta.desc}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
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
