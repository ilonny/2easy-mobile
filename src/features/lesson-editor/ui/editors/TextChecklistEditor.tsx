import {useEffect, useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {ColorField, TextField, TitleColorField} from '../../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  newId,
  persistExercise,
  readTitleColor,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

type Item = {id: string; text: string};

function normalizeItems(raw: unknown): Item[] {
  if (!Array.isArray(raw) || !raw.length) {
    return [{id: newId(), text: ''}];
  }
  return raw.map(item => {
    if (typeof item === 'string') {
      return {id: newId(), text: item};
    }
    const obj = item as {id?: string; text?: string};
    return {id: obj.id || newId(), text: String(obj.text || '')};
  });
}

export function TextChecklistEditor({
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
  const [stickers, setStickers] = useState<Item[]>([{id: newId(), text: ''}]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [editorImages, setEditorImages] = useState<PickedImage[]>([]);
  const [stickerBgColor, setStickerBgColor] = useState('#FFFFFF');
  const [stickerTextColor, setStickerTextColor] = useState('#000000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setStickers(normalizeItems(d.stickers));
    setImages(attachmentsToPicked(d.images));
    setEditorImages(attachmentsToPicked(d.editorImages));
    setStickerBgColor(readTitleColor(d.stickerBgColor, '#FFFFFF'));
    setStickerTextColor(readTitleColor(d.stickerTextColor, '#000000'));
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setTitleColor(readTitleColor(data.titleColor));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    setStickers(normalizeItems(data.stickers));
    if (data.images) {
      setImages(attachmentsToPicked(data.images as never));
    }
    if (data.editorImages) {
      setEditorImages(attachmentsToPicked(data.editorImages as never));
    }
    setStickerBgColor(readTitleColor(data.stickerBgColor, '#FFFFFF'));
    setStickerTextColor(readTitleColor(data.stickerTextColor, '#000000'));
  };

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
        type: 'text-checklist',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          stickers: stickers.map(s => s.text).filter(Boolean),
          images: hero,
          editorImages: inline,
          stickerBgColor,
          stickerTextColor,
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
      stickers: stickers.map(s => s.text).filter(Boolean),
      images: pickedToPreviewMedia(images),
      editorImages: pickedToPreviewMedia(editorImages),
      stickerBgColor,
      stickerTextColor,
    }),
    [title, titleColor, subtitle, description, stickers, images, editorImages, stickerBgColor, stickerTextColor],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.textChecklist')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="text-checklist"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'text-checklist',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          stickers: stickers.map(s => s.text).filter(Boolean),
          titleColor,
          stickerBgColor,
          stickerTextColor,
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
      <ColorField
        label={t('editor.stickerBgColor')}
        value={stickerBgColor}
        onChange={setStickerBgColor}
      />
      <ColorField
        label={t('editor.stickerTextColor')}
        value={stickerTextColor}
        onChange={setStickerTextColor}
      />
      <Text style={editorStyles.sectionLabel}>Items</Text>
      {stickers.map((item, index) => (
        <View key={item.id} style={editorStyles.itemCard}>
          <TextField
            label={t('editor.checklistItemN').replace(
              '{{n}}',
              String(index + 1),
            )}
            value={item.text}
            onChangeText={text =>
              setStickers(prev =>
                prev.map(s => (s.id === item.id ? {...s, text} : s)),
              )
            }
          />
          <Pressable
            onPress={() =>
              setStickers(prev => prev.filter(s => s.id !== item.id))
            }>
            <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() =>
          setStickers(prev => prev.concat({id: newId(), text: ''}))
        }>
        <Text style={editorStyles.addBtnText}>
          {t('editor.addChecklistItem')}
        </Text>
      </Pressable>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
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
    </EditorShell>
  );
}
