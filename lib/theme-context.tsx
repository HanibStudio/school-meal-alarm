import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeContext } from '@/lib/theme-provider';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_MODE_KEY = 'theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const systemColorScheme = useColorScheme();
  const { setColorScheme } = useThemeContext();

  // 초기 로드
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_MODE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeModeState(saved);
          // 테마 즉시 적용
          const effectiveTheme = saved === 'system' ? (systemColorScheme ?? 'light') : saved;
          setColorScheme(effectiveTheme as 'light' | 'dark');
        }
      } catch (error) {
        console.error('테마 모드 로드 오류:', error);
      }
    };

    loadThemeMode();
  }, []);

  const handleSetThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    
    // 실제 적용할 테마 결정
    const effectiveTheme = mode === 'system' ? (systemColorScheme ?? 'light') : mode;
    
    // 기존 ThemeProvider에 적용
    setColorScheme(effectiveTheme as 'light' | 'dark');
    
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
    } catch (error) {
      console.error('테마 모드 저장 오류:', error);
    }
  };

  // 실제 적용할 테마 결정
  const effectiveTheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemColorScheme ?? 'light') : themeMode;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode: handleSetThemeMode,
        effectiveTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
