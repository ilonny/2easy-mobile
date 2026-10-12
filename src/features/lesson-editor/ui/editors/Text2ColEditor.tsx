import {useEffect, useMemo, useState} from 'react';
import {Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {TextField, TitleColorField} from '../../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {RichHtmlEditor} from './RichHtmlEditor';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  readTitleColor,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

export function Text2ColEditor({
  visible,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
  onBackToTemplates,
}: EditorCommonProps & {visible: boolean}) {
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [titleColor, setTitleColor] = useState(TITLE_COLOR);
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
  const [aiRev, setAiRev] = useState(0);
  const editorKey = `${exercise?.id || 'new'}-${aiRev}`;

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setContent(String(d.content || ''));
    setSecondContent(String(d.secondContent || ''));
    setImages(attachmentsToPicked(d.images));
    setEditorImages(attachmentsToPicked(d.editorImages));
    setSecondEditorImages(attachmentsToPicked(d.secondEditorImages));
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setTitleColor(readTitleColor(data.titleColor));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    setContent(String(data.content || ''));
    setSecondContent(String(data.secondContent || ''));
    if (data.images) {
      setImages(attachmentsToPicked(data.images as never));
    }
    if (data.editorImages) {
      setEditorImages(attachmentsToPicked(data.editorImages as never));
    }
    if (data.secondEditorImages) {
      setSecondEditorImages(attachmentsToPicked(data.secondEditorImages as never));
    }
    setAiRev(v => v + 1);
  };

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
          titleColor,
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

  const previewData = useMemo(
    () => ({
      title,
      titleColor,
      subtitle,
      description,
      content,
      secondContent,
      images: pickedToPreviewMedia(images),
      editorImages: pickedToPreviewMedia(editorImages),
      secondEditorImages: pickedToPreviewMedia(secondEditorImages),
    }),
    [title, titleColor, subtitle, description, content, secondContent, images, editorImages, secondEditorImages],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.text2Col')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="text-2-col"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'text-2-col',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          content,
          secondContent,
          titleColor,
        },
        onApply: applyAiData,
      }}>
      <TitleColorField
        label={t('editor.fieldTitle')}
        value={title}
        onChangeText={setTitle}
        color={titleColor}
        onColorChange={setTitleColor}
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
          multiple={false}
          max={1}
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
          label={t('editor.editorImagesSecond')}
          images={secondEditorImages}
          onChange={setSecondEditorImages}
          multiple
          max={6}
        />
      </View>
    </EditorShell>
  );
}
