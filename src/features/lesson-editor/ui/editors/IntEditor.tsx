import {useEffect, useState} from 'react';
import {View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
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

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : 'Integration'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}>
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
        label="Iframe HTML"
        value={iframe}
        onChangeText={setIframe}
        multiline
        style={editorStyles.multiline}
        autoCapitalize="none"
      />
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple
          max={4}
        />
      </View>
    </EditorShell>
  );
}
