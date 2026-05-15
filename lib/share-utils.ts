import * as Sharing from 'expo-sharing';
import { MealItem, parseMealItems, parseCalories, getMealTypeName, MealType } from './neis-api';

export async function shareMealMenu(meal: MealItem | null, mealType: MealType, schoolName: string, date: string) {
  if (!meal) {
    alert('공유할 급식 정보가 없습니다');
    return;
  }

  const items = parseMealItems(meal.DDISH_NM);
  const calories = parseCalories(meal.CAL_INFO);
  const typeName = getMealTypeName(mealType);

  const shareText = `🍚 ${schoolName} ${date} ${typeName}

${items.join('\n')}

${calories ? `열량: ${calories}` : ''}

급식 알리미에서 공유됨`;

  try {
    await Sharing.shareAsync(shareText, {
      mimeType: 'text/plain',
      dialogTitle: '급식 메뉴 공유',
    });
  } catch (error) {
    console.error('공유 오류:', error);
    alert('공유 중 오류가 발생했습니다');
  }
}
