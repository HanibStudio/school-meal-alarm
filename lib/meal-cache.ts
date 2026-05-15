import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealItem } from './neis-api';

const CACHE_KEY_PREFIX = 'meal_cache_';
const CACHE_INDEX_KEY = 'meal_cache_index';

export interface CachedMealData {
  atptCode: string;
  schulCode: string;
  date: string; // YYYYMMDD
  meals: MealItem[];
  timestamp: number; // 캐시 생성 시간
}

export interface CacheIndex {
  [key: string]: {
    atptCode: string;
    schulCode: string;
    startDate: string;
    endDate: string;
    count: number;
    timestamp: number;
  };
}

/**
 * 캐시 키 생성
 */
function getCacheKey(atptCode: string, schulCode: string, date: string): string {
  return `${CACHE_KEY_PREFIX}${atptCode}_${schulCode}_${date}`;
}

/**
 * 특정 날짜의 급식 데이터 캐시에 저장
 */
export async function saveMealToCache(
  atptCode: string,
  schulCode: string,
  date: string,
  meals: MealItem[]
): Promise<void> {
  const key = getCacheKey(atptCode, schulCode, date);
  const data: CachedMealData = {
    atptCode,
    schulCode,
    date,
    meals,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

/**
 * 특정 날짜의 급식 데이터 캐시에서 조회
 */
export async function getMealFromCache(
  atptCode: string,
  schulCode: string,
  date: string
): Promise<MealItem[] | null> {
  const key = getCacheKey(atptCode, schulCode, date);
  const data = await AsyncStorage.getItem(key);
  if (!data) return null;

  try {
    const cached: CachedMealData = JSON.parse(data);
    return cached.meals;
  } catch {
    return null;
  }
}

/**
 * 날짜 범위 내 모든 급식 데이터 캐시에서 조회
 */
export async function getMealsFromCacheByRange(
  atptCode: string,
  schulCode: string,
  startDate: string, // YYYYMMDD
  endDate: string // YYYYMMDD
): Promise<Map<string, MealItem[]>> {
  const result = new Map<string, MealItem[]>();

  // startDate부터 endDate까지 반복
  const start = new Date(
    parseInt(startDate.slice(0, 4)),
    parseInt(startDate.slice(4, 6)) - 1,
    parseInt(startDate.slice(6, 8))
  );
  const end = new Date(
    parseInt(endDate.slice(0, 4)),
    parseInt(endDate.slice(4, 6)) - 1,
    parseInt(endDate.slice(6, 8))
  );

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    const meals = await getMealFromCache(atptCode, schulCode, dateStr);
    if (meals) {
      result.set(dateStr, meals);
    }
  }

  return result;
}

/**
 * 캐시 인덱스 업데이트 (다운로드 범위 기록)
 */
export async function updateCacheIndex(
  atptCode: string,
  schulCode: string,
  startDate: string,
  endDate: string,
  count: number
): Promise<void> {
  const indexKey = `${atptCode}_${schulCode}`;
  const index: CacheIndex = {};

  const existing = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  if (existing) {
    Object.assign(index, JSON.parse(existing));
  }

  index[indexKey] = {
    atptCode,
    schulCode,
    startDate,
    endDate,
    count,
    timestamp: Date.now(),
  };

  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
}

/**
 * 캐시 인덱스 조회
 */
export async function getCacheIndex(): Promise<CacheIndex> {
  const data = await AsyncStorage.getItem(CACHE_INDEX_KEY);
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * 특정 학교의 캐시된 데이터 범위 조회
 */
export async function getCachedDateRange(
  atptCode: string,
  schulCode: string
): Promise<{ startDate: string; endDate: string } | null> {
  const index = await getCacheIndex();
  const key = `${atptCode}_${schulCode}`;
  const entry = index[key];
  if (!entry) return null;

  return {
    startDate: entry.startDate,
    endDate: entry.endDate,
  };
}

/**
 * 특정 학교의 모든 캐시 삭제
 */
export async function clearSchoolCache(atptCode: string, schulCode: string): Promise<void> {
  // 캐시 인덱스에서 제거
  const index = await getCacheIndex();
  const key = `${atptCode}_${schulCode}`;
  delete index[key];
  await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));

  // 개별 캐시 항목 삭제
  const allKeys = await AsyncStorage.getAllKeys();
  const keysToDelete = allKeys.filter(
    (k) => k.startsWith(CACHE_KEY_PREFIX) && k.includes(`${atptCode}_${schulCode}`)
  );
  await AsyncStorage.multiRemove(keysToDelete);
}

/**
 * 캐시 크기 계산 (바이트)
 */
export async function getCacheSize(atptCode: string, schulCode: string): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const relevantKeys = allKeys.filter(
    (k) => k.startsWith(CACHE_KEY_PREFIX) && k.includes(`${atptCode}_${schulCode}`)
  );

  let totalSize = 0;
  for (const key of relevantKeys) {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      totalSize += new TextEncoder().encode(data).length;
    }
  }

  return totalSize;
}
