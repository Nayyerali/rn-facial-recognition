module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['react-native-worklets-core/plugin', { globals: ['__labelImage'] }],
    'react-native-reanimated/plugin',
  ],
};
