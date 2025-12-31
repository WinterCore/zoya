import notifee, { EventType } from '@notifee/react-native';
import BackgroundTimer from 'react-native-background-timer';

// Register foreground service BEFORE expo-router loads - this MUST be at the top level
notifee.registerForegroundService(async (notification) => {
  console.log('Foreground service starting...');

  // Import dynamically to avoid circular dependency
  const { updateBatteryNotification } = await import('./lib/batteryNotificationService');

  console.log('Foreground service running, starting update interval...');

  // Initial update
  await updateBatteryNotification();

  // Update every 2.5 minutes
  const UPDATE_INTERVAL = 2.5 * 60 * 1000;
  BackgroundTimer.runBackgroundTimer(async () => {
    try {
      console.log('Foreground service: updating battery notification...', new Date());
      await updateBatteryNotification();
    } catch (err) {
      console.error('Error updating battery notification in foreground service:', err);
    }
  }, UPDATE_INTERVAL)

  // Keep the service alive indefinitely - this promise never resolves
  return new Promise(() => {});
});

// Handle background events
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Background event:', type, detail);
});

// Use require to avoid hoisting - this MUST run after the notifee setup above
require('expo-router/entry');
