import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {isLessonLockedOnFreeTariff, isTeacherLessonAccessBlocked, sortLessonsFreeFirst, TWO_EASY_USER_ID, type Lesson} from '../../../entities/lesson';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {catalogTileWidth, useLayout} from '../../../shared/lib/layout';
import {
  ActionMenuModal,
  AppDialog,
  Button,
  type ActionMenuItem,
} from '../../../shared/ui';
import {useSubscription} from '../../home/model/useSubscription';
import {
  AttachBoardToStudentsModal,
  CreateBoardModal,
  EditBoardModal,
  deleteBoard,
  fetchBoards,
  type Board,
} from '../../boards';
import {
  copyLesson,
  deleteLesson,
} from '../../lesson-player/api/lessonApi';
import {EditLessonMetaModal, CreateLessonButton} from '../../lesson-editor';
import {AppHeader} from '../../app-shell';
import type {Course} from '../api/coursesApi';
import {useLessonPlans} from '../model/useLessonPlans';
import {AddLessonToCourseModal} from './AddLessonToCourseModal';
import {AttachLessonToStudentsModal} from './AttachLessonToStudentsModal';
import {CreateCourseModal} from './CreateCourseModal';
import {LessonCard} from './LessonCard';
import {TryNowModal} from './TryNowModal';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type CatalogRow = Lesson | Course | Board;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<CatalogRow>);

