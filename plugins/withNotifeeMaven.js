const { withProjectBuildGradle } = require("expo/config-plugins");

function withNotifeeMaven(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Check if notifee maven is already added
    if (contents.includes("@notifee/react-native/android/libs")) {
      return config;
    }

    // Add notifee maven repository after jitpack
    config.modResults.contents = contents.replace(
      `maven { url 'https://www.jitpack.io' }`,
      `maven { url 'https://www.jitpack.io' }
        maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`
    );

    return config;
  });
}

module.exports = withNotifeeMaven;
