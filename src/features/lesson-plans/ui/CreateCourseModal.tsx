import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {TWO_EASY_USER_ID, type Lesson} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {useLayout} from '../../../shared/lib/layout';
import {AppDialog, Button, TextField} from '../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../../lesson-editor/ui/ImagePickerField';
import {
  uploadPhotos,
  uploadPhotosByUrl,
} from '../../lesson-player/api/lessonApi';
import {getImageUrl} from '../../lesson-player/lib/getImageUrl';
import {fetchSecureLessons} from '../api/lessonsApi';
import {fetchCourseLessons, saveCourse, type Course} from '../api/coursesApi';

type Props = {
  visible: boolean;
  course?: Course | null;
  onClose: () => void;
  onSaved: (courseId: number) => void;
};

function isLessonLinkedToSource(lesson: Lesson, sourceId: number): boolean {
  return (
    Number(lesson.id) === sourceId ||
    Number(lesson.created_from_id) === sourceId
  );
}

export function CreateCourseModal({visible, course, onClose, onSaved}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {profile} = useAuth();
  const {pageGutter, pageContentMaxWidth} = useLayout();
  const isAdmin = profile?.role_id === 1;
  const isEdit = !!course?.id;

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [orderedLessons, setOrderedLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState('');
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const keyboardHeight = useKeyboardBottomOffset(visible);

  const reset = useCallback(() => {
    setStep(0);
    setTitle(course?.title || '');
    setDescription(course?.description || '');
    setTags(course?.tags || '');
    setCover(
      course?.image_path
        ? [
            {
              id: 'existing',
              uri: getImageUrl(course.image_path),
              path: course.image_path,
            },
          ]
        : [],
    );
    setOrderedLessons([]);
    setSearch('');
    setError('');
  }, [course]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    reset();
  }, [visible, reset]);

  const loadLessons = useCallback(async () => {
    setLoadingLessons(true);
    try {
      const res = await fetchSecureLessons();
      const list = (res.lessons || []).filter(lesson =>
        isAdmin
          ? Number(lesson.user_id) === TWO_EASY_USER_ID
          : Number(lesson.user_id) !== TWO_EASY_USER_ID,
      );
      setAllLessons(list);
      if (course?.id) {
        const current = await fetchCourseLessons(course.id);
        setOrderedLessons(current);
      }
    } catch {
      setAllLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }, [isAdmin, course?.id]);

  useEffect(() => {
    if (visible && step >= 1) {
      void loadLessons();
    }
  }, [visible, step, loadLessons]);

  const searchedLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return allLessons;
    }
    return allLessons.filter(
      lesson =>
        lesson.title?.toLowerCase().includes(q) ||
        lesson.description?.toLowerCase().includes(q),
    );
  }, [allLessons, search]);

  const isSelected = (lesson: Lesson) =>
    orderedLessons.some(item => isLessonLinkedToSource(item, Number(lesson.id)));

  const toggleLesson = (lesson: Lesson) => {
    setOrderedLessons(prev => {
      const sourceId = Number(lesson.id);
      const exists = prev.some(item => isLessonLinkedToSource(item, sourceId));
      if (exists) {
        return prev.filter(item => !isLessonLinkedToSource(item, sourceId));
      }
      return prev.concat(lesson);
    });
  };

  const moveLesson = (index: number, dir: -1 | 1) => {
    setOrderedLessons(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  };

  const onSubmitStep = async () => {
    if (step === 0) {
      if (!title.trim()) {
        setError(t('editor.titleRequired'));
        return;
      }
      setError('');
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }

    setSaving(true);
    setError('');
    try {
      let image_id: number | undefined;
      const nextCover = cover[0];
      if (nextCover?.isLocalFile && nextCover.uri) {
        const uploaded = await uploadPhotos([
          {uri: nextCover.uri, name: 'cover.jpg', type: 'image/jpeg'},
        ]);
        image_id = uploaded.attachments?.[0]?.id;
      } else if (nextCover?.isRemoteUrl && nextCover.uri) {
        const uploaded = await uploadPhotosByUrl([{dataURL: nextCover.uri}]);
        image_id = uploaded.attachments?.[0]?.id;
      }

      const res = await saveCourse({
        ...(isEdit ? {id: course!.id} : {}),
        title: title.trim(),
        description,
        tags,
        ...(image_id != null ? {image_id} : {}),
        lesson_ids: orderedLessons.map(lesson => Number(lesson.id)),
      });
      const courseId = Number(res?.createdCourse?.id || course?.id || 0);
      if (!res.success || !courseId) {
        setError(res.message || t('lessons.createCourseFailed'));
        return;
      }
      onSaved(courseId);
    } catch {
      setError(t('lessons.createCourseFailed'));
    } finally {
      setSaving(false);
    }
  };

  const headerTitle =
    step === 0
      ? title.trim() || (isEdit ? t('lessons.editCourse') : t('modals.newCourse'))
      : step === 1
        ? t('modals.selectLessonsForCourse').replace('{{title}}', title.trim())
        : t('modals.reorderLessonsHint');

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.root, {paddingTop: insets.top + 8}]}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={styles.kicker}>
                  {isEdit ? t('lessons.editCourse') : t('lessons.createCourse')}
                </Text>
                <Text style={styles.title} numberOfLines={2}>
                  {headerTitle}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            {step === 1 ? (
              <View
                style={[
                  styles.searchWrap,
                  {
                    paddingHorizontal: pageGutter,
                    maxWidth: pageContentMaxWidth,
                    width: '100%',
                    alignSelf: 'center',
                  },
                ]}>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('lessons.searchLessons')}
                  placeholderTextColor={colors.muted}
                  style={styles.search}
                  autoCorrect={false}
                />
              </View>
            ) : null}

            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.body,
                {
                  paddingHorizontal: pageGutter,
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                  paddingBottom: 16,
                },
              ]}
              keyboardShouldPersistTaps="handled">
              {step === 0 ? (
                <>
                  <View style={styles.card}>
                    <TextField
                      label={t('editor.fieldTitle')}
                      value={title}
                      onChangeText={setTitle}
                      error={error && !title.trim() ? error : undefined}
                    />
                    <TextField
                      label={t('editor.fieldDescription')}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      style={styles.multiline}
                    />
                    <TextField
                      label={t('editor.fieldTags')}
                      value={tags}
                      onChangeText={setTags}
                    />
                  </View>
                  <View style={styles.card}>
                    <ImagePickerField
                      label={t('editor.courseCover')}
                      images={cover}
                      onChange={setCover}
                      multiple={false}
                      max={1}
                    />
                    {cover[0]?.uri ? (
                      <Image
                        source={{uri: cover[0].uri}}
                        style={styles.cover}
                      />
                    ) : null}
                  </View>
                </>
              ) : null}

              {step === 1 ? (
                loadingLessons ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  searchedLessons.map(lesson => {
                    const selected = isSelected(lesson);
                    return (
                      <Pressable
                        key={lesson.id}
                        onPress={() => toggleLesson(lesson)}
                        style={[
                          styles.lessonRow,
                          selected && styles.lessonRowOn,
                        ]}>
                        <View
                          style={[styles.check, selected && styles.checkOn]}>
                          {selected ? (
                            <Text style={styles.checkMark}>✓</Text>
                          ) : null}
                        </View>
                        <Text style={styles.lessonTitle} numberOfLines={2}>
                          {lesson.title}
                        </Text>
                      </Pressable>
                    );
                  })
                )
              ) : null}

              {step === 2 ? (
                <>
                  <Text style={styles.hint}>
                    {t('modals.reorderLessonsHint')}
                  </Text>
                  {orderedLessons.map((lesson, index) => (
                    <View key={lesson.id} style={styles.orderRow}>
                      <Text style={styles.orderIndex}>{index + 1}</Text>
                      <Text style={styles.lessonTitle} numberOfLines={2}>
                        {lesson.title}
                      </Text>
                      <View style={styles.orderBtns}>
                        <Pressable
                          disabled={index === 0}
                          onPress={() => moveLesson(index, -1)}
                          style={styles.orderBtn}>
                          <Text style={styles.orderBtnText}>↑</Text>
                        </Pressable>
                        <Pressable
                          disabled={index === orderedLessons.length - 1}
                          onPress={() => moveLesson(index, 1)}
                          style={styles.orderBtn}>
                          <Text style={styles.orderBtnText}>↓</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {!orderedLessons.length ? (
                    <Text style={styles.hint}>
                      {t('lessonPlans.emptyCourse')}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </ScrollView>

            <View
              style={[
                styles.footerBar,
                {
                  paddingHorizontal: pageGutter,
                  paddingBottom:
                    insets.bottom +
                    12 +
                    (Platform.OS === 'android' ? keyboardHeight : 0),
                  maxWidth: pageContentMaxWidth,
                  width: '100%',
                  alignSelf: 'center',
                },
              ]}>
              <Button
                title={
                  step < 2
                    ? t('common.next')
                    : isEdit
                      ? t('common.save')
                      : t('lessons.createCourse')
                }
                onPress={() => {
                  void onSubmitStep();
                }}
                loading={saving}
              />
              {step > 0 ? (
                <Button
                  title={t('common.back')}
                  variant="secondary"
                  onPress={() => setStep(s => Math.max(0, s - 1))}
                />
              ) : (
                <Pressable onPress={onClose} style={styles.cancelWrap}>
                  <Text style={styles.cancel}>{t('common.cancel')}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AppDialog
        visible={!!error && !!title.trim() && step !== 0}
        title={t('lessons.createCourse')}
        message={error}
        onClose={() => setError('')}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setError(''),
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: '#F7F5FF'},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: {flex: 1, marginRight: 12, gap: 2},
  kicker: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  title: {fontSize: 20, fontWeight: '800', color: colors.primary},
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {fontSize: 16, color: colors.muted, fontWeight: '700'},
  body: {padding: 16, flexGrow: 1},
  searchWrap: {paddingHorizontal: 16, paddingBottom: 8},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  multiline: {minHeight: 100, textAlignVertical: 'top', paddingTop: 12},
  cover: {
    width: '100%',
    height: 160,
    borderRadius: radii.lg,
    marginTop: 8,
    backgroundColor: colors.primarySoft,
  },
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
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  lessonRowOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  checkMark: {color: colors.white, fontWeight: '800'},
  lessonTitle: {flex: 1, fontWeight: '700', color: colors.text, fontSize: 15},
  hint: {color: colors.textSecondary, marginBottom: 12, lineHeight: 20},
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
  },
  orderIndex: {fontWeight: '800', color: colors.primary, width: 22},
  orderBtns: {flexDirection: 'row', gap: 6},
  orderBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnText: {fontSize: 16, fontWeight: '800', color: colors.primary},
  footerBar: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: '#F7F5FF',
  },
  cancelWrap: {alignItems: 'center', paddingVertical: 6},
  cancel: {color: colors.muted, fontWeight: '600'},
});
