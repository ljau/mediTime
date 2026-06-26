const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** Adds the full-color app icon as the Android notification large icon. */
const withAndroidNotificationLargeIcon = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'expo.modules.notifications.large_notification_icon',
      '@mipmap/ic_launcher',
      'resource'
    );

    return config;
  });
};

module.exports = withAndroidNotificationLargeIcon;
