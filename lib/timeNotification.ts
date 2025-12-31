import { NativeModules, Platform } from 'react-native';
import { Storage } from './storage';
import { WatchPower } from './watchpower';

const { TimeNotificationModule } = NativeModules;

const DEVICES_CACHE_KEY = 'cachedDevices';

export const BatteryNotification = {
  start: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      console.warn('BatteryNotification is only available on Android');
      return false;
    }
    if (!TimeNotificationModule) {
      throw new Error('TimeNotificationModule is not available. Did you rebuild the app?');
    }

    // Get session and device data from storage
    const sessionDataStr = await Storage.getItem('sessionData');
    const cachedDevicesStr = await Storage.getItem(DEVICES_CACHE_KEY);

    if (!sessionDataStr || !cachedDevicesStr) {
      throw new Error('Missing session or device data. Please log in first.');
    }

    const sessionData: WatchPower.SessionData = JSON.parse(sessionDataStr);
    const devices: WatchPower.DeviceInfo[] = JSON.parse(cachedDevicesStr);

    if (devices.length === 0) {
      throw new Error('No devices available.');
    }

    const device = devices[0];

    return TimeNotificationModule.startService(
      { token: sessionData.token, secret: sessionData.secret },
      { pn: device.pn, sn: device.sn, devcode: device.devcode, devaddr: device.devaddr }
    );
  },

  stop: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return false;
    }
    if (!TimeNotificationModule) {
      throw new Error('TimeNotificationModule is not available. Did you rebuild the app?');
    }
    return TimeNotificationModule.stopService();
  },
};
