import { differenceInDays, parseISO } from 'date-fns';
import { COLORS } from '../constants/theme';

export const STAGE_KEYS = {
  FRESH: 'fresh',
  EARLY: 'early',
  PEELING: 'peeling',
  SETTLING: 'settling',
  HEALED: 'healed',
};

const STAGE_INFO = {
  fresh: {
    name: 'Fresh',
    color: COLORS.stageColors.fresh,
    timeframe: 'Days 1–3',
    description: 'Fresh wound. Keep clean and wrapped as directed.',
    minDay: 1,
    maxDay: 3,
  },
  early: {
    name: 'Early Healing',
    color: COLORS.stageColors.early,
    timeframe: 'Days 4–7',
    description: 'Skin closing over. Moisturize heavily, avoid touching.',
    minDay: 4,
    maxDay: 7,
  },
  peeling: {
    name: 'Peeling',
    color: COLORS.stageColors.peeling,
    timeframe: 'Days 8–14',
    description: 'Normal flaking. No picking, no soaking, no sun.',
    minDay: 8,
    maxDay: 14,
  },
  settling: {
    name: 'Settling In',
    color: COLORS.stageColors.settling,
    timeframe: 'Days 15–28',
    description: 'Surface healed. SPF required, colors normalizing.',
    minDay: 15,
    maxDay: 28,
  },
  healed: {
    name: 'Healed',
    color: COLORS.stageColors.healed,
    timeframe: 'Day 29+',
    description: 'Fully healed. Maintain SPF and moisturize regularly.',
    minDay: 29,
    maxDay: Infinity,
  },
};

const CARE_TASKS = {
  fresh: [
    { id: 'morning_wash', label: 'Morning wash (unscented soap)', field: 'washed', time: 'morning' },
    { id: 'avoid_touching', label: 'Avoid touching with unwashed hands', field: null, time: 'anytime' },
    { id: 'rewrap_if_needed', label: 'Rewrap if artist instructed', field: null, time: 'anytime' },
    { id: 'evening_wash', label: 'Evening wash (unscented soap)', field: 'washed', time: 'evening' },
  ],
  early: [
    { id: 'morning_wash', label: 'Morning wash (unscented soap)', field: 'washed', time: 'morning' },
    { id: 'moisturize_morning', label: 'Apply moisturizer (morning)', field: 'moisturized', time: 'morning' },
    { id: 'moisturize_midday', label: 'Apply moisturizer (midday)', field: 'moisturized', time: 'anytime' },
    { id: 'moisturize_evening', label: 'Apply moisturizer (evening)', field: 'moisturized', time: 'evening' },
    { id: 'avoid_sun', label: 'Keep out of direct sunlight', field: null, time: 'anytime' },
    { id: 'evening_wash', label: 'Evening wash (unscented soap)', field: 'washed', time: 'evening' },
  ],
  peeling: [
    { id: 'morning_wash', label: 'Morning wash (unscented soap)', field: 'washed', time: 'morning' },
    { id: 'moisturize_morning', label: 'Apply moisturizer (morning)', field: 'moisturized', time: 'morning' },
    { id: 'moisturize_evening', label: 'Apply moisturizer (evening)', field: 'moisturized', time: 'evening' },
    { id: 'no_picking', label: 'No picking or peeling skin', field: null, time: 'anytime' },
    { id: 'no_soaking', label: 'No pools, baths, or soaking', field: null, time: 'anytime' },
    { id: 'avoid_sun', label: 'Keep out of direct sunlight', field: null, time: 'anytime' },
  ],
  settling: [
    { id: 'moisturize_morning', label: 'Apply moisturizer (morning)', field: 'moisturized', time: 'morning' },
    { id: 'apply_spf', label: 'Apply SPF 50+ if going outside', field: null, time: 'morning' },
    { id: 'moisturize_evening', label: 'Apply moisturizer (evening)', field: 'moisturized', time: 'evening' },
    { id: 'avoid_prolonged_sun', label: 'Avoid prolonged sun exposure', field: null, time: 'anytime' },
  ],
  healed: [
    { id: 'apply_spf', label: 'Apply SPF 50+ when outdoors', field: null, time: 'anytime' },
  ],
};

export function getDayNumber(dateTattooed) {
  if (!dateTattooed) return 0;
  try {
    const tattooDate = parseISO(dateTattooed);
    const days = differenceInDays(new Date(), tattooDate);
    return Math.max(1, days + 1);
  } catch {
    return 1;
  }
}

export function getStage(dateTattooed) {
  const day = getDayNumber(dateTattooed);
  if (day <= 3) return STAGE_KEYS.FRESH;
  if (day <= 7) return STAGE_KEYS.EARLY;
  if (day <= 14) return STAGE_KEYS.PEELING;
  if (day <= 28) return STAGE_KEYS.SETTLING;
  return STAGE_KEYS.HEALED;
}

export function getStageInfo(stageKey) {
  return STAGE_INFO[stageKey] || STAGE_INFO.fresh;
}

export function getHealingProgress(dateTattooed) {
  const day = getDayNumber(dateTattooed);
  const TOTAL_DAYS = 28;
  if (day >= TOTAL_DAYS) return 1.0;
  return Math.min(day / TOTAL_DAYS, 1.0);
}

export function getCareTasks(stageKey) {
  return CARE_TASKS[stageKey] || CARE_TASKS.fresh;
}

export function isHealed(dateTattooed) {
  return getDayNumber(dateTattooed) > 28;
}

export function getDaysUntilHealed(dateTattooed) {
  const day = getDayNumber(dateTattooed);
  if (day > 28) return 0;
  return 29 - day;
}

export function calculateHealthStatus(symptoms) {
  if (symptoms.discharge || symptoms.fever) {
    return 'doctor';
  }
  if (symptoms.redness && symptoms.swelling) {
    return 'attention';
  }
  return 'good';
}
