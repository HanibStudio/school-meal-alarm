import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, loadSettings, saveSelectedSchool, saveNotificationSettings, saveMealTypes } from './settings';
import { School } from './neis-api';
import { scheduleDailyMealNotification, cancelDailyNotification, setupNotificationChannel, setupNotificationHandler } from './notifications';

interface SettingsContextValue extends AppSettings {
  isLoading: boolean;
  setSelectedSchool: (school: School | null) => Promise<void>;
  setNotificationEnabled: (enabled: boolean) => Promise<void>;
  setNotificationTime: (hour: number, minute: number) => Promise<void>;
  setSelectedMealTypes: (types: string[]) => Promise<void>;
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

  useEffect(() => {
    setupNotificationHandler();
    setupNotificationChannel();
    loadSettings().then((loaded) => {
      setSettings(loaded);
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

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        isLoading,
        setSelectedSchool,
        setNotificationEnabled,
        setNotificationTime,
        setSelectedMealTypes,
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
