import { getMealInfo, formatDateToYYYYMMDD, School, MealType } from './neis-api';
import { saveMealToCache, updateCacheIndex } from './meal-cache';

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  errorMessage?: string;
}

/**
 * 날짜 범위 내 모든 급식 데이터 다운로드 및 캐시 저장
 * @param school 학교 정보
 * @param startDate 시작 날짜 (YYYYMMDD)
 * @param endDate 종료 날짜 (YYYYMMDD)
 * @param onProgress 진행률 콜백
 */
export async function downloadMealDataByRange(
  school: School,
  startDate: string,
  endDate: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<{ success: boolean; downloaded: number; error?: string }> {
  try {
    // 날짜 범위 계산
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

    // 날짜 배열 생성
    const dates: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateToYYYYMMDD(new Date(d));
      dates.push(dateStr);
    }

    const total = dates.length;
    let downloaded = 0;

    // 각 날짜별로 급식 데이터 다운로드
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];

      onProgress?.({
        current: i,
        total,
        percentage: Math.round((i / total) * 100),
        status: 'downloading',
      });

      try {
        // 조식, 중식, 석식 모두 다운로드
        const mealTypes: MealType[] = ['1', '2', '3'];

        for (const mealType of mealTypes) {
          const meals = await getMealInfo(
            school.ATPT_OFCDC_SC_CODE,
            school.SD_SCHUL_CODE,
            date,
            mealType
          );

          if (meals.length > 0) {
            await saveMealToCache(
              school.ATPT_OFCDC_SC_CODE,
              school.SD_SCHUL_CODE,
              date,
              meals
            );
          }
        }

        downloaded++;
      } catch (err) {
        console.error(`날짜 ${date} 다운로드 실패:`, err);
        // 개별 날짜 실패는 계속 진행
      }
    }

    // 캐시 인덱스 업데이트
    await updateCacheIndex(
      school.ATPT_OFCDC_SC_CODE,
      school.SD_SCHUL_CODE,
      startDate,
      endDate,
      downloaded
    );

    onProgress?.({
      current: total,
      total,
      percentage: 100,
      status: 'completed',
    });

    return {
      success: true,
      downloaded,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    onProgress?.({
      current: 0,
      total: 0,
      percentage: 0,
      status: 'error',
      errorMessage,
    });

    return {
      success: false,
      downloaded: 0,
      error: errorMessage,
    };
  }
}

/**
 * 날짜 문자열 포맷팅 (YYYYMMDD → YYYY년 M월 D일)
 */
export function formatDateDisplay(dateStr: string): string {
  const year = dateStr.slice(0, 4);
  const month = parseInt(dateStr.slice(4, 6));
  const day = parseInt(dateStr.slice(6, 8));
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * 두 날짜 사이의 일 수 계산
 */
export function getDateDifference(startDate: string, endDate: string): number {
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

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}
