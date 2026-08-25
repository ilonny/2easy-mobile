import {useCallback, useEffect, useMemo, useState} from 'react';
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

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button} from '../../../shared/ui';
import {addLessonToCourse} from '../../lesson-player/api/lessonApi';
import {fetchCourses, type Course} from '../api/coursesApi';

type Props = {
  visible: boolean;
  lessonId: number;
  lessonTitle?: string;
  onClose: () => void;
  onAdded: () => void;
};

export function AddLessonToCourseModal({
  visible,
  lessonId,
  lessonTitle,
  onClose,
  onAdded,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {profile} = useAuth();
  const {pageGutter, pageContentMaxWidth, isTablet} = useLayout();
  const [courses, setCourses] = useState<Course[]>([]);
  const [chosenIds, setChosenIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const profileId = Number(profile?.id || profile?.user_id || 0);

  const myCourses = useMemo(
    () =>
      courses.filter(c => Number(c.user_id) !== 1 && Number(c.user_id) === profileId),
    [courses, profileId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchCourses();
      setCourses(list);
    } catch {
      setCourses([]);
      setError(t('lessons.loadCoursesFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!visible) {
      setChosenIds([]);
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
    if (!chosenIds.length) {
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await addLessonToCourse({
        lesson_id: lessonId,
        courses_ids: chosenIds,
      });
      if (res.success === false) {
        setError(res.message || t('lessons.addToCourseFailed'));
        return;
      }
      onAdded();
    } catch {
      setError(t('lessons.addToCourseFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={[styles.header, {paddingHorizontal: pageGutter}]}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('lessons.addToCourse')}</Text>
            {!!lessonTitle && (
              <Text style={styles.subtitle} numberOfLines={2}>
                {lessonTitle}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <FlatList
            data={myCourses}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[
              styles.list,
              {
                paddingHorizontal: pageGutter,
                paddingBottom: insets.bottom + 24,
                maxWidth: pageContentMaxWidth,
                width: '100%',
                alignSelf: 'center',
                flexGrow: 1,
              },
            ]}
            ListEmptyComponent={
              <Text style={styles.empty}>{t('lessons.noCourses')}</Text>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {!!error && <Text style={styles.error}>{error}</Text>}
                <Button
                  title={t('common.add')}
                  onPress={() => {
                    void onSubmit();
                  }}
                  loading={submitting}
                  disabled={!chosenIds.length}
                />
                <Pressable onPress={onClose} style={styles.cancelWrap}>
                  <Text style={styles.cancel}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            }
            renderItem={({item}) => {
              const selected = chosenIds.includes(item.id);
              return (
                <Pressable
                  onPress={() => toggle(item.id)}
                  style={[
                    styles.card,
                    selected && styles.cardSelected,
                    isTablet && styles.cardTablet,
                  ]}>
                  <View style={styles.meta}>
                    <Text style={styles.name}>{item.title || `#${item.id}`}</Text>
                    {!!item.description && (
                      <Text style={styles.desc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[styles.check, selected && styles.checkSelected]}>
                    {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    gap: 12,
  },
  headerText: {flex: 1, gap: 4},
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 22, color: colors.muted},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  list: {paddingTop: 8, gap: 10},
  empty: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 40,
    marginBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cardTablet: {minHeight: 72},
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  meta: {flex: 1, gap: 4},
  name: {fontWeight: '700', fontSize: 16, color: colors.text},
  desc: {fontSize: 13, color: colors.muted, lineHeight: 18},
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {color: colors.white, fontWeight: '800', fontSize: 14},
  footer: {gap: 12, marginTop: 16},
  error: {color: colors.danger, textAlign: 'center'},
  cancelWrap: {alignItems: 'center', paddingVertical: 8},
  cancel: {color: colors.muted, fontWeight: '600'},
});
