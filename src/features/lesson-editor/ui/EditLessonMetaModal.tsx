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
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {AppDialog, Button, TextField} from '../../../shared/ui';
import {
  editLesson,
  uploadPhotos,
  uploadPhotosByUrl,
} from '../../lesson-player/api/lessonApi';
import {getImageUrl} from '../../lesson-player/lib/getImageUrl';
import type {LessonDetail} from '../../lesson-player/model/types';
import {
  ImagePickerField,
  type PickedImage,
} from './ImagePickerField';

type Props = {
  visible: boolean;
  lesson: Pick<
    LessonDetail,
    'id' | 'title' | 'description' | 'tags' | 'image_path'
  > | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditLessonMetaModal({
  visible,
  lesson,
  onClose,
  onSaved,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const keyboardHeight = useKeyboardBottomOffset(visible);

  useEffect(() => {
    if (!visible || !lesson) {
      return;
    }
    setTitle(lesson.title || '');
    setDescription(lesson.description || '');
    setTags(lesson.tags || '');
    setCover(
      lesson.image_path
        ? [
            {
              id: 'cover',
              uri: getImageUrl(lesson.image_path),
              path: lesson.image_path,
            },
          ]
        : [],
    );
    setError('');
  }, [visible, lesson]);

  const onSave = async () => {
    if (!lesson?.id) {
      return;
    }
    if (!title.trim()) {
      setError(t('editor.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      let image_id: number | undefined;
      let image_path: string | undefined;
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
        image_path = uploaded.attachments?.[0]?.path;
      } else if (nextCover?.isRemoteUrl && nextCover.uri) {
        const uploaded = await uploadPhotosByUrl([
          {dataURL: nextCover.uri},
        ]);
        image_id = uploaded.attachments?.[0]?.id;
        image_path = uploaded.attachments?.[0]?.path;
      }
      await editLesson({
        id: lesson.id,
        title: title.trim(),
        description,
        tags,
        ...(image_id != null ? {image_id} : {}),
        ...(image_path ? {image_path} : {}),
      });
      onSaved();
    } catch {
      setError(t('editor.saveFailed'));
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
              <View>
                <Text style={styles.kicker}>{t('editor.lessonSettings')}</Text>
                <Text style={styles.title}>{t('editor.editLesson')}</Text>
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

              <Button
                title={t('common.save')}
                onPress={() => {
                  void onSave();
                }}
                loading={saving}
              />
              <Pressable onPress={onClose} style={styles.cancelWrap}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AppDialog
        visible={!!error && !!title.trim()}
        title={t('common.edit')}
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
  cancelWrap: {alignItems: 'center', paddingVertical: 14},
  cancel: {color: colors.muted, fontWeight: '600'},
});
