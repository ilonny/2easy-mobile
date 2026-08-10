import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
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
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {fetchExList, fetchLesson, resetAnswers} from '../api/lessonApi';
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

export function LessonViewerScreen({
  lessonId,
  from = 'Lessons',
  studentId: studentIdProp,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();

  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const studentId =
    studentIdProp ??
    (profile?.isStudent ? Number(profile.studentId) : undefined);

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonRes, list] = await Promise.all([
        fetchLesson(lessonId, studentId),
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
  }, [lessonId, studentId, isTeacher, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onResetAll = async () => {
    if (!studentId) {
      return;
    }
    setResetting(true);
    try {
      await Promise.all(
        exercises.map(ex =>
          resetAnswers({
            lesson_id: lessonId,
            ex_id: ex.id,
            student_id: studentId,
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
        studentId,
        activeStudentId: studentId,
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
          <LessonScrollProvider stickyTop={insets.top}>
            <View style={[styles.header, {paddingTop: insets.top + 8}]}>
              <AppHeader />
            </View>
            <LessonScrollView
              style={styles.flex}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: insets.bottom + 40,
              }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled>
              <Breadcrumbs items={crumbs} />
              <Text style={styles.title}>{lesson?.title || ''}</Text>
              {!!lesson?.description && (
                <Text style={styles.desc}>{lesson.description}</Text>
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

              {isTeacher && studentId ? (
                <Pressable
                  style={styles.resetLink}
                  onPress={() => setResetOpen(true)}>
                  <Text style={styles.resetText}>
                    {t('lessons.resetAnswers')}
                  </Text>
                </Pressable>
              ) : null}

              <ExList list={exercises} />
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
  header: {paddingHorizontal: 16, paddingBottom: 8},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  error: {textAlign: 'center', color: colors.danger},
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 16,
  },
  desc: {
    marginTop: 10,
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  cover: {
    marginTop: 16,
    marginBottom: 20,
    width: '100%',
    height: 200,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
  },
  resetLink: {alignSelf: 'center', marginBottom: 12},
  resetText: {
    color: colors.danger,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
