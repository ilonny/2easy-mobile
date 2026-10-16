import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {getLessonCoverSource, isTeacherLessonAccessBlocked} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  goHome,
  goToSection,
  resetToRoute,
} from '../../../shared/navigation/resetToLessonPlans';
import {useLayout} from '../../../shared/lib/layout';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {DictionarySelectionProvider} from '../../dictionary/model/DictionarySelectionContext';
import {AddWordFromSelectionModal} from '../../dictionary/ui/AddWordFromSelectionModal';
import {DictionaryModal} from '../../dictionary/ui/DictionaryModal';
import {DictionarySelectionPill} from '../../dictionary/ui/DictionarySelectionPill';
import {useLessonBoardOpener} from '../../boards';
import {useSubscription} from '../../home/model/useSubscription';
import {
  getOrCreateHomeworkForStudent,
  isHomeworkLesson,
  openStudentHomework,
  positiveId,
  startHomeworkSessionForStudent,
} from '../../homework';
import {
  fetchLessonStudents,
  type LessonParticipant,
} from '../../students/api/studentsApi';
import {
  fetchExList,
  fetchLesson,
  changeExVisible,
  resetAnswers,
  resolveLessonSession,
} from '../api/lessonApi';
import {notifyLocalAnswersReset} from '../model/useExAnswer';
import {
  readStartLessonSelectedIds,
  saveStartLessonSelectedIds,
} from '../lib/startLessonSelection';
import {LessonPlayerProvider} from '../model/LessonPlayerContext';
import {
  LessonScrollProvider,
  LessonScrollView,
} from '../model/LessonScrollContext';
import type {Exercise, LessonDetail} from '../model/types';
import {isExVisible} from '../lib/exMappers';
import {ExList} from './ExList';
import {LessonCover} from './LessonCover';
import {getImageUrl} from '../lib/getImageUrl';
import {LessonChatModal} from './LessonChatModal';
import {LessonParticipantsSheet} from './LessonParticipantsSheet';
import {LessonToolsBar, LESSON_TOOLS_BAR_HEIGHT} from './LessonToolsBar';
import {useVideoCall} from '../../video-call';