export function LessonPlansScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {hasSubscription, subscription, loading: subLoading} =
    useSubscription();
  const {t} = useI18n();
  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const isStudent = !!profile?.isStudent;
  const isFreeTariff = subscription?.subscribe_type_id === 1;
  const profileId = Number(profile?.id || profile?.user_id || 0);
  const {isTablet, pageGutter, pageContentMaxWidth, catalogColumns, catalogRowWidth} =
    useLayout();
  const {
    lessons,
    courses,
    isCoursesTab,
    isBoardsTab,
    hasMyCourses,
    hasTwoEasyCourses,
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

  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(false);
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [editBoard, setEditBoard] = useState<Board | null>(null);
  const [attachBoard, setAttachBoard] = useState<Board | null>(null);
  const [deleteBoardTarget, setDeleteBoardTarget] = useState<Board | null>(null);
  const [menuBoard, setMenuBoard] = useState<Board | null>(null);

  const [menuLesson, setMenuLesson] = useState<Lesson | null>(null);
  const [menuCourse, setMenuCourse] = useState<Course | null>(null);
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [attachLesson, setAttachLesson] = useState<Lesson | null>(null);
  const [attachCourse, setAttachCourse] = useState<Course | null>(null);
  const [courseLesson, setCourseLesson] = useState<Lesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const headerTranslate = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);

  const listData = useMemo(() => {
    if (isBoardsTab) {
      const q = search.trim().toLowerCase();
      if (!q) {
        return boards;
      }
      return boards.filter(
        b =>
          b.title?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.tags?.toLowerCase().includes(q),
      );
    }
    const rows = isCoursesTab ? courses : lessons;
    if (isCoursesTab || !isFreeTariff || isStudent) {
      return rows;
    }
    return sortLessonsFreeFirst(rows as Lesson[]);
  }, [
    isBoardsTab,
    boards,
    search,
    isCoursesTab,
    courses,
    lessons,
    isFreeTariff,
    isStudent,
  ]);

  const loadBoards = useCallback(async () => {
    if (!isAuthorized || (!isTeacher && !isStudent)) {
      setBoards([]);
      return;
    }
    setBoardsLoading(true);
    try {
      const res = await fetchBoards(
        isStudent && profile?.studentId
          ? {studentId: Number(profile.studentId)}
          : undefined,
      );
      setBoards(res.success === false ? [] : res.boards || []);
    } catch {
      setBoards([]);
    } finally {
      setBoardsLoading(false);
    }
  }, [isAuthorized, isTeacher, isStudent, profile?.studentId]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const showBoardsTab = isAuthorized && isTeacher;
  const gap = isTablet ? 16 : 12;
  const tileWidth = catalogTileWidth(catalogRowWidth, catalogColumns, gap);

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
    if (isBoardsTab) {
      await loadBoards();
    } else {
      await reload();
    }
    setRefreshing(false);
  };

  const requireSubscription = () => {
    if (isStudent) {
      return true;
    }
    if (subLoading) {
      return false;
    }
    if (!hasSubscription) {
      navigation.navigate('Subscription');
      return false;
    }
    return true;
  };

  const onPressLesson = (lesson: Lesson) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    if (subLoading) {
      return;
    }
    if (
      isTeacherLessonAccessBlocked(lesson, {
        isStudent,
        hasSubscription,
        isFreeTariff,
      })
    ) {
      navigation.navigate('Subscription');
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

  const onPressCourse = (course: Course) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    navigation.navigate('Course', {courseId: course.id});
  };

  const onMenuPress = (lesson: Lesson) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    if (!requireSubscription()) {
      return;
    }
    setMenuCourse(null);
    setMenuLesson(lesson);
  };

  const onCourseMenuPress = (course: Course) => {
    if (!isAuthorized) {
      setTryNowVisible(true);
      return;
    }
    if (!requireSubscription()) {
      return;
    }
    setMenuLesson(null);
    setMenuCourse(course);
  };

  const onBoardMenuPress = (board: Board) => {
    if (!requireSubscription()) {
      return;
    }
    setMenuLesson(null);
    setMenuCourse(null);
    setMenuBoard(board);
  };

  const openCreateBoard = () => {
    if (!requireSubscription()) {
      return;
    }
    setCreateBoardOpen(true);
  };

  const menuItems: ActionMenuItem[] = useMemo(() => {
    if (menuBoard) {
      return [
        {
          label: t('boards.editBoard'),
          onPress: () => setEditBoard(menuBoard),
        },
        {
          label: t('boards.attachToStudent'),
          onPress: () => setAttachBoard(menuBoard),
        },
        {
          label: t('boards.startBoardLesson'),
          onPress: () =>
            navigation.navigate('BoardViewer', {
              boardId: menuBoard.id,
              catalog: false,
            }),
        },
        {
          label: t('common.delete'),
          destructive: true,
          onPress: () => setDeleteBoardTarget(menuBoard),
        },
      ];
    }
    if (menuCourse) {
      const ownCourse =
        profileId > 0 && Number(menuCourse.user_id) === profileId;
      return [
        ...(ownCourse
          ? [
              {
                label: t('lessons.editCourse'),
                onPress: () => setEditCourse(menuCourse),
              },
            ]
          : []),
        {
          label: t('lessons.attachToStudent'),
          onPress: () => setAttachCourse(menuCourse),
        },
      ];
    }
    if (!menuLesson) {
      return [];
    }
    const own =
      profileId > 0 && Number(menuLesson.user_id) === profileId;
    const twoEasy = Number(menuLesson.user_id) === TWO_EASY_USER_ID;
    const lesson = menuLesson;
    const items: ActionMenuItem[] = [];
    if (own) {
      items.push({
        label: t('lessons.edit'),
        onPress: () => setEditLesson(lesson),
      });
    }
    items.push({
      label: t('lessons.attachToStudent'),
      onPress: () => setAttachLesson(lesson),
    });
    items.push({
      label: t('lessons.addToCourse'),
      onPress: () => setCourseLesson(lesson),
    });
    items.push({
      label: twoEasy ? t('lessons.addToMyLessons') : t('lessons.copyLesson'),
      onPress: () => {
        void (async () => {
          try {
            const res = await copyLesson(lesson.id);
            if (res.success === false) {
              setNotice(t('lessons.lessonCopyFailed'));
              return;
            }
            setNotice(res.successMessage || t('lessons.lessonCopied'));
            await reload();
          } catch {
            setNotice(t('lessons.lessonCopyFailed'));
          }
        })();
      },
    });
    if (own) {
      items.push({
        label: t('common.delete'),
        destructive: true,
        onPress: () => setDeleteTarget(lesson),
      });
    }
    return items;
  }, [menuBoard, menuLesson, menuCourse, profileId, reload, t, navigation]);

  const onConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteLesson(deleteTarget.id);
      if (res.success === false) {
        setNotice(res.message || t('lessons.deleteLessonFailed'));
        return;
      }
      setDeleteTarget(null);
      setNotice(t('lessons.deleteLessonSuccess'));
      await reload();
    } catch {
      setNotice(t('lessons.deleteLessonFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const showMenu = isAuthorized && isTeacher;

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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
            style={styles.tabsScroll}>
            {isAuthorized ? (
              <>
                <Pressable
                  onPress={() => setTab('my')}
                  style={[styles.tab, tab === 'my' && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabLabel,
                      tab === 'my' && styles.tabLabelActive,
                    ]}>
                    {t('lessonPlans.myLessons')}
                  </Text>
                </Pressable>
                {isTeacher ? (
                  <Pressable
                    onPress={() => setTab('myCourses')}
                    style={[
                      styles.tab,
                      tab === 'myCourses' && styles.tabActive,
                    ]}>
                    <Text
                      style={[
                        styles.tabLabel,
                        tab === 'myCourses' && styles.tabLabelActive,
                      ]}>
                      {t('lessonPlans.myCourses')}
                    </Text>
                  </Pressable>
                ) : hasMyCourses ? (
                  <Pressable
                    onPress={() => setTab('myCourses')}
                    style={[
                      styles.tab,
                      tab === 'myCourses' && styles.tabActive,
                    ]}>
                    <Text
                      style={[
                        styles.tabLabel,
                        tab === 'myCourses' && styles.tabLabelActive,
                      ]}>
                      {t('lessonPlans.myCourses')}
                    </Text>
                  </Pressable>
                ) : null}
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
                {hasTwoEasyCourses ? (
                  <Pressable
                    onPress={() => setTab('twoEasyCourses')}
                    style={[
                      styles.tab,
                      tab === 'twoEasyCourses' && styles.tabActive,
                    ]}>
                    <Text
                      style={[
                        styles.tabLabel,
                        tab === 'twoEasyCourses' && styles.tabLabelActive,
                      ]}>
                      {t('lessonPlans.twoEasyCourses')}
                    </Text>
                  </Pressable>
                ) : null}
                {showBoardsTab ? (
                  <Pressable
                    onPress={() => setTab('myBoards')}
                    style={[styles.tab, tab === 'myBoards' && styles.tabActive]}>
                    <Text
                      style={[
                        styles.tabLabel,
                        tab === 'myBoards' && styles.tabLabelActive,
                      ]}>
                      {t('boards.myBoards')}
                    </Text>
                  </Pressable>
                ) : null}
              </>
            ) : hasTwoEasyCourses ? (
              <>
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
                <Pressable
                  onPress={() => setTab('twoEasyCourses')}
                  style={[
                    styles.tab,
                    tab === 'twoEasyCourses' && styles.tabActive,
                  ]}>
                  <Text
                    style={[
                      styles.tabLabel,
                      tab === 'twoEasyCourses' && styles.tabLabelActive,
                    ]}>
                    {t('lessonPlans.twoEasyCourses')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>

          {isAuthorized && tab === 'my' ? (
            <View style={styles.createWrap}>
              <CreateLessonButton
                beforeOpen={() => requireSubscription()}
              />
              {isTeacher ? (
                <Button
                  title={t('lessons.createCourse')}
                  variant="secondary"
                  onPress={() => {
                    if (!requireSubscription()) {
                      return;
                    }
                    setCreateCourseOpen(true);
                  }}
                />
              ) : null}
              {isTeacher ? (
                <Button
                  title={t('boards.createBoard')}
                  variant="secondary"
                  onPress={openCreateBoard}
                />
              ) : null}
            </View>
          ) : null}

          {isAuthorized && isCoursesTab && isTeacher && tab === 'myCourses' ? (
            <View style={styles.createWrap}>
              <Button
                title={t('lessons.createCourse')}
                onPress={() => {
                  if (!requireSubscription()) {
                    return;
                  }
                  setCreateCourseOpen(true);
                }}
              />
            </View>
          ) : null}

          {isAuthorized && isBoardsTab && isTeacher ? (
            <View style={styles.createWrap}>
              <Button
                title={t('boards.createBoard')}
                onPress={openCreateBoard}
              />
            </View>
          ) : null}

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              isBoardsTab
                ? t('boards.searchBoards')
                : isCoursesTab
                  ? t('lessonPlans.searchCoursesPlaceholder')
                  : t('lessonPlans.searchPlaceholder')
            }
            placeholderTextColor={colors.muted}
            style={[styles.search, isTablet && styles.searchTablet]}
            autoCorrect={false}
          />

          {(tab === 'twoEasy' ||
            (!isAuthorized && !isCoursesTab && !isBoardsTab)) && (
            <View style={styles.filters}>
              {levelFilters.map(filter => {
                const active = levelFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => setLevelFilter(filter)}
                    style={[styles.chip, active && styles.chipActive]}>
                    <Text
                      style={[
                        styles.chipLabel,
                        active && styles.chipLabelActive,
                      ]}>
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
        {(isBoardsTab ? boardsLoading : loading) && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error && !isBoardsTab ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable onPress={() => reload()}>
              <Text style={styles.retry}>{t('lessonPlans.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <AnimatedFlatList
            key={`cols-${catalogColumns}-${isBoardsTab ? 'b' : isCoursesTab ? 'c' : 'l'}`}
            data={listData}
            keyExtractor={item =>
              `${isBoardsTab ? 'b' : isCoursesTab ? 'c' : 'l'}-${item.id}`
            }
            numColumns={catalogColumns}
            columnWrapperStyle={[styles.row, {gap}]}
            contentContainerStyle={[
              styles.listContent,
              {paddingTop: listPaddingTop, paddingBottom: insets.bottom + 24},
            ]}
            renderItem={({item}) => (
              <View style={{width: tileWidth, marginBottom: gap}}>
                <LessonCard
                  item={item}
                  locked={
                    !isCoursesTab &&
                    !isBoardsTab &&
                    isLessonLockedOnFreeTariff(
                      item as Lesson,
                      isFreeTariff,
                      isStudent,
                    )
                  }
                  onPress={() => {
                    if (isBoardsTab) {
                      navigation.navigate('BoardViewer', {
                        boardId: (item as Board).id,
                        catalog: isTeacher,
                      });
                      return;
                    }
                    if (isCoursesTab) {
                      onPressCourse(item as Course);
                    } else {
                      onPressLesson(item as Lesson);
                    }
                  }}
                  onMenuPress={
                    showMenu
                      ? () =>
                          isBoardsTab
                            ? onBoardMenuPress(item as Board)
                            : isCoursesTab
                              ? onCourseMenuPress(item as Course)
                              : onMenuPress(item as Lesson)
                      : undefined
                  }
                />
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {isBoardsTab
                  ? t('boards.noBoards')
                  : isCoursesTab
                    ? t('lessonPlans.emptyCourses')
                    : t('lessonPlans.empty')}
              </Text>
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

      <ActionMenuModal
        visible={!!menuLesson || !!menuCourse || !!menuBoard}
        title={menuLesson?.title || menuCourse?.title || menuBoard?.title}
        items={menuItems}
        cancelLabel={t('common.cancel')}
        onClose={() => {
          setMenuLesson(null);
          setMenuCourse(null);
          setMenuBoard(null);
        }}
      />

      <CreateBoardModal
        visible={createBoardOpen}
        onClose={() => setCreateBoardOpen(false)}
        onCreated={boardId => {
          setCreateBoardOpen(false);
          void loadBoards();
          setTab('myBoards');
          navigation.navigate('BoardViewer', {boardId, catalog: true});
        }}
      />

      <EditBoardModal
        visible={!!editBoard}
        board={editBoard}
        onClose={() => setEditBoard(null)}
        onSaved={() => {
          setEditBoard(null);
          void loadBoards();
        }}
      />

      <AttachBoardToStudentsModal
        visible={!!attachBoard}
        board={attachBoard}
        onClose={() => setAttachBoard(null)}
        onAttached={() => {
          setAttachBoard(null);
          setNotice(t('lessons.attachSuccess'));
          void loadBoards();
        }}
      />

      <AppDialog
        visible={!!deleteBoardTarget}
        title={t('boards.deleteBoard')}
        message={t('boards.deleteConfirm').replace(
          '{{title}}',
          deleteBoardTarget?.title || '',
        )}
        onClose={() => setDeleteBoardTarget(null)}
        actions={[
          {
            label: t('common.delete'),
            variant: 'danger',
            onPress: () => {
              void (async () => {
                if (!deleteBoardTarget) {
                  return;
                }
                try {
                  const res = await deleteBoard(deleteBoardTarget.id);
                  if (res.success === false) {
                    setNotice(res.message || t('boards.saveError'));
                  } else {
                    await loadBoards();
                  }
                } catch {
                  setNotice(t('boards.saveError'));
                } finally {
                  setDeleteBoardTarget(null);
                }
              })();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setDeleteBoardTarget(null),
          },
        ]}
      />

      <EditLessonMetaModal
        visible={!!editLesson}
        lesson={editLesson}
        onClose={() => setEditLesson(null)}
        onSaved={() => {
          setEditLesson(null);
          void reload();
        }}
      />

      <CreateCourseModal
        visible={createCourseOpen || !!editCourse}
        course={editCourse}
        onClose={() => {
          setCreateCourseOpen(false);
          setEditCourse(null);
        }}
        onSaved={courseId => {
          setCreateCourseOpen(false);
          setEditCourse(null);
          void reload();
          navigation.navigate('Course', {courseId});
        }}
      />

      {!!attachLesson && (
        <AttachLessonToStudentsModal
          visible
          lessonId={attachLesson.id}
          lessonTitle={attachLesson.title}
          onClose={() => setAttachLesson(null)}
          onAttached={() => {
            setAttachLesson(null);
            setNotice(t('lessons.attachSuccess'));
          }}
        />
      )}

      {!!attachCourse && (
        <AttachLessonToStudentsModal
          visible
          isCourses
          lessonId={attachCourse.id}
          lessonTitle={attachCourse.title}
          onClose={() => setAttachCourse(null)}
          onAttached={() => {
            setAttachCourse(null);
            setNotice(t('lessons.attachSuccess'));
          }}
        />
      )}

      {!!courseLesson && (
        <AddLessonToCourseModal
          visible
          lessonId={courseLesson.id}
          lessonTitle={courseLesson.title}
          onClose={() => setCourseLesson(null)}
          onAdded={() => {
            setCourseLesson(null);
            setNotice(t('lessons.addToCourseSuccess'));
          }}
        />
      )}

      <AppDialog
        visible={!!deleteTarget}
        title={t('lessons.deleteLessonConfirm')}
        message={t('lessons.deleteLessonConfirmMessage').replace(
          '{{title}}',
          deleteTarget?.title || '',
        )}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        actions={[
          {
            label: t('common.delete'),
            variant: 'danger',
            loading: deleting,
            onPress: () => {
              void onConfirmDelete();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setDeleteTarget(null),
          },
        ]}
      />

      <AppDialog
        visible={!!notice}
        message={notice}
        onClose={() => setNotice('')}
        actions={
          notice === t('lessons.needSubscriptionForActions')
            ? [
                {
                  label: t('lessons.chooseTariff'),
                  onPress: () => {
                    setNotice('');
                    navigation.navigate('Subscription');
                  },
                },
                {
                  label: t('common.close'),
                  variant: 'ghost',
                  onPress: () => setNotice(''),
                },
              ]
            : [
                {
                  label: t('common.close'),
                  onPress: () => setNotice(''),
                },
              ]
        }
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
    zIndex: 200,
    elevation: 24,
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
    gap: 8,
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
  tabsScroll: {
    marginBottom: 12,
    flexGrow: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
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
    zIndex: 0,
    elevation: 0,
  },
  listContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
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
