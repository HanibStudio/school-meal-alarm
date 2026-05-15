import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/lib/settings-context';
import { getAllCacheInfo, formatCacheSize, formatCacheDateRange, deleteCacheByDateRange, deleteAllCacheForSchool } from '@/lib/cache-management';
import { useTheme, ThemeMode } from '@/lib/theme-context';
import { CacheInfo } from '@/lib/cache-management';

const MEAL_TYPE_OPTIONS = [
  { code: '1', label: '조식 (아침)' },
  { code: '2', label: '중식 (점심)' },
  { code: '3', label: '석식 (저녁)' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'system', label: '시스템 설정' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { themeMode, setThemeMode } = useTheme();
  const {
    selectedSchool,
    notificationEnabled,
    notificationHour,
    notificationMinute,
    selectedMealTypes,
    favoriteDishKeywords,
    setNotificationEnabled,
    setNotificationTime,
    setSelectedMealTypes,
    addFavoriteDish,
    removeFavoriteDish,
  } = useSettings();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(notificationHour);
  const [tempMinute, setTempMinute] = useState(notificationMinute);
  const [showFavoriteDishInput, setShowFavoriteDishInput] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [cacheInfos, setCacheInfos] = useState<CacheInfo[]>([]);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [selectedCacheForDelete, setSelectedCacheForDelete] = useState<CacheInfo | null>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    setIsLoadingCache(true);
    try {
      const infos = await getAllCacheInfo();
      setCacheInfos(infos);
    } catch (err) {
      console.error('캐시 정보 로드 오류:', err);
    } finally {
      setIsLoadingCache(false);
    }
  };

  const handleToggleNotification = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (value && !selectedSchool) {
      router.push('/school-search');
      return;
    }
    await setNotificationEnabled(value);
  };

  const handleToggleMealType = async (code: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = selectedMealTypes;
    let updated: string[];
    if (current.includes(code)) {
      if (current.length === 1) return;
      updated = current.filter((c) => c !== code);
    } else {
      updated = [...current, code].sort();
    }
    await setSelectedMealTypes(updated);
  };

  const handleConfirmTime = async () => {
    await setNotificationTime(tempHour, tempMinute);
    setShowTimePicker(false);
  };

  const handleAddFavoriteDish = async () => {
    if (newKeyword.trim()) {
      await addFavoriteDish(newKeyword);
      setNewKeyword('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteCache = async (cacheInfo: CacheInfo) => {
    Alert.alert(
      '캐시 삭제',
      `${formatCacheDateRange(cacheInfo.startDate, cacheInfo.endDate)}의 데이터를 삭제하시겠습니까?`,
      [
        { text: '취소', onPress: () => {}, style: 'cancel' },
        {
          text: '삭제',
          onPress: async () => {
            try {
              await deleteCacheByDateRange(
                cacheInfo.atptCode,
                cacheInfo.schulCode,
                cacheInfo.startDate,
                cacheInfo.endDate
              );
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadCacheInfo();
            } catch (err) {
              console.error('캐시 삭제 오류:', err);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour < 12 ? '오전' : '오후';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${period} ${displayHour}:${String(minute).padStart(2, '0')}`;
  };

  const getThemeLabel = (mode: ThemeMode) => {
    return THEME_OPTIONS.find((opt) => opt.value === mode)?.label || '시스템 설정';
  };

  const handleSetTheme = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setShowThemeSelector(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const styles = StyleSheet.create({
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.foreground,
    },
    section: {
      marginTop: 24,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowDivider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.foreground,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 15,
      color: colors.muted,
    },
    rowValuePrimary: {
      fontSize: 15,
      color: colors.primary,
      fontWeight: '600',
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    checkBox: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBoxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkLabel: {
      flex: 1,
      fontSize: 16,
      color: colors.foreground,
      fontWeight: '500',
    },
    noSchoolText: {
      fontSize: 14,
      color: colors.muted,
      fontStyle: 'italic',
    },
    infoText: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 8,
      paddingHorizontal: 4,
      lineHeight: 18,
    },
    // 반찬 키워드 태그
    keywordTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary + '20',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
      marginRight: 8,
      marginBottom: 8,
    },
    keywordText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    keywordRemoveButton: {
      padding: 2,
    },
    keywordInput: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 8,
    },
    // 캐시 정보
    cacheItem: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cacheItemInfo: {
      flex: 1,
    },
    cacheItemDate: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    cacheItemSize: {
      fontSize: 12,
      color: colors.muted,
    },
    cacheItemDeleteButton: {
      padding: 8,
    },
    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 20,
    },
    timePickerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginBottom: 24,
    },
    pickerColumn: {
      alignItems: 'center',
      gap: 4,
    },
    pickerLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    pickerScroll: {
      height: 160,
      width: 80,
    },
    pickerItem: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
    },
    pickerItemActive: {
      backgroundColor: colors.primary + '20',
    },
    pickerItemText: {
      fontSize: 20,
      color: colors.muted,
      fontWeight: '500',
    },
    pickerItemTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    modalCancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
    },
    modalConfirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },
  });

  return (
    <ScreenContainer>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 학교 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>학교</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.border + '30' : 'transparent' },
              ]}
              onPress={() => router.push('/school-search')}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FF6B3520' }]}>
                <Text style={{ fontSize: 18 }}>🏫</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>
                  {selectedSchool ? selectedSchool.SCHUL_NM : '학교를 선택해주세요'}
                </Text>
                {selectedSchool && (
                  <Text style={styles.noSchoolText}>
                    {selectedSchool.LCTN_SC_NM} · {selectedSchool.SCHUL_KND_SC_NM}
                  </Text>
                )}
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#FF6B3520' }]}>
                <IconSymbol
                  name={notificationEnabled ? 'bell.fill' : 'bell.slash.fill'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.rowLabel}>급식 알림</Text>
              <Switch
                value={notificationEnabled}
                onValueChange={handleToggleNotification}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.rowDivider} />

            <Pressable
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? colors.border + '30' : 'transparent',
                  opacity: notificationEnabled ? 1 : 0.4,
                },
              ]}
              onPress={() => {
                if (!notificationEnabled) return;
                setTempHour(notificationHour);
                setTempMinute(notificationMinute);
                setShowTimePicker(true);
              }}
              disabled={!notificationEnabled}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#4CAF5020' }]}>
                <Text style={{ fontSize: 18 }}>⏰</Text>
              </View>
              <Text style={styles.rowLabel}>알림 시간</Text>
              <Text style={styles.rowValuePrimary}>
                {formatTime(notificationHour, notificationMinute)}
              </Text>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
          {!selectedSchool && (
            <Text style={styles.infoText}>
              * 학교를 먼저 선택해야 알림을 설정할 수 있습니다
            </Text>
          )}
        </View>

        {/* 급식 종류 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>급식 종류</Text>
          <View style={styles.card}>
            {MEAL_TYPE_OPTIONS.map((option, idx) => (
              <View key={option.code}>
                {idx > 0 && <View style={styles.rowDivider} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.checkRow,
                    { backgroundColor: pressed ? colors.border + '30' : 'transparent' },
                  ]}
                  onPress={() => handleToggleMealType(option.code)}
                >
                  <View
                    style={[
                      styles.checkBox,
                      selectedMealTypes.includes(option.code) && styles.checkBoxActive,
                    ]}
                  >
                    {selectedMealTypes.includes(option.code) && (
                      <IconSymbol name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.checkLabel}>{option.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* 테마 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테마</Text>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? colors.border + '30' : 'transparent' },
              ]}
              onPress={() => setShowThemeSelector(true)}
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FF6B3520' }]}>
                <IconSymbol name="sun.max.fill" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>배경 테마</Text>
                <Text style={styles.noSchoolText}>{getThemeLabel(themeMode)}</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          </View>
        </View>


        {/* 좋아하는 반찬 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>좋아하는 반찬</Text>
          <View style={[styles.card, { padding: 16 }]}>
            {favoriteDishKeywords.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {favoriteDishKeywords.map((keyword) => (
                  <View key={keyword} style={styles.keywordTag}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                    <Pressable
                      style={styles.keywordRemoveButton}
                      onPress={() => removeFavoriteDish(keyword)}
                    >
                      <IconSymbol name="xmark" size={14} color={colors.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  backgroundColor: colors.primary + '10',
                  borderRadius: 10,
                },
              ]}
              onPress={() => setShowFavoriteDishInput(true)}
            >
              <IconSymbol name="plus" size={18} color={colors.primary} />
              <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>
                반찬 추가
              </Text>
            </Pressable>
          </View>
          <Text style={styles.infoText}>
            * 입력한 반찬이 급식 메뉴에 있으면 하이라이트됩니다
          </Text>
        </View>

        {/* 캐시 관리 */}
        {selectedSchool && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>캐시 관리</Text>
            <View style={styles.card}>
              {isLoadingCache ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} size="large" />
                </View>
              ) : cacheInfos.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>
                    다운로드된 데이터가 없습니다
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={cacheInfos}
                  keyExtractor={(item, idx) => idx.toString()}
                  renderItem={({ item, index }) => (
                    <>
                      {index > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.cacheItem}>
                        <View style={styles.cacheItemInfo}>
                          <Text style={styles.cacheItemDate}>
                            {formatCacheDateRange(item.startDate, item.endDate)}
                          </Text>
                          <Text style={styles.cacheItemSize}>
                            {formatCacheSize(item.sizeBytes)} · {item.count}일
                          </Text>
                        </View>
                        <Pressable
                          style={styles.cacheItemDeleteButton}
                          onPress={() => handleDeleteCache(item)}
                        >
                          <IconSymbol name="trash" size={18} color={colors.error} />
                        </Pressable>
                      </View>
                    </>
                  )}
                  scrollEnabled={false}
                />
              )}
            </View>
          </View>
        )}

        {/* 앱 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#0a7ea420' }]}>
                <IconSymbol name="info.circle" size={18} color="#0a7ea4" />
              </View>
              <Text style={styles.rowLabel}>버전</Text>
              <Text style={styles.rowValue}>1.0.0</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <View style={[styles.rowIcon, { backgroundColor: '#0a7ea420' }]}>
                <Text style={{ fontSize: 18 }}>📊</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>데이터 출처</Text>
                <Text style={styles.noSchoolText}>나이스 교육정보 개방 포털</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 반찬 추가 모달 */}
      <Modal
        visible={showFavoriteDishInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFavoriteDishInput(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFavoriteDishInput(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>좋아하는 반찬 추가</Text>

            <TextInput
              style={styles.keywordInput}
              placeholder="반찬 이름 입력 (예: 계란, 우동, 김밥)"
              placeholderTextColor={colors.muted}
              value={newKeyword}
              onChangeText={setNewKeyword}
              returnKeyType="done"
              onSubmitEditing={handleAddFavoriteDish}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setShowFavoriteDishInput(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleAddFavoriteDish}
              >
                <Text style={styles.modalConfirmText}>추가</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 시간 선택 모달 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTimePicker(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>알림 시간 설정</Text>

            <View style={styles.timePickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>시</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.pickerItem,
                        tempHour === h && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTempHour(h);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempHour === h && styles.pickerItemTextActive,
                        ]}
                      >
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground, alignSelf: 'center', marginTop: 20 }}>:</Text>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>분</Text>
                <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.pickerItem,
                        tempMinute === m && styles.pickerItemActive,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTempMinute(m);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerItemText,
                          tempMinute === m && styles.pickerItemTextActive,
                        ]}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Text style={{ textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 20 }}>
              {formatTime(tempHour, tempMinute)}
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmButton,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={handleConfirmTime}
              >
                <Text style={styles.modalConfirmText}>확인</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* 테마 선택 모달 */}
      <Modal
        visible={showThemeSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeSelector(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: '#00000050' }]}
          onPress={() => setShowThemeSelector(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>테마 선택</Text>

            <View style={{ gap: 12, marginBottom: 24 }}>
              {THEME_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: pressed ? colors.border + '20' : colors.surface,
                      borderWidth: themeMode === option.value ? 2 : 1,
                      borderColor: themeMode === option.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSetTheme(option.value)}
                >
                  <View
                    style={[
                      {
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      },
                      themeMode === option.value && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    {themeMode === option.value && (
                      <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      { fontSize: 16, color: colors.foreground, fontWeight: '500' },
                      themeMode === option.value && { fontWeight: '700' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.modalConfirmButton, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setShowThemeSelector(false)}
            >
              <Text style={styles.modalConfirmText}>닫기</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
