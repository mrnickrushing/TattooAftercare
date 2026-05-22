/**
 * tattooStyles.js
 * Master list of tattoo style tags used throughout Explore, post creation,
 * and the Style Passport badge system.
 */

export const TATTOO_STYLES = [
  { id: 'blackwork',    label: 'Blackwork',       emoji: '⬛' },
  { id: 'fineline',     label: 'Fine Line',        emoji: '🪡' },
  { id: 'traditional', label: 'Traditional',       emoji: '⚓' },
  { id: 'neotrad',     label: 'Neo-Traditional',   emoji: '🌹' },
  { id: 'realism',     label: 'Realism',           emoji: '📷' },
  { id: 'watercolor',  label: 'Watercolor',        emoji: '🎨' },
  { id: 'geometric',   label: 'Geometric',         emoji: '🔷' },
  { id: 'tribal',      label: 'Tribal',            emoji: '🌀' },
  { id: 'japanese',    label: 'Japanese',          emoji: '🐉' },
  { id: 'chicano',     label: 'Chicano',           emoji: '✒️' },
  { id: 'illustrative',label: 'Illustrative',      emoji: '✏️' },
  { id: 'dotwork',     label: 'Dotwork',           emoji: '🔵' },
  { id: 'script',      label: 'Script / Lettering',emoji: '✍️' },
  { id: 'portrait',    label: 'Portrait',          emoji: '🖼️' },
  { id: 'surrealism',  label: 'Surrealism',        emoji: '🌌' },
  { id: 'minimalist',  label: 'Minimalist',        emoji: '➖' },
  { id: 'biomech',     label: 'Biomechanical',     emoji: '⚙️' },
  { id: 'oldschool',   label: 'Old School',        emoji: '🌟' },
  { id: 'newschool',   label: 'New School',        emoji: '🤯' },
  { id: 'ignorant',    label: 'Ignorant Style',    emoji: '✏️' },
];

export const BODY_PARTS = [
  { id: 'arm',       label: 'Arm',        emoji: '💪' },
  { id: 'forearm',   label: 'Forearm',    emoji: '🦾' },
  { id: 'chest',     label: 'Chest',      emoji: '❤️' },
  { id: 'back',      label: 'Back',       emoji: '🔙' },
  { id: 'leg',       label: 'Leg',        emoji: '🦵' },
  { id: 'calf',      label: 'Calf',       emoji: '🦵' },
  { id: 'ankle',     label: 'Ankle',      emoji: '🦶' },
  { id: 'neck',      label: 'Neck',       emoji: '🔗' },
  { id: 'hand',      label: 'Hand',       emoji: '✋' },
  { id: 'finger',    label: 'Finger',     emoji: '☝️' },
  { id: 'rib',       label: 'Ribs',       emoji: '🩻' },
  { id: 'shoulder',  label: 'Shoulder',   emoji: '🏋️' },
  { id: 'thigh',     label: 'Thigh',      emoji: '🦵' },
  { id: 'foot',      label: 'Foot',       emoji: '👣' },
  { id: 'head',      label: 'Head / Face',emoji: '💀' },
  { id: 'sleeve',    label: 'Sleeve',     emoji: '🌿' },
];

export const getStyleById = (id) =>
  TATTOO_STYLES.find((s) => s.id === id) || { id, label: id, emoji: '💉' };

export const getBodyPartById = (id) =>
  BODY_PARTS.find((b) => b.id === id) || { id, label: id, emoji: '💉' };
