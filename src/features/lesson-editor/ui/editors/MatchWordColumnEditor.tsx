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

type Column = {id: string; title: string; words: string[]};

function emptyColumn(): Column {
  return {id: newId(), title: '', words: ['']};
}

export function MatchWordColumnEditor({
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
  const [columns, setColumns] = useState<Column[]>([
    emptyColumn(),
    emptyColumn(),
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    const raw = (d.columns as Array<Record<string, unknown>>) || [];
    setColumns(
      raw.length
        ? raw.map(c => ({
            id: String(c.id || newId()),
            title: String(c.title || ''),
            words: Array.isArray(c.words)
              ? (c.words as string[]).map(String)
              : [''],
          }))
        : [emptyColumn(), emptyColumn()],
    );
    setImages(attachmentsToPicked(d.images));
  }, [visible, exercise]);

  const applyAiData = (data: Record<string, unknown>) => {
    setTitle(String(data.title || ''));
    setSubtitle(String(data.subtitle || ''));
    setDescription(String(data.description || ''));
    const raw = (data.columns as Array<Record<string, unknown>>) || [];
    setColumns(
      raw.length
        ? raw.map(c => ({
            id: String(c.id || newId()),
            title: String(c.title || ''),
            words: Array.isArray(c.words)
              ? (c.words as string[]).map(String)
              : [''],
          }))
        : [emptyColumn(), emptyColumn()],
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
        type: 'match-word-column',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          images: hero,
          columns: columns.map(c => ({
            id: c.id,
            title: c.title,
            words: c.words.map(w => w.trim()).filter(Boolean),
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
      titleColor: TITLE_COLOR,
      subtitle,
      description,
      images: pickedToPreviewMedia(images),
      columns,
    }),
    [title, subtitle, description, images, columns],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : 'Match columns'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="match-word-column"
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: 'match-word-column',
        lessonId,
        currentData: {
          id: exercise?.id,
          title,
          subtitle,
          description,
          columns,
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
      {columns.map((col, index) => (
        <View key={col.id} style={editorStyles.itemCard}>
          <TextField
            label={`Column ${index + 1} title`}
            value={col.title}
            onChangeText={text =>
              setColumns(prev =>
                prev.map(c => (c.id === col.id ? {...c, title: text} : c)),
              )
            }
          />
          <Text style={editorStyles.sectionLabel}>{t('editor.word')}s</Text>
          {col.words.map((word, wIndex) => (
            <View key={`${col.id}-w-${wIndex}`}>
              <TextField
                label={`${t('editor.word')} ${wIndex + 1}`}
                value={word}
                onChangeText={text =>
                  setColumns(prev =>
                    prev.map(c =>
                      c.id === col.id
                        ? {
                            ...c,
                            words: c.words.map((w, i) =>
                              i === wIndex ? text : w,
                            ),
                          }
                        : c,
                    ),
                  )
                }
              />
              <Pressable
                onPress={() =>
                  setColumns(prev =>
                    prev.map(c =>
                      c.id === col.id
                        ? {
                            ...c,
                            words:
                              c.words.length > 1
                                ? c.words.filter((_, i) => i !== wIndex)
                                : [''],
                          }
                        : c,
                    ),
                  )
                }>
                <Text style={editorStyles.removeText}>
                  {t('common.delete')} {t('editor.word').toLowerCase()}
                </Text>
              </Pressable>
            </View>
          ))}
          <Pressable
            style={editorStyles.addBtn}
            onPress={() =>
              setColumns(prev =>
                prev.map(c =>
                  c.id === col.id ? {...c, words: c.words.concat('')} : c,
                ),
              )
            }>
            <Text style={editorStyles.addBtnText}>+ {t('editor.word')}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setColumns(prev => prev.filter(c => c.id !== col.id))
            }>
            <Text style={editorStyles.removeText}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={editorStyles.addBtn}
        onPress={() => setColumns(prev => prev.concat(emptyColumn()))}>
        <Text style={editorStyles.addBtnText}>+ Add column</Text>
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
