import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCacheIndex, clearSchoolCache } from './meal-cache';

export interface CacheInfo {
  atptCode: string;
  schulCode: string;
  startDate: string;
  endDate: string;
  count: number;
  sizeBytes: number;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'meal_cache_';

/**
 * 모든 캐시 정보 조회
 */
export async function getAllCacheInfo(): Promise<CacheInfo[]> {
  const index = await getCacheIndex();
  const result: CacheInfo[] = [];

  for (const key in index) {
    const entry = index[key];
    const sizeBytes = await getCacheSize(entry.atptCode, entry.schulCode);
    result.push({
      atptCode: entry.atptCode,
      schulCode: entry.schulCode,
      startDate: entry.startDate,
      endDate: entry.endDate,
      count: entry.count,
      sizeBytes,
      timestamp: entry.timestamp,
    });
  }

  // 최신순 정렬
  return result.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * 특정 학교의 캐시 크기 계산
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

/**
 * 캐시 크기를 읽기 좋은 형식으로 변환
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 전체 캐시 크기 계산
 */
export async function getTotalCacheSize(): Promise<number> {
  const cacheInfos = await getAllCacheInfo();
  return cacheInfos.reduce((sum, info) => sum + info.sizeBytes, 0);
}

/**
 * 날짜 범위 캐시 삭제
 */
export async function deleteCacheByDateRange(
  atptCode: string,
  schulCode: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const allKeys = await AsyncStorage.getAllKeys();
  const keysToDelete: string[] = [];

  // startDate부터 endDate까지의 캐시 키 찾기
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
    const keyPattern = `${CACHE_KEY_PREFIX}${atptCode}_${schulCode}_${dateStr}`;

    const matchingKeys = allKeys.filter((k) => k === keyPattern);
    keysToDelete.push(...matchingKeys);
  }

  if (keysToDelete.length > 0) {
    await AsyncStorage.multiRemove(keysToDelete);
  }

  return keysToDelete.length;
}

/**
 * 특정 학교의 모든 캐시 삭제
 */
export async function deleteAllCacheForSchool(atptCode: string, schulCode: string): Promise<void> {
  await clearSchoolCache(atptCode, schulCode);
}

/**
 * 날짜 포맷팅 (YYYYMMDD → YYYY년 M월 D일)
 */
export function formatCacheDate(dateStr: string): string {
  const year = dateStr.slice(0, 4);
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * 캐시 날짜 범위 포맷팅
 */
export function formatCacheDateRange(startDate: string, endDate: string): string {
  return `${formatCacheDate(startDate)} ~ ${formatCacheDate(endDate)}`;
}
