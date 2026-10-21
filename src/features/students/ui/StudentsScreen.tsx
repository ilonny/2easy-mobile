import {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome, openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {AppDialog, Breadcrumbs, Button} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {useSubscription} from '../../home/model/useSubscription';
import {
  deleteStudent,
  fetchStudents,
  setStudentArchived,
  type Student,
} from '../api/studentsApi';
import {CreateStudentModal} from './CreateStudentModal';
import {StudentCard} from './StudentCard';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type NoticeState = {
  title?: string;
  message: string;
} | null;

export function StudentsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {hasSubscription, loading: subLoading} = useSubscription();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();
  const [students, setStudents] = useState<Student[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);
  const [pendingArchive, setPendingArchive] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchStudents({archived: showArchived});
      setStudents(list);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showArchived]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const requireSubscription = () => {
    if (subLoading) {
      return false;
    }
    if (!hasSubscription) {
      openSectionRoute(navigation, 'Subscription', isAuthorized);
      return false;
    }
    return true;
  };

  const openCreate = () => {
    if (!requireSubscription()) {
      return;
    }
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    if (!requireSubscription()) {
      return;
    }
    setEditing(student);
    setModalOpen(true);
  };

  const openCabinet = (student: Student) => {
    navigation.navigate('StudentCabinet', {studentId: student.id});
  };

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
      void load();
    } finally {
      setDeleting(false);
    }
  };

  const onConfirmArchive = async () => {
    if (!pendingArchive) {
      return;
    }
    setArchiving(true);
    try {
      const res = await setStudentArchived(pendingArchive.id, !showArchived);
      if (res.success === false) {
        setPendingArchive(null);
        setNotice({message: res.message || 'Error'});
        return;
      }
      setPendingArchive(null);
      void load();
    } finally {
      setArchiving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => String(item.id)}
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
              paddingBottom: 24,
              maxWidth: pageContentMaxWidth,
              width: '100%',
              alignSelf: 'center',
              flexGrow: 1,
            },
          ]}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Breadcrumbs
                items={[
                  {
                    label: t('editor.home'),
                    onPress: () => goHome(navigation as never, isAuthorized),
                  },
                  {label: t('profile.myStudents')},
                ]}
              />
              <Text style={styles.title}>{t('profile.myStudents')}</Text>
              <View style={styles.tabs}>
                <Pressable
                  onPress={() => setShowArchived(false)}
                  style={[styles.tab, !showArchived && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      !showArchived && styles.tabTextActive,
                    ]}>
                    {t('students.activeTab')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowArchived(true)}
                  style={[styles.tab, showArchived && styles.tabActive]}>
                  <Text
                    style={[
                      styles.tabText,
                      showArchived && styles.tabTextActive,
                    ]}>
                    {t('students.archivedTab')}
                  </Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {showArchived
                  ? t('students.noArchivedStudents')
                  : t('students.noStudents')}
              </Text>
              {!showArchived ? (
                <Button title={t('students.add')} onPress={openCreate} />
              ) : null}
            </View>
          }
          renderItem={({item}) => (
            <StudentCard
              student={item}
              isArchivedList={showArchived}
              onOpenCabinet={openCabinet}
              onEdit={openEdit}
              onArchiveToggle={student => {
                if (!requireSubscription()) {
                  return;
                }
                setPendingArchive(student);
              }}
              onDelete={student => {
                if (!requireSubscription()) {
                  return;
                }
                setPendingDelete(student);
              }}
            />
          )}
          ListFooterComponent={
            students.length && !showArchived ? (
              <Pressable style={styles.addMore} onPress={openCreate}>
                <Text style={styles.addMoreText}>
                  {t('students.addNewStudent')}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      <CreateStudentModal
        visible={modalOpen}
        student={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSuccess={() => {
          void load();
        }}
      />

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
        visible={!!pendingArchive}
        title={
          showArchived ? t('students.unarchive') : t('students.archive')
        }
        message={(showArchived
          ? t('students.unarchiveStudentConfirm')
          : t('students.archiveStudentConfirm')
        ).replace('{{name}}', pendingArchive?.name || '')}
        onClose={() => (!archiving ? setPendingArchive(null) : undefined)}
        closeOnBackdrop={!archiving}
        actions={[
          {
            label: showArchived
              ? t('students.unarchive')
              : t('students.archive'),
            variant: 'primary',
            loading: archiving,
            onPress: () => {
              void onConfirmArchive();
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setPendingArchive(null),
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
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 12,
  },
  listHeader: {
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  empty: {
    marginTop: 40,
    alignItems: 'center',
    gap: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addMore: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  addMoreText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
