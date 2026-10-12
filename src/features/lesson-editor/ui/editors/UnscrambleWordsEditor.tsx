import {useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {TextField, TitleColorField} from '../../../../shared/ui';
import {ImagePickerField, type PickedImage} from '../ImagePickerField';
import {EditorShell, editorStyles} from './EditorShell';
import {
  TITLE_COLOR,
  attachmentsToPicked,
  newId,
  persistExercise,
  pickedToPreviewMedia,
  readTitleColor,
  resolvePickedAttachments,
  type EditorCommonProps,
} from './editorShared';
import {
  isUnscrambleSentenceValid,
  parseUnscrambleTokenValues,
  type UnscrambleSentence,
} from './unscrambleWordsTypes';

function makeSentence(raw = ''): UnscrambleSentence {
  const values = parseUnscrambleTokenValues(raw);
  return {
    id: newId(),
    raw,
    tokens: values.map(value => ({id: newId(), value})),
  };
}

export function UnscrambleWordsEditor({
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
  const [title, setTitle] = useState("Let's practice!");
  const [titleColor, setTitleColor] = useState(TITLE_COLOR);
  const [subtitle, setSubtitle] = useState(
    'Put the words in the correct order',
  );
  const [description, setDescription] = useState('');
  const [sentences, setSentences] = useState<UnscrambleSentence[]>([
    makeSentence(),
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible) {
      return;
    }
    const d = exercise?.data || {};
    setTitle(String(d.title || "Let's practice!"));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(
      String(d.subtitle || 'Put the words in the correct order'),
    );
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    const raw = (d.sentences as UnscrambleSentence[]) || [];
    setSentences(raw.length ? raw : [makeSentence()]);
    setTouched({});
  }, [visible, exercise]);

  const updateSentenceRaw = (sentenceId: string, raw: string) => {
    setSentences(prev =>
      prev.map(s => {
        if (s.id !== sentenceId) {
          return s;
        }
        const values = parseUnscrambleTokenValues(raw);
        const prevTokens = s.tokens || [];
        const tokens = values.map((value, i) => ({
          id: prevTokens[i]?.value === value ? prevTokens[i].id : newId(),
          value,
        }));
        return {...s, raw, tokens};
      }),
    );
  };

  const onSave = async () => {
    const invalid = sentences.filter(s => !isUnscrambleSentenceValid(s.raw));
    if (invalid.length) {
      const mark: Record<string, boolean> = {};
      invalid.forEach(s => {
        mark[s.id] = true;
      });
      setTouched(tPrev => ({...tPrev, ...mark}));
      Alert.alert('', t('editor.unscrambleNeedSlash'));
      return;
    }
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'UNSCRAMBLE_WORDS',
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          images: hero,
          sentences,
        },
      });
      onSaved();
    } catch (e) {
      Alert.alert(
        '',
        e instanceof Error ? e.message : t('editor.saveFailed'),
      );
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
      sentences: sentences.filter(s => isUnscrambleSentenceValid(s.raw)),
    }),
    [title, titleColor, subtitle, description, images, sentences],
  );

  return (
    <EditorShell
      visible={visible}
      title={
        exercise
          ? t('common.edit')
          : t('templates.unscrambleWords')
      }
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="UNSCRAMBLE_WORDS"
      previewLessonId={lessonId}
      previewData={previewData}>
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

      <Text style={styles.howTitle}>{t('editor.unscrambleHowTitle')}</Text>
      <Text style={styles.howHint}>{t('editor.unscrambleHowHint')}</Text>
      <View style={styles.howto}>
        <Text style={styles.howtoText}>{t('editor.unscrambleHowSteps')}</Text>
      </View>

      {sentences.map((sentence, index) => {
        const showError =
          touched[sentence.id] && !isUnscrambleSentenceValid(sentence.raw);
        return (
          <View key={sentence.id} style={editorStyles.itemCard}>
            <View style={styles.sentenceHead}>
              <Text style={styles.sentenceLabel}>
                {t('editor.unscrambleSentenceN').replace(
                  '{{n}}',
                  String(index + 1),
                )}
              </Text>
              {sentences.length > 1 && (
                <Pressable
                  onPress={() =>
                    setSentences(prev =>
                      prev.filter(item => item.id !== sentence.id),
                    )
                  }>
                  <Text style={editorStyles.removeText}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              )}
            </View>
            <TextField
              label={t('editor.content')}
              value={sentence.raw}
              placeholder={t('editor.unscramblePlaceholder')}
              onChangeText={text => {
                setTouched(prev => ({...prev, [sentence.id]: true}));
                updateSentenceRaw(sentence.id, text);
              }}
              error={
                showError ? t('editor.unscrambleNeedSlashShort') : undefined
              }
            />
            {!!sentence.tokens?.length && (
              <View style={styles.tokenPreview}>
                {sentence.tokens.map(tok => (
                  <View key={tok.id} style={styles.tokenChip}>
                    <Text style={styles.tokenChipText}>{tok.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <Pressable
        style={editorStyles.addBtn}
        onPress={() =>
          setSentences(prev => prev.concat(makeSentence()))
        }>
        <Text style={editorStyles.addBtnText}>
          {t('editor.unscrambleAddSentence')}
        </Text>
      </Pressable>
    </EditorShell>
  );
}

const styles = StyleSheet.create({
  howTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  howHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  howto: {
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.18)',
    backgroundColor: colors.primarySoft,
    marginBottom: 14,
  },
  howtoText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  sentenceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sentenceLabel: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  tokenPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tokenChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    // Avoid dashed + radius — crashes on some Android versions.
    borderColor: 'rgba(63, 40, 198, 0.8)',
    backgroundColor: colors.primarySoft,
  },
  tokenChipText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
