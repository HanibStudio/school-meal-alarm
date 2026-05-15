import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useSettings } from '@/lib/settings-context';
import { getMealInfo, formatDateToYYYYMMDD, parseMealItems, parseCalories, MealType } from '@/lib/neis-api';
import { getMealFromCache } from '@/lib/meal-cache';
import { useColors } from '@/hooks/use-colors';

export default function WidgetScreen() {
  const colors = useColors();
  const { selectedSchool, selectedMealTypes } = useSettings();
  const [mealData, setMealData] = useState<{ items: string[]; calories: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTodayMeal = async () => {
      if (!selectedSchool) {
        setIsLoading(false);
        return;
      }

      try {
        const today = new Date();
        const dateStr = formatDateToYYYYMMDD(today);
        const mealType = (selectedMealTypes[0] || '2') as MealType;

        // 캐시에서 먼저 확인
        const cached = await getMealFromCache(
          selectedSchool.ATPT_OFCDC_SC_CODE,
          selectedSchool.SD_SCHUL_CODE,
          dateStr
        );

        if (cached) {
          const meal = cached.find((m) => m.MMEAL_SC_CODE === mealType);
          if (meal) {
            const items = parseMealItems(meal.DDISH_NM);
            const calories = parseCalories(meal.CAL_INFO);
            setMealData({ items, calories });
            setIsLoading(false);
            return;
          }
        }

        // API에서 조회
        const meals = await getMealInfo(
          selectedSchool.ATPT_OFCDC_SC_CODE,
          selectedSchool.SD_SCHUL_CODE,
          dateStr,
          mealType
        );

        if (meals.length > 0) {
          const items = parseMealItems(meals[0].DDISH_NM);
          const calories = parseCalories(meals[0].CAL_INFO);
          setMealData({ items, calories });
        }
      } catch (error) {
        console.error('위젯 급식 로드 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTodayMeal();
  }, [selectedSchool, selectedMealTypes]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 16,
      textAlign: 'center',
    },
    menuList: {
      width: '100%',
      gap: 8,
    },
    menuItem: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    calorieText: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
  });

  if (!selectedSchool) {
    return (
      <ScreenContainer style={styles.container}>
        <Text style={styles.emptyText}>학교를 선택해주세요</Text>
      </ScreenContainer>
    );
  }

  if (isLoading) {
    return (
      <ScreenContainer style={styles.container}>
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  if (!mealData || mealData.items.length === 0) {
    return (
      <ScreenContainer style={styles.container}>
        <Text style={styles.emptyText}>오늘의 급식 정보가 없습니다</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.title}>🍚 오늘의 급식</Text>
      <Text style={styles.subtitle}>{selectedSchool.SCHUL_NM}</Text>
      <View style={styles.menuList}>
        {mealData.items.slice(0, 5).map((item, idx) => (
          <Text key={idx} style={styles.menuItem}>
            • {item.replace(/\d[\d.]*\.$/, '').replace(/\(\w+\/?\w*\)/g, '').trim()}
          </Text>
        ))}
        {mealData.items.length > 5 && (
          <Text style={styles.menuItem}>• 외 {mealData.items.length - 5}가지</Text>
        )}
      </View>
      {mealData.calories && (
        <Text style={styles.calorieText}>{mealData.calories}</Text>
      )}
    </ScreenContainer>
  );
}
