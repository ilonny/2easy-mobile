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

type MatchRow = {
  id: string;
  value: string;
  image: PickedImage | null;
};

export function MatchWordImageEditor({
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
  const [viewType, setViewType] = useState<'drag' | 'input'>('drag');
  const [matches, setMatches] = useState<MatchRow[]>([
    {id: newId(), value: '', image: null},
  ]);
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
    setViewType(d.viewType === 'input' ? 'input' : 'drag');
    const imgs =
      (d.images as Array<{
        id?: string | number;
        text?: string;
        path?: string;
        dataURL?: string;
      }>) ||
      (d.attachments as Array<{
        id?: string | number;
        text?: string;
        path?: string;
        dataURL?: string;
      }>) ||
      [];
    setMatches(
      imgs.length
        ? imgs.map(img => ({
            id: String(img.id || newId()),
            value: String(img.text || ''),
            image: {
              id: String(img.id || newId()),
              path: img.path,
              uri: img.dataURL || getImageUrl(img.path),
              remoteId: img.id,
            },
          }))
        : [{id: newId(), value: '', image: null}],
    );
  }, [visible, exercise]);

  const onSave = async () => {
    setSaving(true);
    try {
      const withImages = matches.filter(m => m.image);
      const uploaded = await resolvePickedAttachments(
        withImages.map(m => ({...m.image!, id: m.id})),
      );

      let uIdx = 0;
      const images = withImages
        .map(m => {
          if (m.image?.path) {
            return {
              id: m.image.remoteId || m.id,
              path: m.image.path,
              text: m.value,
            };
          }
          const att = uploaded[uIdx++];
          if (!att?.path) {
            return null;
          }
          return {id: att.id || m.id, path: att.path, text: m.value};
        })
        .filter(Boolean);

      await persistExercise({
        lessonId,
        exercise,
        type: 'match-word-image',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          viewType,
          attachments: images,
          images,
        },
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const previewData = useMemo(() => {
    const imgs = matches
      .filter(m => m.image)
      .map(m => ({
        id: m.id,
        text: m.value,
        path: m.image?.path,
        dataURL: m.image?.uri,
      }));
    return {
      title,
      titleColor,
      subtitle,
      description,
      viewType,
      attachments: imgs,
      images: imgs,
    };
  }, [title, titleColor, subtitle, description, viewType, matches]);

  return (
    <EditorShell
      visible={visible}
      title={
        exercise ? t('common.edit') : t('templates.matchWordImage')
      }
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="match-word-image"
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

      <Text style={editorStyles.sectionLabel}>{t('editor.mode')}</Text>
      <View style={editorStyles.row}>
        {(['drag', 'input'] as const).map(vt => (
          <Pressable
            key={vt}
            style={[
              editorStyles.chip,
              viewType === vt && editorStyles.chipActive,
            ]}
            onPress={() => setViewType(vt)}>
            <Text
              style={[
                editorStyles.chipText,
                viewType === vt && editorStyles.chipTextActive,
              ]}>
              {vt === 'drag' ? t('editor.modeDrag') : t('editor.modeInput')}
            </Text>
          </Pressable>
        ))}
      </View>

      {matches.map((m, index) => (
        <View key={m.id} style={editorStyles.itemCard}>
          <Text style={editorStyles.sectionLabel}>
            {t('editor.pair')} {index + 1}
          </Text>
          <ImagePickerField
            images={m.image ? [m.image] : []}
            onChange={next =>
              setMatches(prev =>
                prev.map(item =>
                  item.id === m.id ? {...item, image: next[0] || null} : item,
                ),
              )
            }
            multiple={false}
            max={1}
          />
          <TextField
            label={t('editor.word')}
            value={m.value}
            onChangeText={value =>
              setMatches(prev =>
                prev.map(item => (item.id === m.id ? {...item, value} : item)),
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
            prev.concat({id: newId(), value: '', image: null}),
          )
        }>
        <Text style={editorStyles.addBtnText}>+ {t('editor.addPair')}</Text>
      </Pressable>
    </EditorShell>
  );
}
