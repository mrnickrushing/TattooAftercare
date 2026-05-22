/**
 * milestones.js
 * Utility for healing milestone definitions and day-based lookup.
 * Used by Issue #18 (shareable milestone cards) and #19 (push notifications).
 */

export const MILESTONE_DAYS = [3, 7, 14, 30];

export const MILESTONE_MAP = {
  day3: {
    type: 'day3',
    day: 3,
    label: 'Day 3',
    title: 'First 3 Days Done!',
    desc: 'The hardest part is over. Your skin is starting to lock in the ink.',
    emoji: '🌱',
    color: '#E05252',
    icon: '🌱',
  },
  day7: {
    type: 'day7',
    day: 7,
    label: 'Day 7',
    title: 'One Week Strong!',
    desc: "Peeling is normal — resist the urge to pick. You're doing great.",
    emoji: '⚡',
    color: '#E09452',
    icon: '⚡',
  },
  day14: {
    type: 'day14',
    day: 14,
    label: 'Day 14',
    title: 'Two Weeks In!',
    desc: 'Colors are starting to settle. Keep moisturizing — the deep layers are still healing.',
    emoji: '✨',
    color: '#C8A951',
    icon: '✨',
  },
  day30: {
    type: 'day30',
    day: 30,
    label: 'Day 30',
    title: '30-Day Healer!',
    desc: 'Surface healing is complete. Keep protecting from sun exposure.',
    emoji: '🏆',
    color: '#4CAF7D',
    icon: '🏆',
  },
  healed: {
    type: 'healed',
    day: 28,
    label: 'Fully Healed',
    title: 'Fully Healed!',
    desc: "Your tattoo has completed its healing journey. It's yours forever now.",
    emoji: '💉',
    color: '#5292C0',
    icon: '💉',
  },
};

/**
 * Given a day number, returns the milestone object that matches, or null.
 * Matches exactly at the threshold day (3, 7, 14, 30).
 * Also returns 'healed' milestone for day >= 28.
 *
 * @param {number} day
 * @returns {{ type, day, label, title, desc, emoji, color, icon } | null}
 */
export function getMilestoneForDay(day) {
  if (!day || day < 3) return null;
  if (day >= 3  && day < 7)  return MILESTONE_MAP.day3;
  if (day >= 7  && day < 14) return MILESTONE_MAP.day7;
  if (day >= 14 && day < 30) return MILESTONE_MAP.day14;
  if (day >= 30) return MILESTONE_MAP.day30;
  return null;
}

/**
 * Returns the milestone object for a given milestone_type string.
 * @param {string} type - 'day3' | 'day7' | 'day14' | 'day30' | 'healed'
 * @returns {object | null}
 */
export function getMilestoneMeta(type) {
  return MILESTONE_MAP[type] || null;
}

/**
 * Returns all milestones that have been passed for a given day count.
 * @param {number} day
 * @returns {Array<object>}
 */
export function getAllPassedMilestones(day) {
  return Object.values(MILESTONE_MAP).filter((m) => day >= m.day);
}
