module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@app": "./src/app",
            "@screens": "./src/screens",
            "@shared": "./src/shared"
          }
        }
      ],
      "react-native-reanimated/plugin"
    ]
  };
};
