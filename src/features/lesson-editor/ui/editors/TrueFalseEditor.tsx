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
  isTrueFalseSentenceValid,
  type TrueFalseSentence,
} from './trueFalseTypes';

function makeSentence(
  text = '',
  answer: boolean = true,
): TrueFalseSentence {
  return {
    id: newId(),
    text,
    answer,
  };
}

export function TrueFalseEditor({
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
  const [subtitle, setSubtitle] = useState('True or False?');
  const [description, setDescription] = useState('');
  const [sentences, setSentences] = useState<TrueFalseSentence[]>([
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
    setSubtitle(String(d.subtitle || 'True or False?'));
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    const raw = (d.sentences as TrueFalseSentence[]) || [];
    const next = raw.map(s => ({
      id: s?.id || newId(),
      text: String(s?.text || ''),
      answer: typeof s?.answer === 'boolean' ? s.answer : true,
    }));
    setSentences(next.length ? next : [makeSentence()]);
    setTouched({});
  }, [visible, exercise]);

  const updateSentence = (
    sentenceId: string,
    patch: Partial<TrueFalseSentence>,
  ) => {
    setSentences(prev =>
      prev.map(s => (s.id === sentenceId ? {...s, ...patch} : s)),
    );
  };

  const onSave = async () => {
    const invalid = sentences.filter(s => !isTrueFalseSentenceValid(s));
    if (invalid.length) {
      const mark: Record<string, boolean> = {};
      invalid.forEach(s => {
        mark[s.id] = true;
      });
      setTouched(tPrev => ({...tPrev, ...mark}));
      Alert.alert('', t('editor.trueFalseNeedText'));
      return;
    }
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: 'TRUE_FALSE',
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
      sentences: sentences.filter(s => isTrueFalseSentenceValid(s)),
    }),
    [title, titleColor, subtitle, description, images, sentences],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.trueFalse')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType="TRUE_FALSE"
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

      <Text style={styles.howTitle}>{t('editor.trueFalseHowTitle')}</Text>
      <Text style={styles.howHint}>{t('editor.trueFalseHowHint')}</Text>
      <View style={styles.howto}>
        <Text style={styles.howtoText}>{t('editor.trueFalseHowSteps')}</Text>
      </View>

      {sentences.map((sentence, index) => {
        const showError =
          touched[sentence.id] && !String(sentence.text || '').trim();
        return (
          <View key={sentence.id} style={editorStyles.itemCard}>
            <View style={styles.sentenceHead}>
              <Text style={styles.sentenceLabel}>
                {t('editor.trueFalseSentenceN').replace(
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
              value={sentence.text}
              placeholder={t('editor.trueFalsePlaceholder')}
              onChangeText={text => {
                setTouched(prev => ({...prev, [sentence.id]: true}));
                updateSentence(sentence.id, {text});
              }}
              error={
                showError ? t('editor.trueFalseNeedTextShort') : undefined
              }
            />
            <Text style={styles.answerLabel}>
              {t('editor.trueFalseCorrectAnswer')}
            </Text>
            <View style={styles.answerRow}>
              <Pressable
                style={[
                  styles.answerBtn,
                  sentence.answer === true && styles.answerBtnActive,
                ]}
                onPress={() => updateSentence(sentence.id, {answer: true})}>
                <Text
                  style={[
                    styles.answerBtnText,
                    sentence.answer === true && styles.answerBtnTextActive,
                  ]}>
                  True
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.answerBtn,
                  sentence.answer === false && styles.answerBtnActive,
                ]}
                onPress={() => updateSentence(sentence.id, {answer: false})}>
                <Text
                  style={[
                    styles.answerBtnText,
                    sentence.answer === false && styles.answerBtnTextActive,
                  ]}>
                  False
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable
        style={editorStyles.addBtn}
        onPress={() => setSentences(prev => prev.concat(makeSentence()))}>
        <Text style={editorStyles.addBtnText}>
          {t('editor.trueFalseAddSentence')}
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
  answerLabel: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  answerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  answerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  answerBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  answerBtnText: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: 14,
  },
  answerBtnTextActive: {
    color: colors.white,
  },
});
