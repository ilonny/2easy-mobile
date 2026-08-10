import {useEffect, useState} from 'react';
import {Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {TextField} from '../../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {RichHtmlEditor} from './RichHtmlEditor';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
} from './editorShared';

export function TextDefaultEditor({
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
  const [images, setImages] = useState<PickedImage[]>([]);
  const [editorImages, setEditorImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const editorKey = String(exercise?.id || 'new');

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setContent(String(d.content || ''));
    setImages(attachmentsToPicked(d.images));
    setEditorImages(attachmentsToPicked(d.editorImages));
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const [hero, inline] = await Promise.all([
        resolvePickedAttachments(images),
        resolvePickedAttachments(editorImages),
      ]);
      await persistExercise({
        lessonId,
        exercise,
        type: 'text-default',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          content,
          images: hero,
          editorImages: inline,
          viewType: 'carousel',
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
      title={exercise ? t('common.edit') : 'Text'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}>
      <TextField
        label={t('editor.fieldTitle')}
        value={title}
        onChangeText={setTitle}
      />
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
      <Text style={editorStyles.sectionLabel}>{t('editor.content')}</Text>
      <RichHtmlEditor
        key={`content-${editorKey}`}
        html={content}
        onChangeHtml={setContent}
        placeholder={t('editor.content')}
      />
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.heroImages')}
          images={images}
          onChange={setImages}
          multiple
          max={8}
        />
      </View>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.editorImages')}
          images={editorImages}
          onChange={setEditorImages}
          multiple
          max={8}
        />
      </View>
    </EditorShell>
  );
}
