import { View, Text, StyleSheet, Switch, PermissionsAndroid, Platform, Alert } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useState } from 'react';
import { BatteryNotification } from '@/lib/timeNotification';

export default function Settings() {
  const [enabled, setEnabled] = useState(false);

  const handleToggle = async (value: boolean) => {
    try {
      if (value) {
        // Request notification permission on Android 13+
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission denied', 'Notification permission is required');
            return;
          }
        }

        console.log('Starting battery notification service...');
        const result = await BatteryNotification.start();
        console.log('Service started:', result);
      } else {
        console.log('Stopping battery notification service...');
        await BatteryNotification.stop();
      }
      setEnabled(value);
    } catch (error) {
      console.error('Error toggling notification:', error);
      Alert.alert('Error', String(error));
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Battery notification</Text>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#444', true: '#4CAF50' }}
              thumbColor={enabled ? '#fff' : '#888'}
            />
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
