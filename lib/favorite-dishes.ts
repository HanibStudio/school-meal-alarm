import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITE_DISHES_KEY = 'favorite_dishes';

export interface FavoriteDishes {
  keywords: string[]; // ["계란", "우동", "김밥"]
}

const DEFAULT_FAVORITES: FavoriteDishes = {
  keywords: [],
};

/**
 * 즐겨찾기 반찬 키워드 로드
 */
export async function loadFavoriteDishes(): Promise<FavoriteDishes> {
  try {
    const data = await AsyncStorage.getItem(FAVORITE_DISHES_KEY);
    if (!data) return DEFAULT_FAVORITES;
    return JSON.parse(data);
  } catch (error) {
    console.error('즐겨찾기 로드 오류:', error);
    return DEFAULT_FAVORITES;
  }
}

/**
 * 즐겨찾기 반찬 키워드 저장
 */
export async function saveFavoriteDishes(keywords: string[]): Promise<void> {
  const data: FavoriteDishes = {
    keywords: keywords.filter((k) => k.trim().length > 0),
  };
  await AsyncStorage.setItem(FAVORITE_DISHES_KEY, JSON.stringify(data));
}

/**
 * 키워드 추가
 */
export async function addFavoriteDish(keyword: string): Promise<void> {
  const current = await loadFavoriteDishes();
  const trimmed = keyword.trim();
  if (trimmed && !current.keywords.includes(trimmed)) {
    current.keywords.push(trimmed);
    await saveFavoriteDishes(current.keywords);
  }
}

/**
 * 키워드 제거
 */
export async function removeFavoriteDish(keyword: string): Promise<void> {
  const current = await loadFavoriteDishes();
  current.keywords = current.keywords.filter((k) => k !== keyword);
  await saveFavoriteDishes(current.keywords);
}

/**
 * 반찬명이 즐겨찾기 키워드와 매칭되는지 확인
 */
export function isDishFavorite(dishName: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const lowerDish = dishName.toLowerCase();
  return keywords.some((keyword) => lowerDish.includes(keyword.toLowerCase()));
}

/**
 * 반찬명에서 매칭되는 키워드 찾기
 */
export function getMatchingKeywords(dishName: string, keywords: string[]): string[] {
  if (!keywords || keywords.length === 0) return [];
  const lowerDish = dishName.toLowerCase();
  return keywords.filter((keyword) => lowerDish.includes(keyword.toLowerCase()));
}
