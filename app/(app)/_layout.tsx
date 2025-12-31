import { Drawer } from 'expo-router/drawer';
import 'react-native-reanimated';

import React, {useEffect, useMemo} from 'react';
import {useLoadDevices, clearDevicesCache} from '@/hooks/useDevices';
import {ActivityIndicator, Linking, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {AsyncDataUtils} from '@/lib/asyncdata';
import {useGlobalSearchParams, useRouter} from 'expo-router';
import {DrawerContentScrollView, DrawerContentComponentProps, DrawerItem} from '@react-navigation/drawer';
import {DevicesProvider, useDevices} from '@/contexts/devices';
import {useSession} from '@/contexts/session';
import {Storage} from '@/lib/storage';
import {ScreenBackground} from '@/components/ScreenBackground';
import { prepareBatteryNotificationData, startBatteryNotification, updateBatteryNotification } from '@/lib/batteryNotificationService';

const STORAGE_KEY = 'battery-notification-enabled';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function AppLayout() {
  const { data, reload } = useLoadDevices();
  const theme = useTheme();
  const foregroundServiceStarted = React.useRef(false);

  useEffect(() => {
    if (foregroundServiceStarted.current) {
      return;
    }

    // On app start, restart the foreground service if it was previously enabled
    const run = async () => {
      const enabled = await Storage.getItem(STORAGE_KEY);
      if (enabled === 'true' && data.type === 'success') {
        await startBatteryNotification();
      }
    };

    foregroundServiceStarted.current = true;
    run()
      .catch((err) => {
        console.error('Error starting foreground service on app launch:', err);
      });
  }, [data]);

  if (AsyncDataUtils.isLoading(data)) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size={80} color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }
  
  if (AsyncDataUtils.isError(data)) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ color: "#FF7074", fontSize: 16, textAlign: "center" }}>
            An error occurred! Please try again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={reload}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <DevicesProvider devices={data.data}>
      <StatusBar barStyle="light-content" />
      <Drawer
        screenOptions={{
          headerBackground: () => (
            <View style={{ flex: 1, backgroundColor: "hsl(220, 20%, 8%)" }} />
          ),
          headerTitleStyle: { color: "#FFF" },
          headerTintColor: "#fff",
          drawerStyle: { backgroundColor: "hsl(220, 20%, 8%)", width: 260 },
          drawerType: "back",
          drawerItemStyle: {

          }
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerItemStyle: { display: 'none' },
            title: "",
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerItemStyle: { display: 'none' },
            title: "Settings",
          }}
        />
        <Drawer.Screen
          name="[deviceId]"
          options={{
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer>
    </DevicesProvider>
  );
}

interface CustomDrawerContentProps extends DrawerContentComponentProps {
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

const CustomDrawerContent = (props: CustomDrawerContentProps) => {
  const router = useRouter();
  const searchParams = useGlobalSearchParams();
  const { setSession } = useSession();
  const { ...drawerContentProps } = props;

  const { devices } = useDevices();

  const handleLogout = async () => {
    try {
      await Storage.removeItem("sessionData");
      await Storage.removeItem("credentials");
      await clearDevicesCache();
      props.navigation.closeDrawer();
      setSession(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <DrawerContentScrollView {...drawerContentProps} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{
            color: '#888',
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            Devices
          </Text>
        </View>
        {devices.map((device) => (
          <DrawerItem
            key={device.sn}
            label={`${device.devalias}`}
            onPress={() => router.push(`/${device.pn}`)}
            labelStyle={{ color: '#fff' }}
            activeBackgroundColor="darkcyan"
            pressColor="hsl(220, 15%, 20%)"
            focused={searchParams.deviceId === device.pn}
          />
        ))}
      </View>
      <View style={{ borderTopWidth: 1, borderTopColor: '#333', paddingTop: 8 }}>
        <DrawerItem
          label="Settings"
          onPress={() => router.push('/settings')}
          labelStyle={{ color: '#fff' }}
          pressColor="hsl(220, 15%, 20%)"
        />
        <DrawerItem
          label="Logout"
          onPress={() => void handleLogout()}
          labelStyle={{ color: '#FF7074' }}
          pressColor="hsl(220, 15%, 20%)"
        />
        <DrawerItem
          label="WinterCore"
          onPress={() => Linking.openURL('https://github.com/winterCore')}
          labelStyle={{ color: '#3B82F6', fontSize: 11 }}
          style={{ marginVertical: -8 }}
          pressColor="hsl(220, 15%, 20%)"
        />
      </View>
    </DrawerContentScrollView>
  );
};
