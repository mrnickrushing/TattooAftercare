const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Extend source extensions to handle .mjs and .cjs files
// (needed for date-fns v3 which ships as ESM)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

// Ensure these packages are Babel-transformed instead of passed raw to Hermes.
// The default Expo pattern skips most node_modules; we add react-native-purchases
// and date-fns explicitly so Hermes doesn't reject their modern JS syntax.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|@react-native-async-storage|react-native-purchases|react-native-view-shot|react-native-get-random-values|date-fns|expo|expo-.*|@expo|@expo/.*|@react-navigation|@react-navigation/.*|uuid)/)',
];

module.exports = config;
