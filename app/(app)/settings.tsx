import { View, Text, StyleSheet, Switch, ToastAndroid, ActivityIndicator } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useState, useEffect } from 'react';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import {
  startBatteryNotification,
  stopBatteryNotification,
  isNotificationEnabled,
} from '@/lib/batteryNotificationService';
import { Storage } from '@/lib/storage';

export const STORAGE_KEY = 'battery-notification-enabled';

export default function Settings() {
  const [batteryNotification, setBatteryNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    isNotificationEnabled().then(setBatteryNotification);
  }, []);

  async function handleBatteryNotificationToggle(value: boolean) {
    setIsLoading(true);
    try {
      if (value) {
        // Request notification permissions
        const settings = await notifee.requestPermission();
        if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
          ToastAndroid.show('Notification permission denied', ToastAndroid.SHORT);
          return;
        }

        await Storage.setItem(STORAGE_KEY, 'true');
        await startBatteryNotification();
        setBatteryNotification(true);
      } else {
        await stopBatteryNotification();
        setBatteryNotification(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Battery percentage notification</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Switch
                value={batteryNotification}
                onValueChange={handleBatteryNotificationToggle}
                trackColor={{ false: '#444', true: '#4CAF50' }}
                thumbColor={batteryNotification ? '#fff' : '#888'}
              />
            )}
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
});
