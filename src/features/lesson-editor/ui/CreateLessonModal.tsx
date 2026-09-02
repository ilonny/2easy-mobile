import {useEffect, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {AppDialog, Button, TextField} from '../../../shared/ui';
import {canUseAi} from '../../ai/lib/canUseAi';
import {CreateLessonWithAiModal} from '../../ai/ui/CreateLessonWithAiModal';
import {useSubscription} from '../../home/model/useSubscription';
import {
  createLesson,
  uploadPhotos,
  uploadPhotosByUrl,
} from '../../lesson-player/api/lessonApi';
import {
  ImagePickerField,
  type PickedImage,
} from './ImagePickerField';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (lessonId: number) => void;
  courseId?: number;
  initialTitle?: string;
  initialDescription?: string;
  initialTags?: string;
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CreateLessonModal({
  visible,
  onClose,
  onCreated,
  courseId,
  initialTitle = '',
  initialDescription = '',
  initialTags = '',
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {profile} = useAuth();
  const {hasPaidTariff} = useSubscription();
  const showAi = canUseAi(profile);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [tags, setTags] = useState(initialTags);
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGateMessage, setAiGateMessage] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(initialTitle);
    setDescription(initialDescription);
    setTags(initialTags);
    setCover([]);
    setError('');
  }, [visible, initialTitle, initialDescription, initialTags]);

  const onSubmit = async () => {
    if (!title.trim()) {
      setError(t('editor.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      let image_id: number | undefined;
      const nextCover = cover[0];
      if (nextCover?.isLocalFile && nextCover.uri) {
        const uploaded = await uploadPhotos([
          {
            uri: nextCover.uri,
            name: 'cover.jpg',
            type: 'image/jpeg',
          },
        ]);
        image_id = uploaded.attachments?.[0]?.id;
      } else if (nextCover?.isRemoteUrl && nextCover.uri) {
        const uploaded = await uploadPhotosByUrl([
          {dataURL: nextCover.uri},
        ]);
        image_id = uploaded.attachments?.[0]?.id;
      }

      const res = (await createLesson({
        title: title.trim(),
        description,
        tags,
        ...(image_id != null ? {image_id} : {}),
        ...(courseId != null ? {course_id: courseId} : {}),
      })) as {success?: boolean; createdLesson?: {id?: number}};

      const lessonId = Number(res?.createdLesson?.id || 0);
      if (!lessonId) {
        setError(t('editor.createLessonFailed'));
        return;
      }
      onCreated(lessonId);
    } catch {
      setError(t('editor.createLessonFailed'));
    } finally {
      setSaving(false);
    }
  };

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
                <Text style={styles.kicker}>{t('editor.createLesson')}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {title.trim() || t('editor.newLesson')}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={[
                styles.body,
                {
                  paddingBottom:
                    insets.bottom +
                    32 +
                    (Platform.OS === 'android' ? keyboardHeight : 0),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
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
                  label={t('editor.coverImage')}
                  images={cover}
                  onChange={setCover}
                  multiple={false}
                  max={1}
                />
                {cover[0]?.uri ? (
                  <Image source={{uri: cover[0].uri}} style={styles.cover} />
                ) : null}
              </View>

              <View style={styles.actions}>
                <Button
                  title={t('editor.createLesson')}
                  onPress={() => {
                    void onSubmit();
                  }}
                  loading={saving}
                />
                {showAi ? (
                  <Button
                    title={t('ai.createWithAi')}
                    variant="secondary"
                    style={styles.aiButton}
                    onPress={() => {
                      if (!hasPaidTariff) {
                        setAiGateMessage(t('ai.needPaidSubscription'));
                        return;
                      }
                      onClose();
                      setAiOpen(true);
                    }}
                  />
                ) : null}
                <Pressable onPress={onClose} style={styles.cancelWrap}>
                  <Text style={styles.cancel}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {showAi ? (
        <CreateLessonWithAiModal
          visible={aiOpen}
          courseId={courseId}
          onClose={() => setAiOpen(false)}
          onCreated={lessonId => {
            setAiOpen(false);
            onCreated(lessonId);
          }}
        />
      ) : null}
      <AppDialog
        visible={!!aiGateMessage}
        title={t('ai.createWithAi')}
        message={aiGateMessage}
        onClose={() => setAiGateMessage('')}
        actions={[
          {
            label: t('lessons.chooseTariff'),
            variant: 'primary',
            onPress: () => {
              setAiGateMessage('');
              navigation.navigate('Subscription');
            },
          },
          {
            label: t('common.cancel'),
            variant: 'ghost',
            onPress: () => setAiGateMessage(''),
          },
        ]}
      />
      <AppDialog
        visible={!!error && !!title.trim()}
        title={t('editor.createLesson')}
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
  body: {padding: 16},
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
  actions: {
    gap: 12,
    marginTop: 4,
  },
  aiButton: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
  },
  cancelWrap: {alignItems: 'center', paddingVertical: 6},
  cancel: {color: colors.muted, fontWeight: '600'},
});