type Props = {
  lessonId: number;
  from?: 'Grammar' | 'Tutorial' | 'Lessons';
  studentId?: number;
  sessionId?: number;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LessonViewerScreen({
  lessonId,
  from = 'Lessons',
  studentId: studentIdProp,
  sessionId: sessionIdProp,
}: Props) {
  const insets = useSafeAreaInsets();
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const {subscription, hasSubscription, loading: subLoading} = useSubscription();

  const [headerHeight, setHeaderHeight] = useState(0);

  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const isStudent = !!profile?.isStudent;
  const selfStudentId = isStudent ? Number(profile.studentId) : undefined;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [participants, setParticipants] = useState<LessonParticipant[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<number | undefined>(
    studentIdProp,
  );
  const [lessonSessionId, setLessonSessionId] = useState<number | undefined>(
    sessionIdProp,
  );
  const [sessionRoster, setSessionRoster] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const {open: openVideoCall} = useVideoCall();
  const [dictionaryStudentId, setDictionaryStudentId] = useState<number | null>(
    null,
  );
  const [selectionAnchor, setSelectionAnchor] = useState<{
    text: string;
    pageX: number;
    pageY: number;
  } | null>(null);
  const [addWordOpen, setAddWordOpen] = useState(false);
  const [addWordSource, setAddWordSource] = useState('');
  const [notice, setNotice] = useState('');
  const [homeworkOpening, setHomeworkOpening] = useState(false);
  const [parentLessonOpening, setParentLessonOpening] = useState(false);
  const [answersEpoch, setAnswersEpoch] = useState(0);

  const answerStudentId = isTeacher
    ? activeStudentId
    : selfStudentId ?? studentIdProp;

  const {
    openLessonBoard,
    opening: boardOpening,
    modal: lessonBoardModal,
  } = useLessonBoardOpener({
    lessonId,
    isTeacher: !!isTeacher,
    // Same as site: students must send their own studentId for individual boards.
    studentIdForBoard: isTeacher
      ? answerStudentId
      : selfStudentId ?? studentIdProp,
    lessonSessionId,
  });

  const parentLabel =
    from === 'Tutorial'
      ? t('header.tutorial')
      : from === 'Grammar'
        ? t('grammarPage.breadcrumb')
        : t('header.lessonPlans');

  const goStudentCabinet = () => {
    resetToRoute(navigation, 'Students', {
      studentId: Number(profile?.studentId || selfStudentId || 0),
    });
  };

  const crumbs = isStudent
    ? [
        {
          label: t('students.studentCabinet'),
          onPress: goStudentCabinet,
        },
        {label: lesson?.title || t('common.loading')},
      ]
    : [
        {
          label: t('editor.home'),
          onPress: () => goHome(navigation, isAuthorized, profile),
        },
        {
          label: parentLabel,
          onPress: () => goToSection(navigation, from, isAuthorized),
        },
        {label: lesson?.title || t('common.loading')},
      ];

  const canEdit = useMemo(() => {
    if (!lesson || !isTeacher) {
      return false;
    }
    if (lesson.canEdit === true) {
      return true;
    }
    const uid = Number(profile?.id || profile?.user_id || 0);
    if (lesson.user_id === 1) {
      return profile?.role_id === 1;
    }
    return uid > 0 && Number(lesson.user_id) === uid;
  }, [lesson, isTeacher, profile]);

  const loadParticipants = useCallback(async () => {
    if (!isTeacher) {
      setParticipants([]);
      return;
    }
    try {
      const selectedIds = studentIdProp
        ? [Number(studentIdProp)]
        : sessionRoster.length
          ? sessionRoster
          : await readStartLessonSelectedIds();
      if (!selectedIds.length) {
        setParticipants([]);
        return;
      }
      const list = await fetchLessonStudents(lessonId, selectedIds);
      const filtered = list.filter(s =>
        selectedIds.includes(Number(s.student_id)),
      );
      setParticipants(filtered);
      if (filtered.length === 1) {
        setActiveStudentId(Number(filtered[0].student_id));
      } else if (
        studentIdProp &&
        filtered.some(s => Number(s.student_id) === studentIdProp)
      ) {
        setActiveStudentId(studentIdProp);
      } else if (
        activeStudentId &&
        !filtered.some(s => Number(s.student_id) === activeStudentId)
      ) {
        setActiveStudentId(undefined);
      }
    } catch {
      setParticipants([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on lesson / prop change
  }, [isTeacher, lessonId, sessionRoster, studentIdProp]);

  useEffect(() => {
    if (!isAuthorized || !lessonId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await resolveLessonSession(lessonId, sessionIdProp);
        if (cancelled || !result?.success || !result.session?.id) {
          return;
        }
        const roster = Array.isArray(result.session.student_ids)
          ? result.session.student_ids.map(Number).filter(Boolean)
          : [];
        if (
          studentIdProp &&
          roster.length &&
          !roster.includes(Number(studentIdProp))
        ) {
          return;
        }
        setLessonSessionId(Number(result.session.id));
        setSessionRoster(roster);
        if (roster.length) {
          await saveStartLessonSelectedIds(roster);
        }
      } catch {
        // Legacy lessons keep the old per-student scope.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthorized, lessonId, sessionIdProp, studentIdProp]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const studentForLesson = isTeacher ? studentIdProp : selfStudentId;
      const [lessonRes, list] = await Promise.all([
        fetchLesson(lessonId, studentForLesson),
        fetchExList(lessonId, {filterHidden: !isTeacher}),
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
  }, [lessonId, isTeacher, studentIdProp, selfStudentId, t]);

  useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    void load();
  }, [load]);

  const isLockedOnTrial = isTeacherLessonAccessBlocked(lesson, {
    isStudent,
    hasSubscription,
    isFreeTariff: subscription?.subscribe_type_id === 1,
  });

  useEffect(() => {
    if (subLoading || !isAuthorized || isStudent) {
      return;
    }
    if (isLockedOnTrial) {
      navigation.replace('Subscription');
    }
  }, [isAuthorized, isLockedOnTrial, isStudent, navigation, subLoading]);

  useEffect(() => {
    if (studentIdProp) {
      setActiveStudentId(studentIdProp);
    }
  }, [studentIdProp]);

  const onResetAll = async () => {
    if (!answerStudentId) {
      return;
    }
    setResetting(true);
    try {
      const results = await Promise.all(
        exercises.map(ex =>
          resetAnswers({
            lesson_id: lessonId,
            ex_id: ex.id,
            student_id: answerStudentId,
          }),
        ),
      );
      exercises.forEach((ex, index) => {
        const sync_v = Number((results[index] as any)?.sync_v) || undefined;
        notifyLocalAnswersReset({
          lesson_id: lessonId,
          ex_id: ex.id,
          student_id: answerStudentId,
          sync_v,
        });
      });
      setAnswersEpoch(epoch => epoch + 1);
      setResetOpen(false);
      void load();
    } finally {
      setResetting(false);
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

  const openParentLesson = async () => {
    const parentLessonId = positiveId(lesson?.lesson_id_homework);
    if (!parentLessonId) {
      return;
    }
    setParentLessonOpening(true);
    try {
      if (isStudent) {
        if (selfStudentId) {
          await saveStartLessonSelectedIds([selfStudentId]);
        }
        navigation.navigate('LessonViewer', {lessonId: parentLessonId, from});
        return;
      }

      const studentIds = studentIdProp
        ? [Number(studentIdProp)]
        : participants.map(p => Number(p.student_id)).filter(Boolean);
      let sessionId: number | undefined;
      if (studentIds.length) {
        await saveStartLessonSelectedIds(studentIds);
        try {
          const response = await startLessonSession(parentLessonId, studentIds);
          sessionId = positiveId(response?.session?.id);
        } catch {
          sessionId = undefined;
        }
      }
      navigation.navigate('LessonViewer', {
        lessonId: parentLessonId,
        from,
        ...(studentIds.length === 1 ? {studentId: studentIds[0]} : {}),
        ...(sessionId ? {sessionId} : {}),
      });
    } finally {
      setParentLessonOpening(false);
    }
  };

  const coverUri = lesson?.image_path
    ? getImageUrl(lesson.image_path)
    : undefined;

  const showTools = isAuthorized && !loading && !error && !!lesson;
  const keyboardHeight = useKeyboardBottomOffset(showTools);
  const toolsVisible = showTools && keyboardHeight === 0;
  const toolsPadding =
    LESSON_TOOLS_BAR_HEIGHT + Math.max(insets.bottom, 10) + 24;

  const dictionarySelectionEnabled =
    showTools &&
    ((isStudent && !!selfStudentId) || (isTeacher && participants.length > 0));

  const dictionarySelectionValue = useMemo(
    () => ({
      enabled: dictionarySelectionEnabled,
      onSelection: (anchor: {
        text: string;
        pageX: number;
        pageY: number;
      }) => {
        setSelectionAnchor(anchor);
      },
      onClearSelection: () => {
        setSelectionAnchor(null);
      },
    }),
    [dictionarySelectionEnabled],
  );

  const onAddSelectionPress = () => {
    if (!selectionAnchor?.text.trim()) {
      return;
    }
    if (isTeacher && !participants.length) {
      setNotice(t('dictionary.noStudentsOnLesson'));
      setSelectionAnchor(null);
      return;
    }
    setAddWordSource(selectionAnchor.text.trim());
    setAddWordOpen(true);
    setSelectionAnchor(null);
  };

  if (isLockedOnTrial) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.error}>
            {t('subscriptionStatus.subscribeToContinue')}
          </Text>
          <Pressable
            onPress={() => navigation.replace('Subscription')}
            style={styles.lockCta}>
            <Text style={styles.lockCtaText}>{t('common.next')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <LessonPlayerProvider
      value={{
        lessonId,
        studentId: selfStudentId ?? answerStudentId,
        activeStudentId: answerStudentId,
        isTeacher,
        isView: true,
        isEdit: false,
      }}>
      <DictionarySelectionProvider value={dictionarySelectionValue}>
      <View style={styles.root}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : (
          <LessonScrollProvider
            stickyTop={headerHeight > 0 ? headerHeight : insets.top}>
            <View
              onLayout={event => {
                const next = event.nativeEvent.layout.height;
                if (Math.abs(next - headerHeight) > 1) {
                  setHeaderHeight(next);
                }
              }}
              style={[
                styles.header,
                {
                  paddingTop: insets.top + (isTablet ? 12 : 8),
                  paddingHorizontal: pageGutter,
                },
              ]}>
              <View style={{maxWidth: pageContentMaxWidth, width: '100%'}}>
                <AppHeader />
              </View>
            </View>
            <LessonScrollView
              style={styles.flex}
              contentContainerStyle={{
                paddingHorizontal: pageGutter,
                paddingBottom: toolsVisible ? toolsPadding : insets.bottom + 40,
                alignItems: 'center',
              }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
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

                {canEdit ? (
                  <Button
                    title={t('lessons.backToEdit')}
                    onPress={() =>
                      navigation.navigate('LessonEditor', {lessonId})
                    }
                    variant="secondary"
                  />
                ) : null}

                {coverUri ? (
                  <LessonCover source={{uri: coverUri}} />
                ) : (
                  <LessonCover
                    source={getLessonCoverSource(lesson?.image_path)}
                  />
                )}

                {isTeacher && answerStudentId ? (
                  <View style={styles.activeStudentRow}>
                    <Text style={styles.activeStudentLabel}>
                      {t('lessons.participants')}:{' '}
                      <Text style={styles.activeStudentValue}>
                        {participants.find(
                          s => Number(s.student_id) === answerStudentId,
                        )?.['student.name'] ||
                          participants.find(
                            s => Number(s.student_id) === answerStudentId,
                          )?.name ||
                          `#${answerStudentId}`}
                      </Text>
                    </Text>
                    <Pressable
                      style={styles.resetLink}
                      onPress={() => setResetOpen(true)}>
                      <Text style={styles.resetText}>
                        {t('lessons.resetAnswers')}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <ExList
                  key={`answers-${answerStudentId || 0}-${answersEpoch}`}
                  list={exercises}
                  chrome={
                    isTeacher && canEdit
                      ? {
                          onChangeIsVisible: ex => {
                            void onChangeVisible(ex);
                          },
                        }
                      : undefined
                  }
                />

                {!!lesson &&
                positiveId(lesson.homework_lesson_id) &&
                !isHomeworkLesson(lesson) ? (
                  <View style={styles.homeworkWrap}>
                    <Button
                      title={t('lessons.homeworkLabel')}
                      loading={homeworkOpening}
                      onPress={() => {
                        void (async () => {
                          setHomeworkOpening(true);
                          try {
                            if (
                              isTeacher &&
                              participants.length === 1 &&
                              participants[0]?.student_id
                            ) {
                              const sid = Number(participants[0].student_id);
                              const data = await getOrCreateHomeworkForStudent(
                                lessonId,
                                sid,
                              );
                              const hwId = positiveId(data?.homework_lesson_id);
                              if (hwId) {
                                const sessionId =
                                  await startHomeworkSessionForStudent(hwId, sid);
                                navigation.navigate('LessonViewer', {
                                  lessonId: hwId,
                                  from,
                                  studentId: sid,
                                  ...(sessionId ? {sessionId} : {}),
                                });
                                return;
                              }
                            }

                            if (isStudent && selfStudentId) {
                              const hwId = await openStudentHomework({
                                lesson,
                                studentId: selfStudentId,
                              });
                              if (hwId) {
                                navigation.navigate('LessonViewer', {
                                  lessonId: hwId,
                                  from,
                                });
                                return;
                              }
                              setNotice(t('lessons.homeworkOpenFailed'));
                              return;
                            }

                            const fallback = positiveId(lesson.homework_lesson_id);
                            if (fallback) {
                              const sid = answerStudentId;
                              const sessionId =
                                isTeacher && sid
                                  ? await startHomeworkSessionForStudent(
                                      fallback,
                                      sid,
                                    )
                                  : undefined;
                              navigation.navigate('LessonViewer', {
                                lessonId: fallback,
                                from,
                                ...(sid ? {studentId: sid} : {}),
                                ...(sessionId ? {sessionId} : {}),
                              });
                              return;
                            }
                            setNotice(t('lessons.homeworkOpenFailed'));
                          } catch {
                            setNotice(t('lessons.homeworkOpenFailed'));
                          } finally {
                            setHomeworkOpening(false);
                          }
                        })();
                      }}
                    />
                  </View>
                ) : null}

                {!!lesson && isHomeworkLesson(lesson) ? (
                  <View style={styles.homeworkWrap}>
                    <Button
                      title={t('lessons.toLesson')}
                      loading={parentLessonOpening}
                      onPress={() => {
                        void openParentLesson();
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </LessonScrollView>
          </LessonScrollProvider>
        )}

        {toolsVisible ? (
          <LessonToolsBar
            showParticipants={isTeacher && participants.length > 0}
            showDictionary={isStudent && !!selfStudentId}
            showBoard
            participantsCount={participants.length}
            onParticipants={() => setParticipantsOpen(true)}
            onChat={() => {
              const chatStudentId = isTeacher
                ? answerStudentId
                : selfStudentId ?? studentIdProp;
              if (!isTeacher && !chatStudentId && !lessonSessionId) {
                setNotice(t('lessons.selectStudentForChat'));
                return;
              }
              setChatOpen(true);
            }}
            onVideo={() =>
              openVideoCall({lessonOwnerId: lesson?.user_id})
            }
            onDictionary={
              selfStudentId
                ? () => setDictionaryStudentId(selfStudentId)
                : undefined
            }
            onBoard={() => void openLessonBoard()}
            boardLoading={boardOpening}
          />
        ) : null}

        {lessonBoardModal}

        <LessonParticipantsSheet
          visible={participantsOpen}
          participants={participants}
          activeStudentId={activeStudentId}
          onSelect={setActiveStudentId}
          onOpenDictionary={id => setDictionaryStudentId(id)}
          onClose={() => setParticipantsOpen(false)}
        />

        <LessonChatModal
          visible={chatOpen}
          lessonId={lessonId}
          studentId={
            isTeacher
              ? answerStudentId
              : selfStudentId ?? studentIdProp
          }
          sessionId={lessonSessionId}
          onClose={() => setChatOpen(false)}
        />

        <DictionaryModal
          visible={dictionaryStudentId != null}
          studentId={dictionaryStudentId || 0}
          onClose={() => setDictionaryStudentId(null)}
        />

        <DictionarySelectionPill
          visible={!!selectionAnchor?.text}
          pageX={selectionAnchor?.pageX || 0}
          pageY={selectionAnchor?.pageY || 0}
          onPress={onAddSelectionPress}
        />

        <AddWordFromSelectionModal
          visible={addWordOpen}
          sourceWord={addWordSource}
          lessonId={lessonId}
          studentId={isStudent ? selfStudentId : undefined}
          isTeacherBulk={isTeacher}
          participantIds={participants.map(s => Number(s.student_id))}
          onClose={() => setAddWordOpen(false)}
        />

        <AppDialog
          visible={!!notice}
          message={notice}
          onClose={() => setNotice('')}
          actions={[
            {
              label: t('common.back'),
              variant: 'primary',
              onPress: () => setNotice(''),
            },
          ]}
        />

        <AppDialog
          visible={resetOpen}
          title={t('lessons.resetAnswers')}
          message={t('lessons.resetAnswersConfirm')}
          onClose={() => setResetOpen(false)}
          actions={[
            {
              label: t('common.delete'),
              variant: 'danger',
              loading: resetting,
              onPress: () => {
                void onResetAll();
              },
            },
            {
              label: t('common.cancel'),
              variant: 'ghost',
              onPress: () => setResetOpen(false),
            },
          ]}
        />
      </View>
      </DictionarySelectionProvider>
    </LessonPlayerProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  flex: {flex: 1},
  header: {
    zIndex: 200,
    elevation: 24,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  pageColumn: {gap: 12},
  homeworkWrap: {marginTop: 8, marginBottom: 8},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  error: {color: colors.danger, textAlign: 'center', padding: 24},
  lockCta: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lockCtaText: {color: colors.white, fontWeight: '700', fontSize: 15},
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  titleTablet: {fontSize: 32},
  desc: {color: colors.textSecondary, fontSize: 15, lineHeight: 22},
  descTablet: {fontSize: 17, lineHeight: 24},
  activeStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  activeStudentLabel: {fontSize: 13, color: colors.textSecondary},
  activeStudentValue: {fontWeight: '700', color: colors.primary},
  resetLink: {paddingVertical: 4},
  resetText: {color: colors.danger, fontWeight: '600'},
});
