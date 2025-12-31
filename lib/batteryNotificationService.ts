import notifee, { AndroidImportance, AndroidForegroundServiceType } from '@notifee/react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { WatchPower } from '@/lib/watchpower';
import { Storage } from '@/lib/storage';
import { toISODateString } from '@/lib/utils';
import { Platform } from 'react-native';
import { Statistics } from './statistics';
import {formatNumber} from './format';

const NOTIFICATION_ID = 'battery-percentage';
const CHANNEL_ID = 'battery';
export const STORAGE_KEY = 'battery-notification-enabled';
const DEVICES_CACHE_KEY = 'cachedDevices';

export interface BatteryNotificationData {
  gridOn: boolean;
  batteryPercent: number;
  watts: number;
  timestamp: Date;
}

export const prepareBatteryNotificationData = (data: readonly WatchPower.InverterDataPoint[]): BatteryNotificationData => {
  const latestDataPoint = data.at(-1);

  if (! latestDataPoint) {
    return {
      batteryPercent: 0,
      watts: 0,
      gridOn: false,
      timestamp: new Date(),
    };
  }

  const batteryPercent = Math.round(latestDataPoint.batteryCapacity);
  const watts = latestDataPoint.acOutputActivePower;

  const dataTime = new Date(latestDataPoint.timestamp.replace(' ', 'T'));

  return {
    batteryPercent,
    watts,
    timestamp: dataTime,
    gridOn: Statistics.isGridOn(data),
  };
};

async function fetchBatteryData(): Promise<BatteryNotificationData | null> {
  const sessionData = await Storage.getItem('sessionData');
  const cachedDevices = await Storage.getItem(DEVICES_CACHE_KEY);

  if (!sessionData || !cachedDevices) {
    console.log('Missing session or device data for battery notification');
    return null;
  }

  const devices: WatchPower.DeviceInfo[] = JSON.parse(cachedDevices);
  if (devices.length === 0) {
    console.log('No devices available');
    return null;
  }

  const session: WatchPower.SessionData = JSON.parse(sessionData);
  const device = devices[0];
  const today = toISODateString(new Date());

  const response = await WatchPower.getDeviceData(session, device, today);

  if (response.type === 'error' || response.data.length === 0) {
    return null;
  }

  return prepareBatteryNotificationData(response.data);
}

async function displayBatteryNotification(data: BatteryNotificationData): Promise<void> {
  const { batteryPercent, watts, gridOn, timestamp } = data;

  if (await Storage.getItem(STORAGE_KEY) !== 'true') {
    console.log('Battery notification disabled, skipping display');
    return;
  }

  const timeStr = timestamp.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const title = gridOn
    ? `${batteryPercent}% · Charging · ${timeStr}`
    : `${batteryPercent}% · ${formatNumber(watts)}W · ${timeStr}`

  await notifee.displayNotification({
    id: NOTIFICATION_ID,
    title,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      asForegroundService: true,
      foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_SPECIAL_USE],
      showTimestamp: true,
      ongoing: true,
      badgeCount: 0,
      autoCancel: false,
      progress: {
        max: 100,
        current: batteryPercent,
      },
    },
  });
}

async function updateBatteryNotification(data?: BatteryNotificationData): Promise<void> {
  if (await Storage.getItem(STORAGE_KEY) !== 'true') {
    console.log('Battery notification disabled, skipping update');
    return;
  }

  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Battery',
      importance: AndroidImportance.LOW,
    });
  }

  try {
    console.log('Updating battery notification...');

    if (data) {
      await displayBatteryNotification(data);
    } else {
      // Fetch data from network
      const fetchedData = await fetchBatteryData();
      if (!fetchedData) {
        return;
      }

      await displayBatteryNotification(fetchedData);
    }

  } catch (error) {
    console.error('Failed to update battery notification:', error);
  }
}

export async function startBatteryNotification(): Promise<void> {
  // Create channel
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Battery',
      importance: AndroidImportance.LOW,
    });
  }

  console.log('startBatteryNotification: Starting foreground service notification');

  // Display notification immediately (this starts the foreground service)
  // The foreground service callback is registered in index.js at app startup
  const data = await fetchBatteryData();
  if (data) {
    await displayBatteryNotification(data);
  }
}

export async function stopBatteryNotification(): Promise<void> {
  console.log('Stopping battery notification...');
  await Storage.setItem(STORAGE_KEY, 'false');
  await notifee.stopForegroundService();
  await notifee.cancelNotification(NOTIFICATION_ID);
}

export async function isNotificationEnabled(): Promise<boolean> {
  const enabled = await Storage.getItem(STORAGE_KEY);
  return enabled === 'true';
}

// Export for manual trigger
export { updateBatteryNotification };
