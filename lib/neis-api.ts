/**
 * NEIS 교육정보 개방 포털 API 서비스
 * https://open.neis.go.kr
 */

const NEIS_BASE_URL = 'https://open.neis.go.kr/hub';

export interface School {
  ATPT_OFCDC_SC_CODE: string; // 시도교육청코드
  ATPT_OFCDC_SC_NM: string;   // 시도교육청명
  SD_SCHUL_CODE: string;       // 행정표준코드
  SCHUL_NM: string;            // 학교명
  ENG_SCHUL_NM: string;        // 영문학교명
  SCHUL_KND_SC_NM: string;     // 학교종류명 (초등학교/중학교/고등학교)
  LCTN_SC_NM: string;          // 소재지명
  ORG_RDNMA: string;           // 도로명주소
}

export interface MealItem {
  ATPT_OFCDC_SC_CODE: string;
  SD_SCHUL_CODE: string;
  MMEAL_SC_CODE: string;       // 식사코드 (1:조식, 2:중식, 3:석식)
  MMEAL_SC_NM: string;         // 식사명
  MLSV_YMD: string;            // 급식일자
  MLSV_FGR: string;            // 급식인원수
  DDISH_NM: string;            // 요리명 (<br/> 구분)
  ORPLC_INFO: string;          // 원산지정보
  CAL_INFO: string;            // 칼로리정보
  NTR_INFO: string;            // 영양정보
}

export type MealType = '1' | '2' | '3'; // 1:조식, 2:중식, 3:석식

/**
 * 학교 검색
 */
export async function searchSchools(schoolName: string): Promise<School[]> {
  if (!schoolName.trim()) return [];

  const url = `${NEIS_BASE_URL}/schoolInfo?Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(schoolName)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.schoolInfo && data.schoolInfo[1]?.row) {
      return data.schoolInfo[1].row as School[];
    }
    return [];
  } catch (error) {
    console.error('학교 검색 오류:', error);
    return [];
  }
}

/**
 * 급식 정보 조회
 * @param atptCode 시도교육청코드
 * @param schulCode 행정표준코드
 * @param date 날짜 (YYYYMMDD)
 * @param mealType 식사코드 (1:조식, 2:중식, 3:석식) - 없으면 전체
 */
export async function getMealInfo(
  atptCode: string,
  schulCode: string,
  date: string,
  mealType?: MealType
): Promise<MealItem[]> {
  let url = `${NEIS_BASE_URL}/mealServiceDietInfo?Type=json&pIndex=1&pSize=10&ATPT_OFCDC_SC_CODE=${atptCode}&SD_SCHUL_CODE=${schulCode}&MLSV_YMD=${date}`;

  if (mealType) {
    url += `&MMEAL_SC_CODE=${mealType}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.mealServiceDietInfo && data.mealServiceDietInfo[1]?.row) {
      return data.mealServiceDietInfo[1].row as MealItem[];
    }
    return [];
  } catch (error) {
    console.error('급식 정보 조회 오류:', error);
    return [];
  }
}

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 급식 메뉴 문자열을 배열로 파싱
 * "<br/>" 기준으로 분리하고 알레르기 번호 포함
 */
export function parseMealItems(ddishNm: string): string[] {
  return ddishNm
    .split('<br/>')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * 칼로리 정보에서 숫자만 추출
 * "850.0 Kcal" → "850"
 */
export function parseCalories(calInfo: string): string {
  const match = calInfo.match(/[\d.]+/);
  return match ? Math.round(parseFloat(match[0])).toString() : '';
}

/**
 * 식사 코드를 한국어 이름으로 변환
 */
export function getMealTypeName(code: MealType): string {
  const names: Record<MealType, string> = {
    '1': '조식',
    '2': '중식',
    '3': '석식',
  };
  return names[code] || '급식';
}
