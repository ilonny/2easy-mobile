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

type Option = {id: string; text: string; isCorrect: boolean};
type Question = {
  id: string;
  text: string;
  options: Option[];
  images: PickedImage[];
};

function emptyQuestion(): Question {
  return {
    id: newId(),
    text: '',
    images: [],
    options: [
      {id: newId(), text: '', isCorrect: true},
      {id: newId(), text: '', isCorrect: false},
    ],
  };
}

export function TestEditor({
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
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    const raw = (d.questions as Array<Record<string, unknown>>) || [];
    setQuestions(
      raw.length
        ? raw.map(q => ({
            id: String(q.id || newId()),
            text: String(q.text || q.value || ''),
            images: attachmentsToPicked(q.images),
            options: (
              (q.options as Array<Record<string, unknown>>) || []
            ).map(o => ({
              id: String(o.id || newId()),
              text: String(o.text || o.value || ''),
              isCorrect: Boolean(o.isCorrect),
            })),
          }))
        : [emptyQuestion()],
    );
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      const questionsPayload = [];
      for (const q of questions) {
        const qImages = await resolvePickedAttachments(q.images);
        questionsPayload.push({
          id: q.id,
          value: q.text,
          images: qImages,
          options: q.options.map(o => ({
            id: o.id,
            value: o.text,
            isCorrect: o.isCorrect,
          })),
        });
      }
      await persistExercise({
        lessonId,
        exercise,
        type: 'test',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          images: hero,
          questions: questionsPayload,
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
      title={exercise ? t('common.edit') : 'Test'}
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
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.coverImage')}
          images={images}
          onChange={setImages}
          multiple
          max={4}
        />
      </View>
      {questions.map((q, qIndex) => (
        <View key={q.id} style={editorStyles.itemCard}>
          <TextField
            label={`Question ${qIndex + 1}`}
            value={q.text}
            onChangeText={text =>
              setQuestions(prev =>
                prev.map(item => (item.id === q.id ? {...item, text} : item)),
              )
            }
          />
          <ImagePickerField
            label={t('editor.imagesTitle')}
            images={q.images}
            onChange={next =>
              setQuestions(prev =>
                prev.map(item =>
                  item.id === q.id ? {...item, images: next} : item,
                ),
              )
            }
            multiple
            max={4}
          />
          {q.options.map((opt, oIndex) => (
            <View key={opt.id}>
              <TextField
                label={`Option ${oIndex + 1}`}
                value={opt.text}
                onChangeText={text =>
                  setQuestions(prev =>
                    prev.map(item =>
                      item.id === q.id
                        ? {
                            ...item,
                            options: item.options.map(o =>
                              o.id === opt.id ? {...o, text} : o,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
              <Pressable
                style={[
                  editorStyles.chip,
                  opt.isCorrect && editorStyles.chipActive,
                  {alignSelf: 'flex-start', marginBottom: 8},
                ]}
                onPress={() =>
                  setQuestions(prev =>
                    prev.map(item =>
                      item.id === q.id
                        ? {
                            ...item,
                            options: item.options.map(o =>
                              o.id === opt.id
                                ? {...o, isCorrect: !o.isCorrect}
                                : o,
                            ),
                          }
                        : item,
                    ),
                  )
                }>
                <Text
                  style={[
                    editorStyles.chipText,
                    opt.isCorrect && editorStyles.chipTextActive,
                  ]}>
                  {opt.isCorrect ? t('editor.correct') : t('editor.markCorrect')}
                </Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={editorStyles.addBtn}
            onPress={() =>
              setQuestions(prev =>
                prev.map(item =>
                  item.id === q.id
                    ? {
                        ...item,
                        options: item.options.concat({
                          id: newId(),
                          text: '',
                          isCorrect: false,
                        }),
                      }
                    : item,
                ),
              )
            }>
            <Text style={editorStyles.addBtnText}>+ {t('editor.addOption')}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setQuestions(prev => prev.filter(item => item.id !== q.id))
            }>
            <Text style={editorStyles.removeText}>
              {t('common.delete')} question
            </Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() => setQuestions(prev => prev.concat(emptyQuestion()))}>
        <Text style={editorStyles.addBtnText}>+ Add question</Text>
      </Pressable>
    </EditorShell>
  );
}
