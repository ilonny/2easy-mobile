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

type Question = {id: string; text: string};

export function FreeInputFormEditor({
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
  const [questions, setQuestions] = useState<Question[]>([
    {id: newId(), text: ''},
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
    setImages(attachmentsToPicked(d.images));
    const raw = (d.questions as Array<Record<string, unknown>>) || [];
    setQuestions(
      raw.length
        ? raw.map(q => ({
            id: String(q.id || newId()),
            text: String(q.text || q.value || ''),
          }))
        : [{id: newId(), text: ''}],
    );
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setTitleColor(readTitleColor(data.titleColor));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    if (data.images) {
      setImages(attachmentsToPicked(data.images as never));
    }
    const raw = (data.questions as Array<Record<string, unknown>>) || [];
    setQuestions(
      raw.length
        ? raw.map(q => ({
            id: String(q.id || newId()),
            text: String(q.text || q.value || ''),
          }))
        : [{id: newId(), text: ''}],
    );
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'free-input-form',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          images: hero,
          questions: questions.map(q => ({
            id: q.id,
            value: q.text,
            images: [],
          })),
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
      questions: questions.map(q => ({
        id: q.id,
        value: q.text,
        images: [],
      })),
    }),
    [title, titleColor, subtitle, description, images, questions],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.freeInput')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="free-input-form"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'free-input-form',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          titleColor,
          questions: questions.map(q => ({
            id: q.id,
            value: q.text,
            images: [],
          })),
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
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple={false}
          max={1}
        />
      </View>
      {questions.map((q, index) => (
        <View key={q.id} style={editorStyles.itemCard}>
          <TextField
            label={t('editor.promptN').replace('{{n}}', String(index + 1))}
            value={q.text}
            onChangeText={text =>
              setQuestions(prev =>
                prev.map(item => (item.id === q.id ? {...item, text} : item)),
              )
            }
          />
          <Pressable
            onPress={() =>
              setQuestions(prev => prev.filter(item => item.id !== q.id))
            }>
            <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() =>
          setQuestions(prev => prev.concat({id: newId(), text: ''}))
        }>
        <Text style={editorStyles.addBtnText}>{t('editor.addPrompt')}</Text>
      </Pressable>
    </EditorShell>
  );
}
