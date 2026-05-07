const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const srcPath = path.resolve(__dirname, 'src');

config.watchFolders = Array.from(new Set([...(config.watchFolders || []), srcPath]));
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@app': path.resolve(srcPath, 'app'),
  '@screens': path.resolve(srcPath, 'screens'),
  '@shared': path.resolve(srcPath, 'shared'),
};

// Добавляем поддержку для файлов с расширениями
config.resolver.assetExts.push(
  // Добавляем расширения если нужно
  'bin',
  'txt',
  'jpg',
  'png',
  'svg'
);

module.exports = config;
