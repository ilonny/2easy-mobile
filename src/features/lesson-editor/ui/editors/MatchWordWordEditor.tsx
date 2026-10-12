import {useEffect, useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {TextField, TitleColorField} from '../../../../shared/ui';
import {
  ImagePickerField,
  type PickedImage,
} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  readTitleColor,
  newId,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

type Match = {id: string; value: string; correctValue: string};

export function MatchWordWordEditor({
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
  const [matches, setMatches] = useState<Match[]>([
    {id: newId(), value: '', correctValue: ''},
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    const raw = (d.matches as Match[]) || [];
    setMatches(
      raw.length
        ? raw.map(m => ({
            id: m.id || newId(),
            value: m.value || '',
            correctValue: m.correctValue || '',
          }))
        : [{id: newId(), value: '', correctValue: ''}],
    );
    setImages(attachmentsToPicked(d.images));
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setTitleColor(readTitleColor(data.titleColor));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    const raw = (data.matches as Match[]) || [];
    setMatches(
      raw.length
        ? raw.map(m => ({
            id: m.id || newId(),
            value: m.value || '',
            correctValue: m.correctValue || '',
          }))
        : [{id: newId(), value: '', correctValue: ''}],
    );
    if (data.images) {
      setImages(attachmentsToPicked(data.images as never));
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'match-word-word',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          images: hero,
          matches,
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
      images: pickedToPreviewMedia(images),
      matches,
    }),
    [title, titleColor, subtitle, description, images, matches],
  );

  return (
    <EditorShell
      visible={visible}
      title={
        exercise ? t('common.edit') : t('templates.matchWordWord')
      }
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="match-word-word"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'match-word-word',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          matches,
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
      {matches.map((m, index) => (
        <View key={m.id} style={editorStyles.itemCard}>
          <TextField
            label={t('editor.wordN').replace('{{n}}', String(index + 1))}
            value={m.value}
            onChangeText={value =>
              setMatches(prev =>
                prev.map(item => (item.id === m.id ? {...item, value} : item)),
              )
            }
          />
          <TextField
            label={t('editor.definition')}
            value={m.correctValue}
            onChangeText={correctValue =>
              setMatches(prev =>
                prev.map(item =>
                  item.id === m.id ? {...item, correctValue} : item,
                ),
              )
            }
          />
          <Pressable
            onPress={() =>
              setMatches(prev => prev.filter(item => item.id !== m.id))
            }>
            <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() =>
          setMatches(prev =>
            prev.concat({id: newId(), value: '', correctValue: ''}),
          )
        }>
        <Text style={editorStyles.addBtnText}>+ {t('editor.addPair')}</Text>
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
