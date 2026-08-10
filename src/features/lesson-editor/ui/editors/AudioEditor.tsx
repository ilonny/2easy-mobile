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

export function AudioEditor({
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
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [audioTitle, setAudioTitle] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setContent(String(d.content || ''));
    setAudioTitle(String(d.audioTitle || ''));
    setImages(attachmentsToPicked(d.images));
    const editorImages = (d.editorImages ||
      d.editorAttachments ||
      []) as Array<{path?: string; dataURL?: string}>;
    setUrl(
      String(
        editorImages[0]?.dataURL ||
          editorImages[0]?.path ||
          d.url ||
          '',
      ),
    );
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      const trimmed = url.trim();
      await persistExercise({
        lessonId,
        exercise,
        type: 'audio',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          content,
          audioTitle: audioTitle || title,
          images: hero,
          editorImages: trimmed
            ? [{path: trimmed, dataURL: trimmed}]
            : [],
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
      title={exercise ? t('common.edit') : 'Audio'}
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
        label={t('editor.audioTitle')}
        value={audioTitle}
        onChangeText={setAudioTitle}
      />
      <TextField
        label={t('editor.audioUrl')}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
      />
      <TextField
        label={t('editor.content')}
        value={content}
        onChangeText={setContent}
        multiline
        style={editorStyles.multiline}
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
