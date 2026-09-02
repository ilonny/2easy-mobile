import {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button} from '../../../shared/ui';
import {
  fetchStudents,
  type Student,
} from '../../students/api/studentsApi';
import {createBoardRelation} from '../api/boardsApi';
import type {Board} from '../model/types';

type Props = {
  visible: boolean;
  board: Board | null;
  onClose: () => void;
  onAttached: () => void;
};

type RelationStatus = 'open' | 'close';

function shortName(name: string) {
  return name
    .split(' ')
    .map(part => part[0] || '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function AttachBoardToStudentsModal({
  visible,
  board,
  onClose,
  onAttached,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const [step, setStep] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [status, setStatus] = useState<RelationStatus>('open');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchStudents();
      setStudents(list);
    } catch {
      setStudents([]);
      setError(t('lessons.startLessonLoadStudentsFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      setChosenIds([]);
      setStep(0);
      setStatus('open');
      setError('');
      return;
    }
    void load();
  }, [visible, load]);

  const toggle = (id: number) => {
    setChosenIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id),
    );
  };

  const onSubmit = async () => {
    if (!board || !chosenIds.length) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const results = await Promise.all(
        chosenIds.map(student_id =>
          createBoardRelation({
            board_id: board.id,
            student_id,
            status,
          }),
        ),
      );
      if (results.some(r => r.success === false)) {
        setError(t('boards.saveError'));
        return;
      }
      onAttached();
    } catch {
      setError(t('boards.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
          <Text style={styles.title} numberOfLines={2}>
            {step === 0
              ? t('boards.attachSelectStudents')
              : t('boards.attachStatus')}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            {step === 0 ? (
              <FlatList
                data={students}
                keyExtractor={item => String(item.id)}
                style={styles.listFlex}
                contentContainerStyle={[
                  styles.list,
                  {
                    paddingHorizontal: pageGutter,
                    paddingBottom: 16,
                    maxWidth: pageContentMaxWidth,
                    width: '100%',
                    alignSelf: 'center',
                    flexGrow: 1,
                  },
                ]}
                renderItem={({item}) => {
                  const selected = chosenIds.includes(item.id);
                  return (
                    <Pressable
                      onPress={() => toggle(item.id)}
                      style={[styles.row, selected && styles.rowSelected]}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {shortName(item.name || '?')}
                        </Text>
                      </View>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name || `#${item.id}`}
                      </Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.empty}>{t('students.noStudents')}</Text>
                }
              />
            ) : (
              <View
                style={[
                  styles.statusWrap,
                  {
                    paddingHorizontal: pageGutter,
                    maxWidth: pageContentMaxWidth,
                    width: '100%',
                    alignSelf: 'center',
                  },
                ]}>
                <Pressable
                  onPress={() => setStatus('open')}
                  style={[
                    styles.statusCard,
                    status === 'open' && styles.statusCardActive,
                  ]}>
                  <Text style={styles.statusTitle}>{t('boards.boardOpen')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setStatus('close')}
                  style={[
                    styles.statusCard,
                    status === 'close' && styles.statusCardActive,
                  ]}>
                  <Text style={styles.statusTitle}>
                    {t('boards.boardClosed')}
                  </Text>
                </Pressable>
              </View>
            )}
            <View
              style={[
                styles.footerBar,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom: insets.bottom + 16,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
              {!!error && <Text style={styles.error}>{error}</Text>}
              {step === 0 ? (
                <Button
                  title={t('common.next')}
                  onPress={() => setStep(1)}
                  disabled={!chosenIds.length}
                />
              ) : (
                <View style={[styles.actions, isTablet && styles.actionsTablet]}>
                  <Button
                    title={t('common.back')}
                    variant="secondary"
                    onPress={() => setStep(0)}
                  />
                  <Button
                    title={t('boards.attachToStudent')}
                    onPress={() => void onSubmit()}
                    loading={submitting}
                  />
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.pageBackground},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {flex: 1, fontSize: 18, fontWeight: '800', color: colors.text},
  close: {fontSize: 20, fontWeight: '700', color: colors.muted},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  listFlex: {flex: 1},
  list: {gap: 8, paddingTop: 4},
  statusWrap: {flex: 1, gap: 12, paddingTop: 8},
  footerBar: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.pageBackground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontWeight: '800', color: colors.primary},
  name: {flex: 1, fontSize: 15, fontWeight: '600', color: colors.text},
  empty: {textAlign: 'center', color: colors.muted, marginTop: 24},
  error: {color: colors.danger, marginBottom: 8},
  statusCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  statusCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  statusTitle: {fontSize: 16, fontWeight: '700', color: colors.text},
  actions: {gap: 10},
  actionsTablet: {flexDirection: 'row'},
});
