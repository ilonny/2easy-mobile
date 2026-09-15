import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {isTeacherLessonAccessBlocked} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  goHome,
  goToSection,
} from '../../../shared/navigation/resetToLessonPlans';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {useLayout} from '../../../shared/lib/layout';
import {
  CreateHomeworkModal,
  isHomeworkLesson,
  positiveId,
  resolveHomeworkForStudent,
} from '../../homework';
import {useSubscription} from '../../home/model/useSubscription';
import {
  changeExSortIndex,
  changeExVisible,
  copyExercise,
  copyLesson,
  deleteExercise,
  fetchExList,
  fetchLesson,
} from '../../lesson-player/api/lessonApi';
import {LessonPlayerProvider} from '../../lesson-player/model/LessonPlayerContext';
import {
  LessonScrollProvider,
  LessonScrollView,
} from '../../lesson-player/model/LessonScrollContext';
import {StartLessonStudentsModal} from './StartLessonStudentsModal';
import type {Exercise, LessonDetail} from '../../lesson-player/model/types';
import {ExList} from '../../lesson-player/ui/ExList';
import {isExVisible} from '../../lesson-player/lib/exMappers';
import {ChooseTemplateModal} from './ChooseTemplateModal';
import {CreateLessonButton} from './CreateLessonButton';
import {EditLessonMetaModal} from './EditLessonMetaModal';
import {EditorRootModal} from './editors/EditorRootModal';

const EX_COPY_KEY = 'exCopy';
const TWO_EASY_USER_ID = 1;

