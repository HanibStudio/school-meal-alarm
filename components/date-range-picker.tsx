import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from './ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { formatDateDisplay, getDateDifference } from '@/lib/bulk-download';

interface DateRangePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => Promise<void>;
  isLoading?: boolean;
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DateRangePicker({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}: DateRangePickerProps) {
  const colors = useColors();
  const today = new Date();

  const [startDate, setStartDate] = useState(formatDateToYYYYMMDD(today));
  const [endDate, setEndDate] = useState(formatDateToYYYYMMDD(today));
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());
  const [displayYear, setDisplayYear] = useState(today.getFullYear());

  const handleDateSelect = (day: number) => {
    const year = displayYear;
    const month = displayMonth;
    const dateStr = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;

    // 시작 날짜와 종료 날짜 자동 설정
    if (startDate === '' || dateStr < startDate) {
      setStartDate(dateStr);
      setEndDate('');
    } else if (endDate === '' || dateStr > endDate) {
      setEndDate(dateStr);
    } else {
      setStartDate(dateStr);
      setEndDate('');
    }
  };

  const handleConfirm = async () => {
    if (!startDate || !endDate) {
      alert('시작 날짜와 종료 날짜를 모두 선택해주세요');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onConfirm(startDate, endDate);
    onClose();
  };

  const handleReset = () => {
    setStartDate(formatDateToYYYYMMDD(today));
    setEndDate(formatDateToYYYYMMDD(today));
  };

  const prevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear(displayYear - 1);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear(displayYear + 1);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  const daysInMonth = getMonthDays(displayYear, displayMonth);
  const firstDayOfMonth = new Date(displayYear, displayMonth, 1).getDay();
  const days: (number | null)[] = Array(firstDayOfMonth).fill(null);
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDateInRange = (day: number) => {
    if (!day) return false;
    const dateStr = `${displayYear}${String(displayMonth + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    return startDate && endDate && dateStr >= startDate && dateStr <= endDate;
  };

  const isStartDate = (day: number) => {
    if (!day) return false;
    const dateStr = `${displayYear}${String(displayMonth + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    return dateStr === startDate;
  };

  const isEndDate = (day: number) => {
    if (!day) return false;
    const dateStr = `${displayYear}${String(displayMonth + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    return dateStr === endDate;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    closeButton: {
      padding: 4,
    },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    monthTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
    },
    navButton: {
      padding: 8,
    },
    weekdayRow: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    weekday: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      paddingVertical: 8,
    },
    dayRow: {
      flexDirection: 'row',
      marginBottom: 4,
      paddingHorizontal: 4,
    },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      marginHorizontal: 2,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    dayInRange: {
      backgroundColor: colors.primary + '30',
    },
    daySelected: {
      backgroundColor: colors.primary,
    },
    daySelectedText: {
      color: '#fff',
      fontWeight: '700',
    },
    dateDisplay: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginTop: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dateDisplayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    dateLabel: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
    dateValue: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '700',
    },
    dayCount: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 8,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    confirmButtonText: {
      color: '#fff',
    },
  });

  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={() => {}}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>급식 데이터 다운로드</Text>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 월 네비게이션 */}
            <View style={styles.monthHeader}>
              <Pressable style={styles.navButton} onPress={prevMonth}>
                <IconSymbol name="chevron.left" size={20} color={colors.foreground} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {displayYear}년 {displayMonth + 1}월
              </Text>
              <Pressable style={styles.navButton} onPress={nextMonth}>
                <IconSymbol name="chevron.right" size={20} color={colors.foreground} />
              </Pressable>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.weekdayRow}>
              {weekdays.map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            {/* 날짜 그리드 */}
            {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => (
              <View key={weekIdx} style={styles.dayRow}>
                {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((day, dayIdx) => (
                  <TouchableOpacity
                    key={dayIdx}
                    style={[
                      styles.dayCell,
                      isDateInRange(day!) && styles.dayInRange,
                      (isStartDate(day!) || isEndDate(day!)) && styles.daySelected,
                    ]}
                    onPress={() => day && handleDateSelect(day)}
                    disabled={!day || isLoading}
                  >
                    {day ? (
                      <Text
                        style={[
                          styles.dayText,
                          (isStartDate(day) || isEndDate(day)) && styles.daySelectedText,
                        ]}
                      >
                        {day}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* 선택된 날짜 표시 */}
            {(startDate || endDate) && (
              <View style={styles.dateDisplay}>
                <View style={styles.dateDisplayRow}>
                  <Text style={styles.dateLabel}>시작 날짜</Text>
                  <Text style={styles.dateValue}>
                    {startDate ? formatDateDisplay(startDate) : '선택 안 함'}
                  </Text>
                </View>
                <View style={styles.dateDisplayRow}>
                  <Text style={styles.dateLabel}>종료 날짜</Text>
                  <Text style={styles.dateValue}>
                    {endDate ? formatDateDisplay(endDate) : '선택 안 함'}
                  </Text>
                </View>
                {startDate && endDate && (
                  <Text style={styles.dayCount}>
                    총 {getDateDifference(startDate, endDate)}일의 데이터
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.buttons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handleReset}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>초기화</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={handleConfirm}
              disabled={isLoading || !startDate || !endDate}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>다운로드 중...</Text>
                </>
              ) : (
                <>
                  <IconSymbol name="arrow.down" size={16} color="#fff" />
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>다운로드</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
