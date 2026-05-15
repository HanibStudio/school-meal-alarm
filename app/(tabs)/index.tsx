import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DateRangePicker } from '@/components/date-range-picker';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/lib/settings-context';
import {
  getMealInfo,
  formatDateToYYYYMMDD,
  parseMealItems,
  parseCalories,
  MealItem,
  MealType,
} from '@/lib/neis-api';
import { getMealFromCache } from '@/lib/meal-cache';
import { downloadMealDataByRange } from '@/lib/bulk-download';

const MEAL_TYPES: { code: MealType; label: string }[] = [
  { code: '1', label: '조식' },
  { code: '2', label: '중식' },
  { code: '3', label: '석식' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDisplayDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return `${year}년 ${month}월 ${day}일 ${weekday}요일`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { selectedSchool, selectedMealTypes } = useSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeMealType, setActiveMealType] = useState<MealType>('2');
  const [mealData, setMealData] = useState<Record<MealType, MealItem | null>>({
    '1': null,
    '2': null,
    '3': null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchMeals = useCallback(async (date: Date) => {
    if (!selectedSchool) return;

    setIsLoading(true);
    const dateStr = formatDateToYYYYMMDD(date);

    try {
      // 캐시에서 먼저 확인
      const cachedMeals: Record<MealType, MealItem | null> = {
        '1': null,
        '2': null,
        '3': null,
      };

      let hasCachedData = false;
      for (const mt of MEAL_TYPES) {
        const cached = await getMealFromCache(
          selectedSchool.ATPT_OFCDC_SC_CODE,
          selectedSchool.SD_SCHUL_CODE,
          dateStr
        );
        if (cached) {
          const mealForType = cached.find((m) => m.MMEAL_SC_CODE === mt.code);
          if (mealForType) {
            cachedMeals[mt.code] = mealForType;
            hasCachedData = true;
          }
        }
      }

      // 캐시 데이터가 있으면 사용, 없으면 API 호출
      if (hasCachedData) {
        setMealData(cachedMeals);
      } else {
        const results = await Promise.all(
          MEAL_TYPES.map((mt) =>
            getMealInfo(
              selectedSchool.ATPT_OFCDC_SC_CODE,
              selectedSchool.SD_SCHUL_CODE,
              dateStr,
              mt.code
            )
          )
        );

        const newData: Record<MealType, MealItem | null> = {
          '1': results[0][0] ?? null,
          '2': results[1][0] ?? null,
          '3': results[2][0] ?? null,
        };
        setMealData(newData);
      }

      // 데이터 있는 첫 번째 식사 탭으로 자동 이동
      const newDataToCheck = hasCachedData ? cachedMeals : { '1': null, '2': null, '3': null };
      const preferred = selectedMealTypes.find((t) => newDataToCheck[t as MealType] !== null);
      if (preferred) setActiveMealType(preferred as MealType);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSchool, selectedMealTypes]);

  useEffect(() => {
    fetchMeals(currentDate);
  }, [currentDate, selectedSchool]);

  const goToPrevDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const goToNextDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const goToToday = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentDate(new Date());
  };

  const handleDownloadData = async (startDate: string, endDate: string) => {
    if (!selectedSchool) return;

    setIsDownloading(true);
    try {
      const result = await downloadMealDataByRange(selectedSchool, startDate, endDate);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // 다운로드 후 현재 날짜 데이터 새로고침
        await fetchMeals(currentDate);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err) {
      console.error(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsDownloading(false);
    }
  };

  const currentMeal = mealData[activeMealType];
  const menuItems = currentMeal ? parseMealItems(currentMeal.DDISH_NM) : [];
  const calories = currentMeal ? parseCalories(currentMeal.CAL_INFO) : '';

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.muted,
    },
    dateNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.surface,
    },
    dateText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    todayBadge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginLeft: 6,
    },
    todayBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 16,
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },
    tabTextActive: {
      color: '#fff',
    },
    mealCard: {
      margin: 16,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    mealCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.primary + '15',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mealCardTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.primary,
    },
    calorieText: {
      fontSize: 13,
      color: colors.muted,
      fontWeight: '500',
    },
    menuList: {
      padding: 16,
      gap: 10,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    menuDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 7,
    },
    menuText: {
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      lineHeight: 22,
    },
    menuAllergyText: {
      fontSize: 11,
      color: colors.muted,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    },
    onboardingCard: {
      margin: 16,
      padding: 24,
      borderRadius: 16,
      backgroundColor: colors.primary + '10',
      borderWidth: 1.5,
      borderColor: colors.primary + '40',
      alignItems: 'center',
      gap: 12,
    },
    onboardingTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
    },
    onboardingDesc: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 20,
    },
    onboardingButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 4,
    },
    onboardingButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700',
    },
  });

  return (
    <ScreenContainer>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {selectedSchool ? selectedSchool.SCHUL_NM : '급식 알리미'}
          </Text>
          {selectedSchool && (
            <Text style={styles.headerSubtitle}>
              {selectedSchool.LCTN_SC_NM} · {selectedSchool.SCHUL_KND_SC_NM}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => router.push('/school-search')}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
        >
          <IconSymbol name="magnifyingglass" size={22} color={colors.primary} />
        </Pressable>
        {selectedSchool && (
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4, marginLeft: 8 }]}
            disabled={isDownloading}
          >
            <IconSymbol name="arrow.down" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 날짜 네비게이터 */}
        <View style={styles.dateNav}>
          <Pressable
            onPress={goToPrevDay}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
          </Pressable>

          <Pressable onPress={goToToday} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.dateText}>{formatDisplayDate(currentDate)}</Text>
            {isToday(currentDate) && (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>오늘</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={goToNextDay}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 8 }]}
          >
            <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {/* 학교 미선택 시 온보딩 */}
        {!selectedSchool ? (
          <View style={styles.onboardingCard}>
            <Text style={{ fontSize: 40 }}>🍚</Text>
            <Text style={styles.onboardingTitle}>학교를 선택해주세요</Text>
            <Text style={styles.onboardingDesc}>
              학교를 검색하고 선택하면{'\n'}매일 급식 메뉴를 확인할 수 있어요
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.onboardingButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => router.push('/school-search')}
            >
              <Text style={styles.onboardingButtonText}>학교 검색하기</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* 식사 탭 */}
            <View style={styles.tabContainer}>
              {MEAL_TYPES.map((mt) => (
                <Pressable
                  key={mt.code}
                  style={[
                    styles.tab,
                    activeMealType === mt.code && styles.tabActive,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveMealType(mt.code);
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeMealType === mt.code && styles.tabTextActive,
                    ]}
                  >
                    {mt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* 급식 카드 */}
            <View style={styles.mealCard}>
              <View style={styles.mealCardHeader}>
                <Text style={styles.mealCardTitle}>
                  {MEAL_TYPES.find((m) => m.code === activeMealType)?.label ?? '급식'} 메뉴
                </Text>
                {calories ? (
                  <Text style={styles.calorieText}>{calories} kcal</Text>
                ) : null}
              </View>

              {isLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={styles.emptyText}>급식 정보를 불러오는 중...</Text>
                </View>
              ) : menuItems.length > 0 ? (
                <View style={styles.menuList}>
                  {menuItems.map((item, idx) => {
                    // 음식명과 알레르기 번호 분리: "현미찹쌀밥(영)" → 음식명 + 알레르기
                    const allergyMatch = item.match(/^(.*?)(\(.*\))?(\d[\d.]*)?$/);
                    const foodName = item.replace(/\d[\d.]*\.$/, '').replace(/\(\w+\/?\w*\)/g, '').trim();
                    const allergyInfo = item.match(/\d[\d.]*\./)?.[0] ?? '';

                    return (
                      <View key={idx} style={styles.menuItem}>
                        <View style={styles.menuDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.menuText}>{foodName}</Text>
                          {allergyInfo ? (
                            <Text style={styles.menuAllergyText}>알레르기: {allergyInfo}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 32 }}>🙅</Text>
                  <Text style={styles.emptyText}>
                    {MEAL_TYPES.find((m) => m.code === activeMealType)?.label} 정보가 없습니다
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 날짜 범위 선택 모달 */}
      <DateRangePicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onConfirm={handleDownloadData}
        isLoading={isDownloading}
      />
    </ScreenContainer>
  );
}

export default HomeScreen;
