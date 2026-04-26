const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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
