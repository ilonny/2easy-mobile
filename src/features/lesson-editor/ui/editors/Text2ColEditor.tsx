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

export function Text2ColEditor({
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
  const [secondContent, setSecondContent] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [editorImages, setEditorImages] = useState<PickedImage[]>([]);
  const [secondEditorImages, setSecondEditorImages] = useState<PickedImage[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const editorKey = String(exercise?.id || 'new');

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setContent(String(d.content || ''));
    setSecondContent(String(d.secondContent || ''));
    setImages(attachmentsToPicked(d.images));
    setEditorImages(attachmentsToPicked(d.editorImages));
    setSecondEditorImages(attachmentsToPicked(d.secondEditorImages));
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const [hero, left, right] = await Promise.all([
        resolvePickedAttachments(images),
        resolvePickedAttachments(editorImages),
        resolvePickedAttachments(secondEditorImages),
      ]);
      await persistExercise({
        lessonId,
        exercise,
        type: 'text-2-col',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          content,
          secondContent,
          images: hero,
          editorImages: left,
          secondEditorImages: right,
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
      title={exercise ? t('common.edit') : 'Text 2 columns'}
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
      <Text style={editorStyles.sectionLabel}>{t('editor.contentLeft')}</Text>
      <RichHtmlEditor
        key={`left-${editorKey}`}
        html={content}
        onChangeHtml={setContent}
      />
      <Text style={editorStyles.sectionLabel}>{t('editor.contentRight')}</Text>
      <RichHtmlEditor
        key={`right-${editorKey}`}
        html={secondContent}
        onChangeHtml={setSecondContent}
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
          max={6}
        />
      </View>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={`${t('editor.editorImages')} (2)`}
          images={secondEditorImages}
          onChange={setSecondEditorImages}
          multiple
          max={6}
        />
      </View>
    </EditorShell>
  );
}
