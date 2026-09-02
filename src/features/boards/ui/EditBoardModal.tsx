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

import {getLessonImageUrl} from '../../../entities/lesson';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {useLayout} from '../../../shared/lib/layout';
import {Button, TextField} from '../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../../lesson-editor/ui/ImagePickerField';
import {uploadPhotos} from '../../lesson-player/api/lessonApi';
import {editBoard} from '../api/boardsApi';
import type {Board} from '../model/types';

type Props = {
  visible: boolean;
  board: Board | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditBoardModal({visible, board, onClose, onSaved}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, authFormMaxWidth} = useLayout();
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible || !board) {
      return;
    }
    setTitle(board.title || '');
    setDescription(board.description || '');
    setTags(board.tags || '');
    setError('');
    if (board.image_path) {
      setCover([
        {
          id: board.image_id != null ? String(board.image_id) : 'cover',
          uri: getLessonImageUrl(board.image_path),
          remoteId: board.image_id,
          path: board.image_path,
        },
      ]);
    } else {
      setCover([]);
    }
  }, [visible, board]);

  const onSubmit = async () => {
    if (!board) {
      return;
    }
    if (!title.trim()) {
      setError(t('editor.titleRequired'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      let image_id: number | string | null =
        board.image_id != null ? board.image_id : null;
      const nextCover = cover[0];
      if (nextCover?.isLocalFile && nextCover.uri) {
        const uploaded = await uploadPhotos([
          {
            uri: nextCover.uri,
            name: 'cover.jpg',
            type: 'image/jpeg',
          },
        ]);
        const uploadedId = Number(
          (uploaded as any)?.attachments?.[0]?.id ||
            (uploaded as any)?.id ||
            0,
        );
        image_id = uploadedId || null;
      } else if (!nextCover) {
        image_id = null;
      }
      const res = await editBoard({
        id: board.id,
        title: title.trim(),
        description: description.trim(),
        tags: tags.trim(),
        image_id,
      });
      if (!res.success) {
        setError(res.message || t('boards.saveError'));
        return;
      }
      onSaved();
    } catch {
      setError(t('boards.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.header,
            {paddingTop: insets.top + 8, paddingHorizontal: pageGutter},
          ]}>
          <Text style={styles.headerTitle}>{t('boards.editBoard')}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: pageGutter,
              paddingBottom: insets.bottom + 24 + keyboardHeight,
              maxWidth: authFormMaxWidth,
              width: '100%',
              alignSelf: 'center',
            },
          ]}
          keyboardShouldPersistTaps="handled">
          <TextField
            label={t('editor.fieldTitle')}
            value={title}
            onChangeText={setTitle}
          />
          <TextField
            label={t('editor.fieldDescription')}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TextField
            label={t('editor.fieldTags')}
            value={tags}
            onChangeText={setTags}
          />
          <ImagePickerField
            label={t('boards.cover')}
            images={cover}
            onChange={setCover}
            multiple={false}
            max={1}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            title={t('common.save')}
            onPress={() => void onSubmit()}
            loading={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.pageBackground},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  headerTitle: {fontSize: 20, fontWeight: '800', color: colors.text},
  close: {fontSize: 20, color: colors.muted, fontWeight: '700'},
  content: {gap: 14, paddingTop: 8},
  error: {color: colors.danger},
});
