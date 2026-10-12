import {useEffect, useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {TextField, TitleColorField} from '../../../../shared/ui';
import {getImageUrl} from '../../../lesson-player/lib/getImageUrl';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  newId,
  persistExercise,
  readTitleColor,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

type ViewType = 'carousel' | '2-col' | '3-col';

export function ImageExEditor({
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
  const [viewType, setViewType] = useState<ViewType>('carousel');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setViewType(
      (d.viewType as ViewType) === '2-col' || (d.viewType as ViewType) === '3-col'
        ? (d.viewType as ViewType)
        : 'carousel',
    );
    const existing =
      (d.attachments as Array<{id?: number | string; path?: string}>) ||
      (d.images as Array<{
        id?: number | string;
        path?: string;
        dataURL?: string;
      }>) ||
      [];
    setImages(
      existing.map(img => ({
        id: String(img.id || newId()),
        path: img.path,
        uri: (img as {dataURL?: string}).dataURL || getImageUrl(img.path),
        remoteId: img.id,
      })),
    );
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const attachments = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'image',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          viewType,
          attachments,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const viewTypes: Array<{key: ViewType; label: string}> = [
    {key: 'carousel', label: t('editor.layoutCarousel')},
    {key: '2-col', label: t('editor.layout2Col')},
    {key: '3-col', label: t('editor.layout3Col')},
  ];

  const previewData = useMemo(
    () => ({
      title,
      titleColor,
      subtitle,
      description,
      viewType,
      attachments: pickedToPreviewMedia(images),
      images: pickedToPreviewMedia(images),
    }),
    [title, titleColor, subtitle, description, viewType, images],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('editor.imagesTitle')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="image"
      previewLessonId={lessonId}
      previewData={previewData}>
      <View style={editorStyles.card}>
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
      </View>

      <Text style={editorStyles.sectionLabel}>{t('editor.layout')}</Text>
      <View style={editorStyles.row}>
        {viewTypes.map(vt => (
          <Pressable
            key={vt.key}
            style={[
              editorStyles.chip,
              viewType === vt.key && editorStyles.chipActive,
            ]}
            onPress={() => setViewType(vt.key)}>
            <Text
              style={[
                editorStyles.chipText,
                viewType === vt.key && editorStyles.chipTextActive,
              ]}>
              {vt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.imagesTitle')}
          images={images}
          onChange={setImages}
          multiple
        />
      </View>
    </EditorShell>
  );
}
