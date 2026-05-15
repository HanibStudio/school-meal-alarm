import AsyncStorage from '@react-native-async-storage/async-storage';
import { School } from './neis-api';

const KEYS = {
  SELECTED_SCHOOL: 'selected_school',
  NOTIFICATION_ENABLED: 'notification_enabled',
  NOTIFICATION_HOUR: 'notification_hour',
  NOTIFICATION_MINUTE: 'notification_minute',
  SELECTED_MEAL_TYPES: 'selected_meal_types',
} as const;

export interface AppSettings {
  selectedSchool: School | null;
  notificationEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  selectedMealTypes: string[]; // ['1', '2', '3']
}

const DEFAULT_SETTINGS: AppSettings = {
  selectedSchool: null,
  notificationEnabled: false,
  notificationHour: 7,
  notificationMinute: 30,
  selectedMealTypes: ['2'], // 기본: 중식
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const [school, notifEnabled, notifHour, notifMinute, mealTypes] = await Promise.all([
      AsyncStorage.getItem(KEYS.SELECTED_SCHOOL),
      AsyncStorage.getItem(KEYS.NOTIFICATION_ENABLED),
      AsyncStorage.getItem(KEYS.NOTIFICATION_HOUR),
      AsyncStorage.getItem(KEYS.NOTIFICATION_MINUTE),
      AsyncStorage.getItem(KEYS.SELECTED_MEAL_TYPES),
    ]);

    return {
      selectedSchool: school ? JSON.parse(school) : DEFAULT_SETTINGS.selectedSchool,
      notificationEnabled: notifEnabled !== null ? notifEnabled === 'true' : DEFAULT_SETTINGS.notificationEnabled,
      notificationHour: notifHour !== null ? parseInt(notifHour, 10) : DEFAULT_SETTINGS.notificationHour,
      notificationMinute: notifMinute !== null ? parseInt(notifMinute, 10) : DEFAULT_SETTINGS.notificationMinute,
      selectedMealTypes: mealTypes ? JSON.parse(mealTypes) : DEFAULT_SETTINGS.selectedMealTypes,
    };
  } catch (error) {
    console.error('설정 로드 오류:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSelectedSchool(school: School | null): Promise<void> {
  if (school) {
    await AsyncStorage.setItem(KEYS.SELECTED_SCHOOL, JSON.stringify(school));
  } else {
    await AsyncStorage.removeItem(KEYS.SELECTED_SCHOOL);
  }
}

export async function saveNotificationSettings(
  enabled: boolean,
  hour: number,
  minute: number
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.NOTIFICATION_ENABLED, String(enabled)),
    AsyncStorage.setItem(KEYS.NOTIFICATION_HOUR, String(hour)),
    AsyncStorage.setItem(KEYS.NOTIFICATION_MINUTE, String(minute)),
  ]);
}

export async function saveMealTypes(mealTypes: string[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SELECTED_MEAL_TYPES, JSON.stringify(mealTypes));
}
