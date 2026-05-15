import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/lib/settings-context';
import { searchSchools, School } from '@/lib/neis-api';

const SCHOOL_TYPE_EMOJI: Record<string, string> = {
  '초등학교': '🏫',
  '중학교': '🏫',
  '고등학교': '🏫',
  '특수학교': '🏫',
  '각종학교': '🏫',
};

export default function SchoolSearchScreen() {
  const colors = useColors();
  const router = useRouter();
  const { setSelectedSchool } = useSettings();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSearch = useCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const schools = await searchSchools(text);
      setResults(schools);
    } catch (err) {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSelectSchool = useCallback(async (school: School) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setSelectedSchool(school);
    router.back();
  }, [setSelectedSchool, router]);

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      gap: 12,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      margin: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.foreground,
      padding: 0,
    },
    searchButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
    },
    searchButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    schoolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
      gap: 12,
    },
    schoolIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    schoolIconText: {
      fontSize: 22,
    },
    schoolInfo: {
      flex: 1,
    },
    schoolName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 2,
    },
    schoolMeta: {
      fontSize: 13,
      color: colors.muted,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      gap: 12,
    },
    emptyText: {
      fontSize: 15,
      color: colors.muted,
      textAlign: 'center',
    },
    hintContainer: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 60,
      gap: 8,
    },
    hintText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  return (
    <ScreenContainer>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.5 : 1 }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>학교 검색</Text>
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="학교 이름을 입력하세요"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={() => handleSearch(query)}
          autoFocus
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              setResults([]);
              setHasSearched(false);
              inputRef.current?.focus();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}
          >
            <IconSymbol name="xmark" size={16} color={colors.muted} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.searchButton, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => {
            Keyboard.dismiss();
            handleSearch(query);
          }}
        >
          <Text style={styles.searchButtonText}>검색</Text>
        </Pressable>
      </View>

      {/* 결과 */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.emptyText}>검색 중...</Text>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40 }}>🔍</Text>
          <Text style={styles.emptyText}>검색 결과가 없습니다{'\n'}다른 학교 이름으로 검색해보세요</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.hintContainer}>
          <Text style={{ fontSize: 40 }}>🏫</Text>
          <Text style={styles.hintText}>
            학교 이름을 입력하고{'\n'}검색 버튼을 눌러주세요{'\n\n'}예) 서울중학교, 강남고등학교
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.ATPT_OFCDC_SC_CODE}-${item.SD_SCHUL_CODE}`}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.schoolItem,
                { backgroundColor: pressed ? colors.surface : 'transparent' },
              ]}
              onPress={() => handleSelectSchool(item)}
            >
              <View style={styles.schoolIconContainer}>
                <Text style={styles.schoolIconText}>
                  {SCHOOL_TYPE_EMOJI[item.SCHUL_KND_SC_NM] ?? '🏫'}
                </Text>
              </View>
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{item.SCHUL_NM}</Text>
                <Text style={styles.schoolMeta}>
                  {item.LCTN_SC_NM} · {item.SCHUL_KND_SC_NM}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </Pressable>
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
