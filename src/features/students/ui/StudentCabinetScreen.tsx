import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import type {StudentsStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {fetchSecureLessons} from '../../lesson-plans/api/lessonsApi';
import {LessonCard} from '../../lesson-plans/ui/LessonCard';
import {
  deleteStudent,
  fetchStudentInfo,
  type Student,
} from '../api/studentsApi';
import {CreateStudentModal} from './CreateStudentModal';
import {StudentCard} from './StudentCard';

type Nav = NativeStackNavigationProp<StudentsStackParamList>;

type Props = {
  studentId: number;
};

type NoticeState = {
  title?: string;
  message: string;
} | null;

export function StudentCabinetScreen({studentId}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {profile} = useAuth();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();

  const isTeacher = profile?.role_id === 1 || profile?.role_id === 2;
  const isStudentSelf =
    !!profile?.isStudent && Number(profile.studentId) === Number(studentId);

  const [student, setStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const load = useCallback(async () => {
    try {
      const [info, lessonsRes] = await Promise.all([
        fetchStudentInfo(studentId),
        fetchSecureLessons(studentId),
      ]);
      setStudent(info);
      setLessons(lessonsRes.lessons ?? []);
    } catch {
      setStudent(null);
      setLessons([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return lessons;
    }
    return lessons.filter(l => l.title?.toLowerCase().includes(q));
  }, [lessons, search]);

  const onConfirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    try {
      const res = await deleteStudent(pendingDelete.id);
      if (res.success === false) {
        setPendingDelete(null);
        setNotice({message: res.message || 'Error'});
        return;
      }
      setPendingDelete(null);
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('StudentsList');
      }
    } finally {
      setDeleting(false);
    }
  };

  const crumbs = isTeacher
    ? [
        {
          label: t('editor.home'),
          onPress: () => goHome(navigation as never, true),
        },
        {
          label: t('profile.myStudents'),
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('StudentsList');
            }
          },
        },
        {label: student?.name || t('common.loading')},
      ]
    : [{label: t('students.studentCabinet')}];

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !student ? (
        <View style={styles.centered}>
          <Text style={styles.error}>{t('lessonPlans.empty')}</Text>
          {isTeacher ? (
            <Button
              title={t('students.allStudents')}
              onPress={() => navigation.navigate('StudentsList')}
            />
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={[
            styles.list,
            {
              paddingHorizontal: pageGutter,
              paddingBottom: 32,
              maxWidth: pageContentMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          ListHeaderComponent={
            <View style={styles.intro}>
              <Breadcrumbs items={crumbs} />
              <Text style={styles.title}>{t('students.studentCabinet')}</Text>

              {isTeacher ? (
                <StudentCard
                  student={student}
                  hideCabinetAction
                  onOpenCabinet={() => undefined}
                  onEdit={() => setEditOpen(true)}
                  onDelete={setPendingDelete}
                />
              ) : (
                <View style={styles.selfCard}>
                  <Text style={styles.selfName}>{student.name}</Text>
                  {!!student.email && (
                    <Text style={styles.selfEmail}>{student.email}</Text>
                  )}
                  {!!student.tag && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{student.tag}</Text>
                    </View>
                  )}
                </View>
              )}

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('students.searchLessons')}
                placeholderTextColor={colors.muted}
                style={styles.search}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              <Text style={styles.section}>
                {t('profile.lessonsAndCourses')}
              </Text>
            </View>
          }
          renderItem={({item}) => (
            <View style={styles.gridItem}>
              <LessonCard
                lesson={item}
                onPress={lesson => {
                  if (!(isTeacher || isStudentSelf)) {
                    return;
                  }
                  navigation.getParent()?.navigate('Lessons', {
                    screen: 'LessonViewer',
                    params: {
                      lessonId: lesson.id,
                      from: 'Lessons',
                      studentId: isTeacher ? studentId : undefined,
                    },
                  });
                }}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>{t('students.noLessons')}</Text>
          }
        />
      )}

      {isTeacher && student ? (
        <CreateStudentModal
          visible={editOpen}
          student={student}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            void load();
          }}
        />
      ) : null}

      <AppDialog
        visible={!!pendingDelete}
        title={t('common.delete')}
        message={t('students.deleteStudentConfirm').replace(
          '{{name}}',
          pendingDelete?.name || '',
        )}
        onClose={() => (!deleting ? setPendingDelete(null) : undefined)}
        closeOnBackdrop={!deleting}
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
            onPress: () => setPendingDelete(null),
          },
        ]}
      />

      <AppDialog
        visible={!!notice}
        message={notice?.message}
        title={notice?.title}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {paddingHorizontal: 16, paddingBottom: 8},
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  error: {color: colors.danger, textAlign: 'center'},
  list: {paddingTop: 8},
  intro: {gap: 12, marginBottom: 12},
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  selfCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  selfName: {fontSize: 18, fontWeight: '700', color: colors.text},
  selfEmail: {fontSize: 14, color: colors.muted},
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  tagText: {fontSize: 12, color: '#B45309', fontWeight: '600'},
  search: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  row: {gap: 12},
  gridItem: {flex: 1, marginBottom: 12},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 24,
  },
});
