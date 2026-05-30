const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Extend source extensions to handle .mjs and .cjs files
// (needed for date-fns v3 which ships as ESM)
config.resolver.sourceExts = [
  ...config.resolver.sourceExts,
  'mjs',
  'cjs',
];

// Add .wasm to asset extensions so expo-sqlite's WebAssembly worker resolves correctly on web
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'wasm',
];

// Ensure these packages are Babel-transformed instead of passed raw to Hermes.
// The default Expo pattern skips most node_modules; we add react-native-purchases
// and date-fns explicitly so Hermes doesn't reject their modern JS syntax.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|@react-native-async-storage|react-native-purchases|react-native-svg|react-native-view-shot|react-native-get-random-values|date-fns|expo|expo-.*|@expo|@expo/.*|@react-navigation|@react-navigation/.*|uuid)/)',
];

// Exclude Replit agent temp directories from file watching to avoid ENOENT crashes
// when Metro tries to watch paths that get cleaned up mid-session.
config.watchFolders = [__dirname];
config.resolver.blockList = [
  /\.local\/skills\/.*/,
  /\.agents\/.*/,
];

module.exports = config;
