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

import {getLessonImageUrl} from '../../../entities/lesson';
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
  const {pageGutter, pageContentMaxWidth} = useLayout();
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
      } else if (nextCover?.isRemoteUrl && nextCover.uri) {
        const uploaded = await uploadPhotosByUrl([{dataURL: nextCover.uri}]);
        image_id = Number(uploaded.attachments?.[0]?.id || 0) || null;
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
                <Text style={styles.kicker}>{t('boards.editBoard')}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {title.trim() || t('boards.editBoard')}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

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
                  label={t('boards.cover')}
                  images={cover}
                  onChange={setCover}
                  multiple={false}
                  max={1}
                />
                {cover[0]?.uri ? (
                  <Image source={{uri: cover[0].uri}} style={styles.cover} />
                ) : null}
              </View>
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
                title={t('common.save')}
                onPress={() => {
                  void onSubmit();
                }}
                loading={saving}
              />
              <Pressable onPress={onClose} style={styles.cancelWrap}>
                <Text style={styles.cancel}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
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
