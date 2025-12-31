import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import 'react-native-reanimated';

import {useColorScheme} from '@/hooks/useColorScheme';
import React from 'react';
import {LinearGradient} from "expo-linear-gradient";
import {SessionProvider, useSession} from '@/contexts/session';
import {ScreenBackground} from '@/components/ScreenBackground';
import {I18nManager} from 'react-native';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  
  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  const customTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: 'transparent',
    },
  };

  return (
    <ThemeProvider value={customTheme}>
      <SessionProvider>
        <RootNavigator />
        {/*
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="dashboard" options={{ contentStyle: { backgroundColor: 'transparent' } }} />
        </Stack>
        */}
      </SessionProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
