import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {getLessonCoverSource} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  goHome,
  goToSection,
} from '../../../shared/navigation/resetToLessonPlans';
import {useLayout} from '../../../shared/lib/layout';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {
  fetchLessonStudents,
  type LessonParticipant,
} from '../../students/api/studentsApi';
import {fetchExList, fetchLesson, resetAnswers} from '../api/lessonApi';
import {readStartLessonSelectedIds} from '../lib/startLessonSelection';
import {LessonPlayerProvider} from '../model/LessonPlayerContext';
import {
  LessonScrollProvider,
  LessonScrollView,
} from '../model/LessonScrollContext';
import type {Exercise, LessonDetail} from '../model/types';
import {ExList} from './ExList';
import {getImageUrl} from '../lib/getImageUrl';

type Props = {
  lessonId: number;
  from?: 'Grammar' | 'Tutorial' | 'Lessons';
  studentId?: number;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

function participantName(s: LessonParticipant) {
  return s['student.name'] || s.name || `#${s.student_id}`;
}

function participantEmail(s: LessonParticipant) {
  return s['student.email'] || s.email || '';
}

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

  const [headerHeight, setHeaderHeight] = useState(0);

  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const selfStudentId = profile?.isStudent
    ? Number(profile.studentId)
    : undefined;

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

  const answerStudentId = isTeacher
    ? activeStudentId
    : selfStudentId ?? studentIdProp;

  const parentLabel =
    from === 'Tutorial'
      ? t('header.tutorial')
      : from === 'Grammar'
        ? t('grammarPage.breadcrumb')
        : t('header.lessonPlans');

  const crumbs = [
    {
      label: t('editor.home'),
      onPress: () => goHome(navigation, isAuthorized),
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
      const studentForLesson = isTeacher
        ? studentIdProp
        : selfStudentId;
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
      setResetOpen(false);
      void load();
    } finally {
      setResetting(false);
    }
  };

  const coverUri = lesson?.image_path
    ? getImageUrl(lesson.image_path)
    : undefined;

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
                paddingBottom: insets.bottom + 40,
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
                  <Image
                    source={{uri: coverUri}}
                    style={styles.cover}
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={getLessonCoverSource(lesson?.image_path)}
                    style={styles.cover}
                    resizeMode="cover"
                  />
                )}

                {isTeacher && participants.length > 0 ? (
                  <View style={styles.participants}>
                    <Text style={styles.participantsTitle}>
                      {t('lessons.participants')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.participantsRow}>
                      {participants.map(s => {
                        const id = Number(s.student_id);
                        const active = id === activeStudentId;
                        return (
                          <Pressable
                            key={String(id)}
                            onPress={() => setActiveStudentId(id)}
                            style={[
                              styles.participantCard,
                              active && styles.participantCardActive,
                            ]}>
                            <Text
                              style={[
                                styles.participantName,
                                active && styles.participantNameActive,
                              ]}
                              numberOfLines={2}>
                              {participantName(s)}
                            </Text>
                            {!!participantEmail(s) && (
                              <Text
                                style={styles.participantEmail}
                                numberOfLines={1}>
                                {participantEmail(s)}
                              </Text>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}

                {isTeacher && answerStudentId ? (
                  <Pressable
                    style={styles.resetLink}
                    onPress={() => setResetOpen(true)}>
                    <Text style={styles.resetText}>
                      {t('lessons.resetAnswers')}
                    </Text>
                  </Pressable>
                ) : null}

                <ExList key={`answers-${answerStudentId || 0}`} list={exercises} />
              </View>
            </LessonScrollView>
          </LessonScrollProvider>
        )}

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
  cover: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    backgroundColor: colors.border,
  },
  participants: {gap: 8},
  participantsTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.text,
  },
  participantsRow: {gap: 8, paddingVertical: 2},
  participantCard: {
    minWidth: 120,
    maxWidth: 180,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participantCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  participantName: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.text,
  },
  participantNameActive: {color: colors.primary},
  participantEmail: {
    marginTop: 4,
    fontSize: 11,
    color: colors.muted,
  },
  resetLink: {alignSelf: 'flex-start', paddingVertical: 4},
  resetText: {color: colors.danger, fontWeight: '600'},
});
