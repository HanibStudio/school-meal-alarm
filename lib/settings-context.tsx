import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, loadSettings, saveSelectedSchool, saveNotificationSettings, saveMealTypes } from './settings';
import { School } from './neis-api';
import { scheduleDailyMealNotification, cancelDailyNotification, setupNotificationChannel, setupNotificationHandler } from './notifications';
import { loadFavoriteDishes, saveFavoriteDishes } from './favorite-dishes';

interface SettingsContextValue extends AppSettings {
  isLoading: boolean;
  favoriteDishKeywords: string[];
  setSelectedSchool: (school: School | null) => Promise<void>;
  setNotificationEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (hour: number, minute: number) => Promise<void>;
  setSelectedMealTypes: (types: string[]) => Promise<void>;
  addFavoriteDish: (keyword: string) => Promise<void>;
  removeFavoriteDish: (keyword: string) => Promise<void>;
  setFavoriteDishes: (keywords: string[]) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings>({
    selectedSchool: null,
    notificationEnabled: false,
    notificationHour: 7,
    notificationMinute: 30,
    selectedMealTypes: ['2'],
  });
  const [favoriteDishKeywords, setFavoriteDishKeywords] = useState<string[]>([]);

  useEffect(() => {
    setupNotificationHandler();
    setupNotificationChannel();
    loadSettings().then((loaded) => {
      setSettings(loaded);
    });
    loadFavoriteDishes().then((fav) => {
      setFavoriteDishKeywords(fav.keywords);
      setIsLoading(false);
    });
  }, []);

  const setSelectedSchool = useCallback(async (school: School | null) => {
    await saveSelectedSchool(school);
    setSettings((prev) => ({ ...prev, selectedSchool: school }));

    // 학교 변경 시 알림이 켜져 있으면 알림 재예약
    if (school && settings.notificationEnabled) {
      await scheduleDailyMealNotification(
        settings.notificationHour,
        settings.notificationMinute,
        school,
        settings.selectedMealTypes
      );
    }
  }, [settings]);

  const setNotificationEnabled = useCallback(async (enabled: boolean) => {
    await saveNotificationSettings(enabled, settings.notificationHour, settings.notificationMinute);
    setSettings((prev) => ({ ...prev, notificationEnabled: enabled }));

    if (enabled && settings.selectedSchool) {
      await scheduleDailyMealNotification(
        settings.notificationHour,
        settings.notificationMinute,
        settings.selectedSchool,
        settings.selectedMealTypes
      );
    } else if (!enabled) {
      await cancelDailyNotification();
    }
  }, [settings]);

  const setNotificationTime = useCallback(async (hour: number, minute: number) => {
    await saveNotificationSettings(settings.notificationEnabled, hour, minute);
    setSettings((prev) => ({ ...prev, notificationHour: hour, notificationMinute: minute }));

    if (settings.notificationEnabled && settings.selectedSchool) {
      await scheduleDailyMealNotification(
        hour,
        minute,
        settings.selectedSchool,
        settings.selectedMealTypes
      );
    }
  }, [settings]);

  const setSelectedMealTypes = useCallback(async (types: string[]) => {
    await saveMealTypes(types);
    setSettings((prev) => ({ ...prev, selectedMealTypes: types }));

    if (settings.notificationEnabled && settings.selectedSchool) {
      await scheduleDailyMealNotification(
        settings.notificationHour,
        settings.notificationMinute,
        settings.selectedSchool,
        types
      );
    }
  }, [settings]);

  const addFavoriteDish = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    if (trimmed && !favoriteDishKeywords.includes(trimmed)) {
      const updated = [...favoriteDishKeywords, trimmed];
      setFavoriteDishKeywords(updated);
      await saveFavoriteDishes(updated);
    }
  }, [favoriteDishKeywords]);

  const removeFavoriteDish = useCallback(async (keyword: string) => {
    const updated = favoriteDishKeywords.filter((k) => k !== keyword);
    setFavoriteDishKeywords(updated);
    await saveFavoriteDishes(updated);
  }, [favoriteDishKeywords]);

  const setFavoriteDishes = useCallback(async (keywords: string[]) => {
    setFavoriteDishKeywords(keywords);
    await saveFavoriteDishes(keywords);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        isLoading,
        favoriteDishKeywords,
        setSelectedSchool,
        setNotificationEnabled,
        setNotificationTime,
        setSelectedMealTypes,
        addFavoriteDish,
        removeFavoriteDish,
        setFavoriteDishes,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
