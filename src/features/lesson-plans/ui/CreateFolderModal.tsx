import {useEffect, useState} from 'react';
import {
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
import {colors} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {Button, TextField} from '../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../../lesson-editor/ui/ImagePickerField';
import {
  uploadPhotos,
  uploadPhotosByUrl,
} from '../../lesson-player/api/lessonApi';
import {getImageUrl} from '../../lesson-player/lib/getImageUrl';
import {createFolder, editFolder} from '../api/catalogApi';
import type {CatalogFolder} from '../model/catalogTypes';

type Props = {
  visible: boolean;
  folder?: CatalogFolder | null;
  onClose: () => void;
  onSaved: () => void;
};

export function CreateFolderModal({visible, folder, onClose, onSaved}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const isEdit = !!folder?.id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const keyboardHeight = useKeyboardBottomOffset(visible);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setTitle(folder?.title || '');
    setDescription(folder?.description || '');
    setTags(folder?.tags || '');
    setCover(
      folder?.image_path
        ? [
            {
              id: 'cover',
              uri: getImageUrl(folder.image_path),
              path: folder.image_path,
            },
          ]
        : [],
    );
    setError('');
  }, [visible, folder]);

  const onSubmit = async () => {
    if (!title.trim()) {
      setError(t('lessons.folderNameRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      let image_id: number | string | undefined;
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
        const uploaded = await uploadPhotosByUrl([{dataURL: nextCover.uri}]);
        image_id = uploaded.attachments?.[0]?.id;
      }

      const res = isEdit
        ? await editFolder({
            id: folder!.id,
            title: title.trim(),
            description,
            tags,
            ...(image_id != null ? {image_id} : {}),
          })
        : await createFolder({
            title: title.trim(),
            description,
            tags,
            ...(image_id != null ? {image_id} : {}),
          });

      if (res.success === false) {
        setError(res.message || t('lessons.folderSaveFailed'));
        return;
      }
      onSaved();
    } catch {
      setError(t('lessons.folderSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
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
            <Text style={styles.title}>
              {isEdit ? t('lessons.editFolder') : t('lessons.createFolder')}
            </Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={[
              styles.body,
              {paddingBottom: insets.bottom + 32 + keyboardHeight},
            ]}
            keyboardShouldPersistTaps="handled">
            <TextField
              label={t('lessons.folderName')}
              value={title}
              onChangeText={setTitle}
            />
            <TextField
              label={t('lessons.folderDescription')}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextField
              label={t('lessons.folderTag')}
              value={tags}
              onChangeText={setTags}
            />
            <ImagePickerField
              label={t('lessons.folderCover')}
              images={cover}
              onChange={setCover}
              multiple={false}
              max={1}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <Button
              title={isEdit ? t('common.save') : t('lessons.createFolder')}
              onPress={() => void onSubmit()}
              loading={saving}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  root: {flex: 1, backgroundColor: colors.white},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  close: {color: colors.primary, fontSize: 16, fontWeight: '700'},
  body: {padding: 16, gap: 14},
  error: {color: colors.danger, fontSize: 14},
});
