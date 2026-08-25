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
  FillGapsRichEditor,
  type FillGapsGap,
  type SlateParagraph,
} from './FillGapsRichEditor';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  newId,
  persistExercise,
  resolvePickedAttachments,
  type EditorCommonProps,
  pickedToPreviewMedia,
} from './editorShared';

type Mode = 'input' | 'select' | 'drag';

function defaultContent(): SlateParagraph[] {
  return [{type: 'paragraph', children: [{text: ''}]}];
}

function normalizeContent(raw: unknown): SlateParagraph[] {
  if (!Array.isArray(raw) || !raw.length) {
    return defaultContent();
  }
  return raw as SlateParagraph[];
}

function normalizeGaps(raw: unknown): FillGapsGap[] {
  if (!Array.isArray(raw) || !raw.length) {
    return [];
  }
  return (raw as FillGapsGap[]).map(g => ({
    id: g.id || newId(),
    originalText: g.originalText,
    options: (g.options || []).map(o => ({
      id: o.id || newId(),
      value: o.value || '',
      isCorrect: Boolean(o.isCorrect),
    })),
  }));
}

export function FillGapsNewEditor({
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
  const [mode, setMode] = useState<Mode>('input');
  const [content, setContent] = useState<SlateParagraph[]>(defaultContent());
  const [gaps, setGaps] = useState<FillGapsGap[]>([]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const editorKey = String(exercise?.id || 'new');

  useEffect(() => {
    if (!visible) return;
    const d = exercise?.data || {};
    setTitle(String(d.title || ''));
    setSubtitle(String(d.subtitle || ''));
    setDescription(String(d.description || ''));
    const m = d.mode as Mode;
    setMode(m === 'select' || m === 'drag' ? m : 'input');
    setContent(normalizeContent(d.content));
    setGaps(normalizeGaps(d.gaps));
    setImages(attachmentsToPicked(d.images));
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      const cleanedGaps = gaps.map(g => ({
        id: g.id,
        originalText: g.originalText,
        options: (g.options || [])
          .map(o => ({
            id: o.id,
            value: (o.value || '').trim(),
            isCorrect: Boolean(o.isCorrect),
          }))
          .filter(o => o.value),
      }));
      await persistExercise({
        lessonId,
        exercise,
        type: 'FILL_GAPS_NEW',
        sortIndex,
        currentSortIndexToShift,
        data: {
          mode,
          title,
          titleColor: TITLE_COLOR,
          subtitle,
          description,
          content: content.length ? content : defaultContent(),
          gaps: cleanedGaps,
          images: hero,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const modes: Mode[] = ['input', 'select', 'drag'];
  const modeLabel = (m: Mode) => {
    if (m === 'select') return t('editor.fillGapsModeSelect');
    if (m === 'drag') return t('editor.fillGapsModeDrag');
    return t('editor.fillGapsModeInput');
  };
  const hint =
    mode === 'select'
      ? t('editor.fillGapsHintSelect')
      : mode === 'drag'
        ? t('editor.fillGapsHintDrag')
        : t('editor.fillGapsHintInput');

  const previewData = useMemo(
    () => ({
      mode,
      title,
      titleColor: TITLE_COLOR,
      subtitle,
      description,
      content,
      gaps,
      images: pickedToPreviewMedia(images),
    }),
    [mode, title, subtitle, description, content, gaps, images],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : 'Fill gaps'}
      onClose={onClose}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="FILL_GAPS_NEW"
      previewLessonId={lessonId}
      previewData={previewData}>
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
      <Text style={editorStyles.sectionLabel}>{t('editor.mode')}</Text>
      <View style={editorStyles.row}>
        {modes.map(m => (
          <Pressable
            key={m}
            style={[editorStyles.chip, mode === m && editorStyles.chipActive]}
            onPress={() => setMode(m)}>
            <Text
              style={[
                editorStyles.chipText,
                mode === m && editorStyles.chipTextActive,
              ]}>
              {modeLabel(m)}
            </Text>
          </Pressable>
        ))}
      </View>
      <FillGapsRichEditor
        key={`gaps-${editorKey}-${visible}`}
        content={content}
        gaps={gaps}
        onChange={({content: nextContent, gaps: nextGaps}) => {
          setContent(nextContent);
          setGaps(nextGaps);
        }}
        makeGapLabel={t('editor.makeGap')}
        hint={hint}
      />
      <View style={editorStyles.card}>
        <ImagePickerField
          label={t('editor.heroImages')}
          images={images}
          onChange={setImages}
          multiple
          max={6}
        />
      </View>
    </EditorShell>
  );
}
