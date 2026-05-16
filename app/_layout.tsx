import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import '../global.css';

import { ThemeProvider } from '@/lib/theme-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SettingsProvider } from '@/lib/settings-context';
import { ThemeProvider as CustomThemeProvider } from '@/lib/theme-context';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const colorScheme = useColorScheme();

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="school-search" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ThemeProvider>
    </CustomThemeProvider>
  );
}