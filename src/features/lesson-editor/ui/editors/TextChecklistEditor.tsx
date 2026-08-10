import {useEffect, useState} from 'react';
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
}: EditorCommonProps & {visible: boolean}) {
  const {t} = useI18n();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [stickers, setStickers] = useState<Item[]>([{id: newId(), text: ''}]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [editorImages, setEditorImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setStickers(normalizeItems(d.stickers));
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
        type: 'text-checklist',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          stickers: stickers.map(s => s.text).filter(Boolean),
          images: hero,
          editorImages: inline,
          stickerBgColor: '#FFFFFF',
          stickerTextColor: '#000000',
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
      title={exercise ? t('common.edit') : 'Checklist'}
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
      <Text style={editorStyles.sectionLabel}>Items</Text>
      {stickers.map((item, index) => (
        <View key={item.id} style={editorStyles.itemCard}>
          <TextField
            label={`Item ${index + 1}`}
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
        <Text style={editorStyles.addBtnText}>+ Add item</Text>
      </Pressable>
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple
          max={6}
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
