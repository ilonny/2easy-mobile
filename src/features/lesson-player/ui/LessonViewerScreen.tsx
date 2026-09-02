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
import {getLessonCoverSource, isLessonLockedOnFreeTariff} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  goHome,
  goToSection,
  resetToRoute,
} from '../../../shared/navigation/resetToLessonPlans';
import {useLayout} from '../../../shared/lib/layout';
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
} from '../../homework';
import {
  fetchLessonStudents,
  type LessonParticipant,
} from '../../students/api/studentsApi';
import {fetchExList, fetchLesson, changeExVisible, resetAnswers} from '../api/lessonApi';
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
import {LessonVideoCallWindow} from './LessonVideoCallWindow';

type Props = {
  lessonId: number;
  from?: 'Grammar' | 'Tutorial' | 'Lessons';
  studentId?: number;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LessonViewerScreen({
  lessonId,
  from = 'Lessons',
  studentId: studentIdProp,
}: Props) {
  const insets = useSafeAreaInsets();
  const {isTablet, pageGutter, pageContentMaxWidth} = useLayout();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const {subscription} = useSubscription();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
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
    studentIdForBoard: isTeacher ? answerStudentId : undefined,
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
        ? [studentIdProp]
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
  }, [isTeacher, lessonId, studentIdProp]);

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

  const isLockedOnTrial = isLessonLockedOnFreeTariff(
    lesson,
    subscription?.subscribe_type_id === 1,
    isStudent,
  );

  useEffect(() => {
    if (isLockedOnTrial) {
      navigation.replace('Subscription');
    }
  }, [isLockedOnTrial, navigation]);

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
      await Promise.all(
        exercises.map(ex =>
          resetAnswers({
            lesson_id: lessonId,
            ex_id: ex.id,
            student_id: answerStudentId,
          }),
        ),
      );
      exercises.forEach(ex => {
        notifyLocalAnswersReset({
          lesson_id: lessonId,
          ex_id: ex.id,
          student_id: answerStudentId,
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

  const coverUri = lesson?.image_path
    ? getImageUrl(lesson.image_path)
    : undefined;

  const showTools = isAuthorized && !loading && !error && !!lesson;
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
    return null;
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
                paddingBottom: showTools ? toolsPadding : insets.bottom + 40,
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
                                await saveStartLessonSelectedIds([sid]);
                                navigation.navigate('LessonViewer', {
                                  lessonId: hwId,
                                  from,
                                  studentId: sid,
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
                              navigation.navigate('LessonViewer', {
                                lessonId: fallback,
                                from,
                                ...(answerStudentId
                                  ? {studentId: answerStudentId}
                                  : {}),
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
              </View>
            </LessonScrollView>
          </LessonScrollProvider>
        )}

        {showTools ? (
          <LessonToolsBar
            showParticipants={isTeacher && participants.length > 0}
            showDictionary={isStudent && !!selfStudentId}
            showBoard
            participantsCount={participants.length}
            onParticipants={() => setParticipantsOpen(true)}
            onChat={() => setChatOpen(true)}
            onVideo={() => setVideoOpen(true)}
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
          onClose={() => setChatOpen(false)}
        />

        <LessonVideoCallWindow
          visible={videoOpen}
          lessonId={lessonId}
          lessonOwnerId={lesson?.user_id}
          bottomOffset={
            LESSON_TOOLS_BAR_HEIGHT + Math.max(insets.bottom, 10) + 16
          }
          onClose={() => setVideoOpen(false)}
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
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  error: {color: colors.danger, textAlign: 'center', padding: 24},
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
