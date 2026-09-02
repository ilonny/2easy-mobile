import {useEffect, useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

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
  newId,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

type Sticker = {id: string; text: string};

const BG_PRESETS = ['#FFF7D6', '#E8F5E9', '#E3F2FD', '#FCE4EC', '#FFFFFF'];
const TEXT_PRESETS = ['#000000', '#3F28C6', '#B45309', '#065F46', '#FFFFFF'];

function normalizeStickers(raw: unknown): Sticker[] {
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

export function TextStickerEditor({
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
  const [stickers, setStickers] = useState<Sticker[]>([
    {id: newId(), text: ''},
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [stickerBgColor, setStickerBgColor] = useState('#FFF7D6');
  const [stickerTextColor, setStickerTextColor] = useState('#000000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setStickers(normalizeStickers(d.stickers));
    setImages(attachmentsToPicked(d.images));
    setStickerBgColor(String(d.stickerBgColor || '#FFF7D6'));
    setStickerTextColor(String(d.stickerTextColor || '#000000'));
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    setStickers(normalizeStickers(data.stickers));
    if (data.images) {
      setImages(attachmentsToPicked(data.images as never));
    }
    setStickerBgColor(String(data.stickerBgColor || '#FFF7D6'));
    setStickerTextColor(String(data.stickerTextColor || '#000000'));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'text-sticker',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          stickers: stickers.map(s => s.text).filter(Boolean),
          images: hero,
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
      titleColor: TITLE_COLOR,
      subtitle,
      description,
      stickers: stickers.map(s => s.text).filter(Boolean),
      images: pickedToPreviewMedia(images),
      stickerBgColor,
      stickerTextColor,
    }),
    [title, subtitle, description, stickers, images, stickerBgColor, stickerTextColor],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : 'Stickers'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="text-sticker"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'text-sticker',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          stickers: stickers.map(s => s.text).filter(Boolean),
          stickerBgColor,
          stickerTextColor,
          titleColor: TITLE_COLOR,
        },
        onApply: applyAiData,
      }}>
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
      <Text style={editorStyles.sectionLabel}>{t('editor.stickerBgColor')}</Text>
      <View style={editorStyles.row}>
        {BG_PRESETS.map(c => (
          <Pressable
            key={c}
            onPress={() => setStickerBgColor(c)}
            style={[
              colorSwatch.base,
              {backgroundColor: c},
              stickerBgColor === c && colorSwatch.active,
            ]}
          />
        ))}
      </View>
      <TextField
        label={t('editor.stickerBgColor')}
        value={stickerBgColor}
        onChangeText={setStickerBgColor}
        autoCapitalize="none"
      />
      <Text style={editorStyles.sectionLabel}>{t('editor.stickerTextColor')}</Text>
      <View style={editorStyles.row}>
        {TEXT_PRESETS.map(c => (
          <Pressable
            key={c}
            onPress={() => setStickerTextColor(c)}
            style={[
              colorSwatch.base,
              {backgroundColor: c},
              stickerTextColor === c && colorSwatch.active,
            ]}
          />
        ))}
      </View>
      <TextField
        label={t('editor.stickerTextColor')}
        value={stickerTextColor}
        onChangeText={setStickerTextColor}
        autoCapitalize="none"
      />
      <Text style={editorStyles.sectionLabel}>Stickers</Text>
      {stickers.map((sticker, index) => (
        <View key={sticker.id} style={editorStyles.itemCard}>
          <TextField
            label={`Sticker ${index + 1}`}
            value={sticker.text}
            onChangeText={text =>
              setStickers(prev =>
                prev.map(s => (s.id === sticker.id ? {...s, text} : s)),
              )
            }
          />
          <Pressable
            onPress={() =>
              setStickers(prev => prev.filter(s => s.id !== sticker.id))
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
        <Text style={editorStyles.addBtnText}>+ Add sticker</Text>
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
    </EditorShell>
  );
}

const colorSwatch = {
  base: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  active: {
    borderWidth: 3,
    borderColor: TITLE_COLOR,
  },
};