type Props = {
  lessonId: number;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

type EditorState = {
  type: string;
  exercise?: Exercise | null;
  sortIndex?: number;
  currentSortIndexToShift?: number;
} | null;

export function LessonEditorScreen({lessonId}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();
  const {hasSubscription, subscription, loading: subLoading} = useSubscription();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metaOpen, setMetaOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [startStudentsOpen, setStartStudentsOpen] = useState(false);
  const [homeworkModalOpen, setHomeworkModalOpen] = useState(false);
  const [insertAt, setInsertAt] = useState<number | undefined>();
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');
  const [headerHeight, setHeaderHeight] = useState(0);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [copying, setCopying] = useState(false);

  const headerTranslate = useRef(new Animated.Value(0)).current;
  /** 0 = header visible, 1 = hidden — drives sticky chip pin (JS driver). */
  const headerCollapseProgress = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerVisible = useRef(true);

  const load = useCallback(async (opts?: {silent?: boolean}) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError('');
    try {
      const [lessonRes, list] = await Promise.all([
        fetchLesson(lessonId),
        fetchExList(lessonId),
      ]);
      setLesson(lessonRes.lesson ?? null);
      setExercises(list);
      if (!lessonRes.lesson) {
        setError(t('lessonPlans.empty'));
      }
    } catch {
      setError(t('lessonPlans.empty'));
    } finally {
      setLoading(false);
    }
  }, [lessonId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const isLockedOnTrial = isTeacherLessonAccessBlocked(lesson, {
    isStudent: !!profile?.isStudent,
    hasSubscription,
    isFreeTariff: subscription?.subscribe_type_id === 1,
  });

  useEffect(() => {
    if (subLoading || !isAuthorized || profile?.isStudent) {
      return;
    }
    if (isLockedOnTrial) {
      navigation.replace('Subscription');
    }
  }, [
    isAuthorized,
    isLockedOnTrial,
    navigation,
    profile?.isStudent,
    subLoading,
  ]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(EX_COPY_KEY);
        if (!raw) {
          setHasClipboard(false);
          return;
        }
        const parsed = JSON.parse(raw) as {id?: number};
        setHasClipboard(!!parsed?.id);
      } catch {
        setHasClipboard(false);
      }
    })();
  }, []);

  const showHeader = useCallback(() => {
    if (headerVisible.current) {
      return;
    }
    headerVisible.current = true;
    headerTranslate.stopAnimation();
    headerCollapseProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(headerCollapseProgress, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
  }, [headerCollapseProgress, headerTranslate]);

  const hideHeader = useCallback(() => {
    if (!headerVisible.current || headerHeight <= 0) {
      return;
    }
    headerVisible.current = false;
    headerTranslate.stopAnimation();
    headerCollapseProgress.stopAnimation();
    Animated.parallel([
      Animated.timing(headerTranslate, {
        toValue: -headerHeight,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(headerCollapseProgress, {
        toValue: 1,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
  }, [headerCollapseProgress, headerHeight, headerTranslate]);

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

  const crumbs = [
    {
      label: t('editor.home'),
      onPress: () => goHome(navigation, isAuthorized),
    },
    {
      label: t('header.lessonPlans'),
      onPress: () => goToSection(navigation, 'Lessons', isAuthorized),
    },
    {label: lesson?.title || t('common.loading')},
  ];

  const onPressCreate = (indexToShift?: number) => {
    setInsertAt(indexToShift);
    setTemplateOpen(true);
  };

  const onSelectTemplate = (type: string) => {
    setTemplateOpen(false);
    setEditor({
      type,
      sortIndex: insertAt,
      currentSortIndexToShift: insertAt,
    });
  };

  const onPressEdit = (ex: Exercise) => {
    setEditor({type: ex.type, exercise: ex});
  };

  const onChangeSort = async (id: number, idx: number) => {
    try {
      await changeExSortIndex(id, idx);
      await load();
    } catch {
      setNotice(t('editor.saveFailed'));
    }
  };

  const onChangeVisible = async (ex: Exercise) => {
    const nextVisible = !isExVisible(ex.is_visible);
    const prevVisible = ex.is_visible;
    setExercises(list =>
      list.map(item =>
        item.id === ex.id ? {...item, is_visible: nextVisible} : item,
      ),
    );
    try {
      await changeExVisible(ex.id, nextVisible);
    } catch {
      setExercises(list =>
        list.map(item =>
          item.id === ex.id ? {...item, is_visible: prevVisible} : item,
        ),
      );
      setNotice(t('editor.saveFailed'));
    }
  };

  const onPressCopy = async (ex: Exercise) => {
    try {
      const payload = {
        lesson_id: ex.lesson_id ?? lessonId,
        id: ex.id,
        currentSortIndexToShift: ex.sortIndex,
      };
      await AsyncStorage.setItem(EX_COPY_KEY, JSON.stringify(payload));
      setHasClipboard(true);
      setNotice(t('lessons.taskCopiedToClipboard'));
    } catch {
      setNotice(t('editor.saveFailed'));
    }
  };

  const onPressPaste = async (sortIndexToShift?: number) => {
    try {
      const raw = await AsyncStorage.getItem(EX_COPY_KEY);
      if (!raw) {
        setHasClipboard(false);
        return;
      }
      const copyObj = JSON.parse(raw) as {
        id?: number;
        currentSortIndexToShift?: number;
      };
      if (!copyObj?.id) {
        setHasClipboard(false);
        return;
      }
      const currentSortIndexToShift =
        sortIndexToShift ??
        copyObj.currentSortIndexToShift ??
        (exercises.length
          ? exercises[exercises.length - 1]?.sortIndex
          : -1);
      await copyExercise({
        lesson_id: lessonId,
        id: copyObj.id,
        currentSortIndexToShift,
      });
      await AsyncStorage.removeItem(EX_COPY_KEY);
      setHasClipboard(false);
      await load();
    } catch {
      setNotice(t('editor.saveFailed'));
    }
  };

  const onConfirmDelete = async () => {
    if (deleteId == null) {
      return;
    }
    setDeleting(true);
    try {
      await deleteExercise(deleteId);
      setDeleteId(null);
      await load();
    } catch {
      setNotice(t('editor.saveFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const isAdmin = profile?.role_id === 1;
  const is2easy = Number(lesson?.user_id) === TWO_EASY_USER_ID;
  const profileUserId = Number(profile?.id || profile?.user_id || 0);
  const isOwner =
    !!lesson &&
    ((profileUserId > 0 && Number(lesson.user_id) === profileUserId) ||
      lesson.is_my_lesson === true);
  /** 2easy catalog lessons are read-only (except platform admins). */
  const canEditContent = useMemo(() => {
    if (!lesson) {
      return false;
    }
    if (is2easy) {
      return isAdmin;
    }
    return isOwner || lesson.canEdit === true;
  }, [lesson, is2easy, isAdmin, isOwner]);

  const lessonIsHomework = !!lesson && isHomeworkLesson(lesson);
  const linkedHomeworkId = positiveId(lesson?.homework_lesson_id);

  const startLesson = () => {
    if (!hasSubscription) {
      setNotice(t('lessons.needSubscriptionToStart'));
      navigation.navigate('Subscription');
      return;
    }
    setStartStudentsOpen(true);
  };

  const onStartLessonWithStudents = (
    selectedIds: number[],
    sessionId?: number,
  ) => {
    setStartStudentsOpen(false);
    if (lessonIsHomework) {
      const studentId = Number(selectedIds[0] || 0);
      const parentLessonId =
        positiveId(lesson?.lesson_id_homework) || lessonId;
      void (async () => {
        let homeworkId = lessonId;
        if (studentId > 0 && parentLessonId > 0) {
          try {
            const data = await resolveHomeworkForStudent(
              parentLessonId,
              studentId,
            );
            const resolvedId = positiveId(data?.homework_lesson_id);
            if (data?.success && resolvedId) {
              homeworkId = resolvedId;
            }
          } catch {
            /* keep current homework lesson */
          }
        }
        navigation.navigate('LessonViewer', {
          lessonId: homeworkId,
          from: 'Lessons',
          ...(studentId > 0 ? {studentId} : {}),
        });
      })();
      return;
    }
    navigation.navigate('LessonViewer', {
      lessonId,
      from: 'Lessons',
      ...(selectedIds.length === 1 ? {studentId: selectedIds[0]} : {}),
      ...(sessionId ? {sessionId} : {}),
    });
  };

  const onAddToMyLessons = async () => {
    setCopying(true);
    try {
      const res = await copyLesson(lessonId);
      const newId = Number(res?.id || 0);
      if (!newId) {
        setNotice(t('lessons.lessonCopyFailed'));
        return;
      }
      setNotice(t('lessons.lessonCopied'));
      navigation.replace('LessonEditor', {lessonId: newId});
    } catch {
      setNotice(t('lessons.lessonCopyFailed'));
    } finally {
      setCopying(false);
    }
  };

  const listPaddingTop = headerHeight > 0 ? headerHeight + 8 : insets.top + 120;

  if (isLockedOnTrial) {
    return null;
  }

  return (
    <LessonPlayerProvider
      value={{
        lessonId,
        isTeacher: true,
        isView: !canEditContent,
        isEdit: canEditContent,
      }}>
      <View style={styles.root}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <CreateLessonButton
              beforeOpen={() => {
                if (!hasSubscription) {
                  navigation.navigate('Subscription');
                  return false;
                }
                return true;
              }}
            />
          </View>
        ) : (
          <LessonScrollProvider
            stickyTop={headerHeight > 0 ? headerHeight : insets.top}
            stickyTopCollapsed={insets.top}
            headerCollapseProgress={headerCollapseProgress}>
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
              <View
                style={[
                  styles.headerInner,
                  {maxWidth: pageContentMaxWidth, width: '100%'},
                ]}>
                <AppHeader />
                <View
                  style={[
                    styles.headerActions,
                    isTablet && styles.headerActionsTablet,
                  ]}>
                  {lessonIsHomework && isOwner ? (
                    <Button
                      title={t('lessons.checkHomework')}
                      onPress={startLesson}
                    />
                  ) : !lessonIsHomework ? (
                    <Button
                      title={t('lessons.startLesson')}
                      onPress={startLesson}
                    />
                  ) : null}
                  {canEditContent ? (
                    <Button
                      title={t('editor.editLesson')}
                      onPress={() => setMetaOpen(true)}
                      variant="secondary"
                    />
                  ) : null}
                  {is2easy && !isAdmin ? (
                    <Button
                      title={t('lessons.addToMyLessons')}
                      onPress={() => {
                        void onAddToMyLessons();
                      }}
                      variant="secondary"
                      loading={copying}
                    />
                  ) : null}
                </View>
              </View>
            </Animated.View>

            <LessonScrollView
              style={styles.flex}
              contentContainerStyle={{
                paddingHorizontal: pageGutter,
                paddingTop: listPaddingTop,
                paddingBottom: insets.bottom + 40,
                alignItems: 'center',
              }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              onScroll={onScroll}>
              <View
                style={[
                  styles.pageColumn,
                  {maxWidth: pageContentMaxWidth, width: '100%'},
                ]}>
                <Breadcrumbs items={crumbs} />
                <Text style={[styles.title, isTablet && styles.titleTablet]}>
                  {lesson?.title || ''}
                </Text>
                {!!lesson?.description && (
                  <Text style={[styles.desc, isTablet && styles.descTablet]}>
                    {lesson.description}
                  </Text>
                )}

                <ExList
                  list={exercises}
                  chrome={
                    canEditContent
                      ? {
                          hasClipboard,
                          onPressCreate,
                          onPressEdit,
                          onPressDelete: id => setDeleteId(id),
                          changeSortIndex: (id, idx) => {
                            void onChangeSort(id, idx);
                          },
                          onChangeIsVisible: ex => {
                            void onChangeVisible(ex);
                          },
                          onPressCopy: ex => {
                            void onPressCopy(ex);
                          },
                          onPressPaste: idx => {
                            void onPressPaste(idx);
                          },
                        }
                      : undefined
                  }
                />

                {isOwner && !lessonIsHomework ? (
                  <View style={styles.homeworkWrap}>
                    <Button
                      title={
                        linkedHomeworkId
                          ? t('lessons.homeworkLabel')
                          : t('lessons.createHomework')
                      }
                      variant="secondary"
                      onPress={() => {
                        if (linkedHomeworkId) {
                          navigation.navigate('LessonEditor', {
                            lessonId: linkedHomeworkId,
                          });
                          return;
                        }
                        setHomeworkModalOpen(true);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </LessonScrollView>
          </LessonScrollProvider>
        )}

        {canEditContent ? (
          <>
            <EditLessonMetaModal
              visible={metaOpen}
              lesson={lesson}
              onClose={() => setMetaOpen(false)}
              onSaved={() => {
                setMetaOpen(false);
                void load();
              }}
            />

            <ChooseTemplateModal
              visible={templateOpen}
              onClose={() => setTemplateOpen(false)}
              onSelect={onSelectTemplate}
            />

            <EditorRootModal
              visible={!!editor}
              type={editor?.type || ''}
              lessonId={lessonId}
              exercise={editor?.exercise}
              sortIndex={editor?.sortIndex}
              currentSortIndexToShift={editor?.currentSortIndexToShift}
              onClose={() => setEditor(null)}
              onSaved={() => {
                setEditor(null);
                void load();
              }}
            />

            <AppDialog
              visible={deleteId != null}
              title={t('common.delete')}
              message={t('editor.deleteExerciseConfirm')}
              onClose={() => setDeleteId(null)}
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
                  onPress: () => setDeleteId(null),
                },
              ]}
            />
          </>
        ) : null}

        <StartLessonStudentsModal
          visible={startStudentsOpen}
          lessonId={lessonId}
          mode={lessonIsHomework ? 'homeworkCheck' : 'start'}
          onClose={() => setStartStudentsOpen(false)}
          onStarted={onStartLessonWithStudents}
        />

        {!!lesson && (
          <CreateHomeworkModal
            visible={homeworkModalOpen}
            lessonId={lessonId}
            exList={exercises.map(ex => ({
              id: ex.id,
              type: ex.type,
              data: ex.data,
              sortIndex: ex.sortIndex,
            }))}
            onClose={() => setHomeworkModalOpen(false)}
            onOpenEditor={hwId => {
              navigation.navigate('LessonEditor', {lessonId: hwId});
            }}
            onSuccess={() => {
              void load();
            }}
          />
        )}

        <AppDialog
          visible={!!notice}
          title=""
          message={notice}
          onClose={() => setNotice('')}
          actions={[
            {
              label: t('common.back'),
              variant: 'ghost',
              onPress: () => setNotice(''),
            },
          ]}
        />
      </View>
    </LessonPlayerProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  flex: {flex: 1},
  headerShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    elevation: 24,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  headerInner: {gap: 10},
  headerActions: {gap: 8},
  headerActionsTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pageColumn: {gap: 0},
  homeworkWrap: {marginTop: 16, marginBottom: 8},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  error: {textAlign: 'center', color: colors.danger},
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  titleTablet: {fontSize: 34},
  desc: {
    marginTop: 10,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  descTablet: {fontSize: 18, lineHeight: 26},
});
