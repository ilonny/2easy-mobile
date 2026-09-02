import {useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {colors} from '../../../../shared/config/theme';
import {TextField} from '../../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

export function IntEditor({
  visible,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
}: EditorCommonProps & {visible: boolean}) {
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [iframe, setIframe] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setIframe(String(d.iframe || d.content || ''));
    setImages(attachmentsToPicked(d.images));
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'int',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          iframe,
          images: hero,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const previewData = useMemo(
    () => ({
      title,
      titleColor: TITLE_COLOR,
      subtitle,
      description,
      iframe,
      images: pickedToPreviewMedia(images),
    }),
    [title, subtitle, description, iframe, images],
  );

  return (
    <EditorShell
      visible={visible}
      title={
        exercise
          ? t('common.edit')
          : t('templates.integrations')
      }
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="int"
      previewLessonId={lessonId}
      previewData={previewData}>
      <TextField label={t('editor.fieldTitle')} value={title} onChangeText={setTitle} />
      <TextField
        label={t('editor.fieldSubtitle')}
        value={subtitle}
        onChangeText={setSubtitle}
      />
      <TextField
        label={t('editor.fieldDescription')}
        value={description}
        onChangeText={setDescription}
      />
      <TextField
        label={t('editor.embedCode')}
        value={iframe}
        onChangeText={setIframe}
        multiline
        style={editorStyles.multiline}
        autoCapitalize="none"
        placeholder="<iframe …>"
      />
      <Text style={styles.hint}>{t('editor.embedCodeHint')}</Text>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple={false}
          max={1}
        />
      </View>
    </EditorShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: -8,
    marginBottom: 16,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
