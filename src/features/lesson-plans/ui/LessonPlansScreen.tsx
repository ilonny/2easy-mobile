import {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import type {Lesson} from '../../../entities/lesson';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {useLessonPlans} from '../model/useLessonPlans';
import {LessonCard} from './LessonCard';
import {TryNowModal} from './TryNowModal';
import {AppHeader} from '../../app-shell';
import {CreateLessonButton} from '../../lesson-editor';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Lesson>);

export function LessonPlansScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();
  const {
    lessons,
    loading,
    error,
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    tab,
    setTab,
    levelFilters,
    reload,
  } = useLessonPlans();

  const [tryNowVisible, setTryNowVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const headerTranslate = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);

  const listData = useMemo(() => lessons, [lessons]);
  const gap = isTablet ? 16 : 12;

  const showHeader = useCallback(() => {
    if (headerVisible.current) {
      return;
    }
    headerVisible.current = true;
    headerTranslate.stopAnimation();
    Animated.timing(headerTranslate, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [headerTranslate]);

  const hideHeader = useCallback(() => {
    if (!headerVisible.current || headerHeight <= 0) {
      return;
    }
    headerVisible.current = false;
    headerTranslate.stopAnimation();
    Animated.timing(headerTranslate, {
      toValue: -headerHeight,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [headerHeight, headerTranslate]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastScrollY.current;

      if (y <= 8) {
        showHeader();
      } else if (diff > 6 && y > 20) {
        hideHeader();
      } else if (diff < -6) {
        showHeader();
      }

      lastScrollY.current = y;
    },
    [hideHeader, showHeader],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const onPressLesson = (lesson: Lesson) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    if (isTeacher) {
      navigation.navigate('LessonEditor', {lessonId: lesson.id});
      return;
    }
    navigation.navigate('LessonViewer', {
      lessonId: lesson.id,
      from: 'Lessons',
    });
  };

  const listPaddingTop = headerHeight > 0 ? headerHeight + 8 : insets.top + 120;

  return (
    <View style={styles.root}>
      <Animated.View
        onLayout={event => {
          const next = event.nativeEvent.layout.height;
          if (Math.abs(next - headerHeight) > 1) {
            setHeaderHeight(next);
          }
        }}
        style={[
          styles.headerShell,
          {
            paddingTop: insets.top + (isTablet ? 12 : 8),
            paddingHorizontal: pageGutter,
            transform: [{translateY: headerTranslate}],
          },
        ]}>
        <View style={[styles.headerInner, {maxWidth: pageContentMaxWidth}]}>
          <AppHeader />

          <Text style={[styles.pageTitle, isTablet && styles.pageTitleTablet]}>
            {t('lessonPlans.title')}
          </Text>

          {isAuthorized && (
            <View style={styles.tabs}>
              <Pressable
                onPress={() => setTab('my')}
                style={[styles.tab, tab === 'my' && styles.tabActive]}>
                <Text style={[styles.tabLabel, tab === 'my' && styles.tabLabelActive]}>
                  {t('lessonPlans.myLessons')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setTab('twoEasy')}
                style={[styles.tab, tab === 'twoEasy' && styles.tabActive]}>
                <Text
                  style={[
                    styles.tabLabel,
                    tab === 'twoEasy' && styles.tabLabelActive,
                  ]}>
                  {t('lessonPlans.twoEasyLessons')}
                </Text>
              </Pressable>
            </View>
          )}

          {isAuthorized && tab === 'my' ? (
            <View style={styles.createWrap}>
              <CreateLessonButton />
            </View>
          ) : null}

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('lessonPlans.searchPlaceholder')}
            placeholderTextColor={colors.muted}
            style={[styles.search, isTablet && styles.searchTablet]}
            autoCorrect={false}
          />

          {(tab === 'twoEasy' || !isAuthorized) && (
            <View style={styles.filters}>
              {levelFilters.map(filter => {
                const active = levelFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setLevelFilter(filter)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {filter === 'All lessons'
                        ? t('lessonPlans.allLessons')
                        : filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </Animated.View>

      <View
        style={[
          styles.listWrap,
          {paddingHorizontal: pageGutter, maxWidth: pageContentMaxWidth},
        ]}>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => reload()}>
              <Text style={styles.retry}>{t('lessonPlans.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <AnimatedFlatList
            data={listData}
            keyExtractor={item => String(item.id)}
            numColumns={2}
            columnWrapperStyle={[styles.row, {gap}]}
            contentContainerStyle={[
              styles.listContent,
              {paddingTop: listPaddingTop, paddingBottom: insets.bottom + 24},
            ]}
            renderItem={({item}) => (
              <View style={[styles.gridItem, {marginBottom: gap}]}>
                <LessonCard lesson={item} onPress={onPressLesson} />
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('lessonPlans.empty')}</Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onScroll={onScroll}
            scrollEventThrottle={16}
            decelerationRate={Platform.OS === 'ios' ? 0.998 : 0.985}
            bounces
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={13}
            updateCellsBatchingPeriod={40}
          />
        )}
      </View>

      <TryNowModal
        visible={tryNowVisible}
        onClose={() => setTryNowVisible(false)}
        onLogin={() => {
          setTryNowVisible(false);
          navigation.navigate('Login');
        }}
        onRegister={() => {
          setTryNowVisible(false);
          navigation.navigate('Registration');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F5FF',
  },
  headerShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(247, 245, 255, 0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  headerInner: {
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  brandPress: {
    flex: 1,
  },
  pageTitle: {
    marginTop: 12,
    marginBottom: 12,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  createWrap: {
    marginBottom: 12,
  },
  pageTitleTablet: {
    fontSize: 34,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  titleTablet: {
    fontSize: 34,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabelActive: {
    color: colors.primary,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    minHeight: 44,
    paddingHorizontal: 14,
    marginBottom: 12,
    color: colors.text,
    fontSize: 16,
  },
  searchTablet: {
    minHeight: 48,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.white,
  },
  listWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
  },
  gridItem: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: 48,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  retry: {
    color: colors.primary,
    fontWeight: '700',
  },
});
