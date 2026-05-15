import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { School, getMealInfo, formatDateToYYYYMMDD, parseMealItems, getMealTypeName, MealType } from './neis-api';

const NOTIFICATION_CHANNEL_ID = 'meal-alarm';
const DAILY_NOTIFICATION_ID = 'daily-meal-notification';

/**
 * 알림 핸들러 설정 (앱 포그라운드에서도 알림 표시)
 */
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Android 알림 채널 설정
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: '급식 알림',
      description: '매일 아침 학교 급식 메뉴를 알려드립니다',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
      sound: 'default',
    });
  }
}

/**
 * 알림 권한 요청
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * 기존 일일 알림 취소
 */
export async function cancelDailyNotification() {
  // 웹 환경에서는 알림 기능 미지원
  if (Platform.OS === 'web') return;
  
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_NOTIFICATION_ID);
  } catch (error) {
    console.error('알림 취소 오류:', error);
  }
}

/**
 * 일일 급식 알림 예약
 */
export async function scheduleDailyMealNotification(
  hour: number,
  minute: number,
  school: School,
  mealTypes: string[]
): Promise<boolean> {
  // 웹 환경에서는 알림 기능 미지원
  if (Platform.OS === 'web') {
    console.warn('알림 기능은 모바일 환경에서만 지원됩니다');
    return false;
  }
  
  try {
    // 기존 알림 취소
    await cancelDailyNotification();

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    // 오늘 날짜 급식 정보 미리 가져와서 알림 내용 구성
    const today = new Date();
    const dateStr = formatDateToYYYYMMDD(today);

    let mealSummary = '';
    for (const mealType of mealTypes as MealType[]) {
      const meals = await getMealInfo(
        school.ATPT_OFCDC_SC_CODE,
        school.SD_SCHUL_CODE,
        dateStr,
        mealType
      );
      if (meals.length > 0) {
        const items = parseMealItems(meals[0].DDISH_NM);
        const typeName = getMealTypeName(mealType);
        mealSummary += `[${typeName}] ${items.slice(0, 3).join(', ')}`;
        if (items.length > 3) mealSummary += ` 외 ${items.length - 3}가지`;
        mealSummary += '\n';
      }
    }

    const body = mealSummary.trim() || '오늘의 급식 정보를 확인하세요!';

    // 매일 반복 알림 예약
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_NOTIFICATION_ID,
      content: {
        title: `🍚 ${school.SCHUL_NM} 오늘의 급식`,
        body,
        sound: 'default',
        data: { type: 'daily-meal' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === 'android' ? NOTIFICATION_CHANNEL_ID : undefined,
      } as unknown as Notifications.DailyTriggerInput,
    });

    return true;
  } catch (error) {
    console.error('알림 예약 오류:', error);
    return false;
  }
}

/**
 * 현재 예약된 알림 목록 조회
 */
export async function getScheduledNotifications() {
  // 웹 환경에서는 알림 기능 미지원
  if (Platform.OS === 'web') return [];
  
  return Notifications.getAllScheduledNotificationsAsync();
}
