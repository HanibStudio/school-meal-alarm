import { describe, it, expect } from 'vitest';
import {
  formatDateToYYYYMMDD,
  parseMealItems,
  parseCalories,
  getMealTypeName,
} from '../lib/neis-api';

describe('formatDateToYYYYMMDD', () => {
  it('날짜를 YYYYMMDD 형식으로 변환한다', () => {
    const date = new Date(2026, 4, 15); // 2026-05-15
    expect(formatDateToYYYYMMDD(date)).toBe('20260515');
  });

  it('월과 일이 한 자리일 때 앞에 0을 붙인다', () => {
    const date = new Date(2026, 0, 5); // 2026-01-05
    expect(formatDateToYYYYMMDD(date)).toBe('20260105');
  });
});

describe('parseMealItems', () => {
  it('<br/>로 구분된 급식 메뉴를 배열로 파싱한다', () => {
    const input = '현미찹쌀밥(친환경/영)<br/>배추된장국(영)5.6.13.<br/>오이배생채(영)13.';
    const result = parseMealItems(input);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('현미찹쌀밥(친환경/영)');
    expect(result[1]).toBe('배추된장국(영)5.6.13.');
  });

  it('빈 문자열은 필터링한다', () => {
    const input = '밥<br/><br/>국';
    const result = parseMealItems(input);
    expect(result).toHaveLength(2);
  });

  it('빈 입력에 빈 배열을 반환한다', () => {
    expect(parseMealItems('')).toHaveLength(0);
  });
});

describe('parseCalories', () => {
  it('칼로리 문자열에서 숫자를 추출한다', () => {
    expect(parseCalories('850.0 Kcal')).toBe('850');
    expect(parseCalories('1234.5 Kcal')).toBe('1235');
  });

  it('숫자가 없으면 빈 문자열을 반환한다', () => {
    expect(parseCalories('')).toBe('');
    expect(parseCalories('정보없음')).toBe('');
  });
});

describe('getMealTypeName', () => {
  it('식사 코드를 한국어 이름으로 변환한다', () => {
    expect(getMealTypeName('1')).toBe('조식');
    expect(getMealTypeName('2')).toBe('중식');
    expect(getMealTypeName('3')).toBe('석식');
  });
});
