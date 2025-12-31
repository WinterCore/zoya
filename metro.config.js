const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix for pnpm symlinks
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Watch folders for pnpm
config.watchFolders = [path.resolve(__dirname, 'node_modules')];

// Ignore pnpm virtual store
config.resolver.blockList = [/node_modules\/.pnpm/];

module.exports = config;
