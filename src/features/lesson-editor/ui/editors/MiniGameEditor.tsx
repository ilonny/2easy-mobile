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
  MINI_GAME_EX_TYPE,
  MINI_GAME_META,
  isMiniGameItemValid,
  minItemsForGame,
  resolveActiveGame,
  validItems,
  type MiniGameItem,
  type MiniGameKind,
} from './miniGameTypes';

function makeItem(term = '', definition = ''): MiniGameItem {
  return {id: newId(), term, definition};
}

type Props = EditorCommonProps & {
  visible: boolean;
  templateType?: string;
};

export function MiniGameEditor({
  visible,
  lessonId,
  exercise,
  sortIndex,
  currentSortIndexToShift,
  onClose,
  onSaved,
  onBackToTemplates,
  templateType,
}: Props) {
  const {t} = useI18n();
  const [title, setTitle] = useState("Let's play!");
  const [titleColor, setTitleColor] = useState(TITLE_COLOR);
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [activeGame, setActiveGame] = useState<MiniGameKind>('flash-cards');
  const [items, setItems] = useState<MiniGameItem[]>([makeItem()]);
  const [shuffle, setShuffle] = useState(true);
  const [showDefinitionOnWheel, setShowDefinitionOnWheel] = useState(false);
  const [flashCardsLayout, setFlashCardsLayout] = useState<'one' | 'all'>(
    'one',
  );
  const [images, setImages] = useState<PickedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible) {
      return;
    }
    const d = exercise?.data || {};
    setTitle(String(d.title || "Let's play!"));
    setTitleColor(readTitleColor(d.titleColor));
    setSubtitle(String(d.subtitle ?? ''));
    setDescription(String(d.description || ''));
    setImages(attachmentsToPicked(d.images));
    setActiveGame(resolveActiveGame(templateType || exercise?.type, d as any));
    const raw = (d.items as MiniGameItem[]) || [];
    const next = raw.map(i => ({
      id: i?.id || newId(),
      term: String(i?.term || ''),
      definition: String(i?.definition || ''),
    }));
    setItems(next.length ? next : [makeItem()]);
    const opts = (d.options as any) || {};
    setShuffle(opts.shuffle !== false);
    setShowDefinitionOnWheel(!!opts.showDefinitionOnWheel);
    setFlashCardsLayout(opts.flashCardsLayout === 'all' ? 'all' : 'one');
    setTouched({});
  }, [visible, exercise, templateType]);

  const updateItem = (itemId: string, patch: Partial<MiniGameItem>) => {
    setItems(prev =>
      prev.map(i => (i.id === itemId ? {...i, ...patch} : i)),
    );
  };

  const onSave = async () => {
    const keepEmpty = activeGame === 'flash-cards';
    const isWheel = activeGame === 'spin-wheel';
    const isWordOnly = isWheel || activeGame === 'wordsearch';
    const isHangman = activeGame === 'hangman';
    const needsWord = isWordOnly || isHangman;
    const isItemOk = (i: MiniGameItem) =>
      needsWord
        ? !!String(i.term || '').trim()
        : isMiniGameItemValid(i);
    const usable = keepEmpty ? items : items.filter(isItemOk);
    const min = minItemsForGame(activeGame);
    if (usable.length < min) {
      if (!keepEmpty) {
        const mark: Record<string, boolean> = {};
        items.forEach(i => {
          if (!isItemOk(i)) {
            mark[i.id] = true;
          }
        });
        setTouched(prev => ({...prev, ...mark}));
      }
      Alert.alert(
        '',
        t('editor.miniGameNeedItems').replace('{{n}}', String(min)),
      );
      return;
    }
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      await persistExercise({
        lessonId,
        exercise,
        type: MINI_GAME_EX_TYPE,
        sortIndex,
        currentSortIndexToShift,
        data: {
          title,
          titleColor,
          subtitle,
          description,
          images: hero,
          activeGame,
          items: needsWord
            ? usable.map(i => ({
                ...i,
                term: String(i.term || '').trim(),
                definition:
                  String(i.definition || '').trim() || undefined,
              }))
            : validItems(items, {keepEmpty}),
          options: {
            shuffle,
            showDefinitionOnWheel: isWheel ? false : showDefinitionOnWheel,
            flashCardsLayout,
          },
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
      activeGame,
      items: validItems(items, {keepEmpty: activeGame === 'flash-cards'}),
      options: {shuffle, showDefinitionOnWheel, flashCardsLayout},
    }),
    [
      title,
      titleColor,
      subtitle,
      description,
      images,
      activeGame,
      items,
      shuffle,
      showDefinitionOnWheel,
      flashCardsLayout,
    ],
  );

  const titleLabel = exercise
    ? t('common.edit')
    : t('templates.miniGames');

  return (
    <EditorShell
      visible={visible}
      title={titleLabel}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType={MINI_GAME_EX_TYPE}
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

      <Text style={styles.howTitle}>{t('editor.miniGameHowTitle')}</Text>
      <Text style={styles.howHint}>{t('editor.miniGameHowHint')}</Text>
      <View style={styles.howto}>
        <Text style={styles.howtoText}>{t('editor.miniGameHowSteps')}</Text>
      </View>

      <View style={styles.modeRow}>
        {MINI_GAME_META.map(m => {
          const active = activeGame === m.id;
          return (
            <Pressable
              key={m.id}
              style={[styles.modeCard, active && styles.modeCardActive]}
              onPress={() => setActiveGame(m.id)}>
              <Text style={styles.modeTitle}>
                {t(m.titleKey) === m.titleKey ? m.titleDefault : t(m.titleKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.optionRow}
        onPress={() => setShuffle(v => !v)}>
        <Text style={styles.optionCheck}>{shuffle ? '☑' : '☐'}</Text>
        <Text style={styles.optionText}>{t('editor.miniGameShuffle')}</Text>
      </Pressable>
      {activeGame === 'flash-cards' ? (
        <View style={styles.flashLayoutBlock}>
          <Text style={styles.optionText}>{t('editor.miniGameFlashLayout')}</Text>
          <View style={styles.flashLayoutRow}>
            <Pressable
              style={[
                styles.flashLayoutChip,
                flashCardsLayout === 'one' && styles.flashLayoutChipOn,
              ]}
              onPress={() => setFlashCardsLayout('one')}>
              <Text
                style={[
                  styles.flashLayoutChipText,
                  flashCardsLayout === 'one' && styles.flashLayoutChipTextOn,
                ]}>
                {t('editor.miniGameFlashOne')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.flashLayoutChip,
                flashCardsLayout === 'all' && styles.flashLayoutChipOn,
              ]}
              onPress={() => setFlashCardsLayout('all')}>
              <Text
                style={[
                  styles.flashLayoutChipText,
                  flashCardsLayout === 'all' && styles.flashLayoutChipTextOn,
                ]}>
                {t('editor.miniGameFlashAll')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {items.map((item, index) => {
        const isWordOnly =
          activeGame === 'spin-wheel' || activeGame === 'wordsearch';
        const isHangman = activeGame === 'hangman';
        const isMatching = activeGame === 'matching-pairs';
        const needsWord = isWordOnly || isHangman;
        const showError =
          activeGame !== 'flash-cards' &&
          touched[item.id] &&
          (needsWord
            ? !String(item.term || '').trim()
            : !isMiniGameItemValid(item));
        const termLabel = isWordOnly
          ? t('editor.word')
          : isHangman
            ? t('editor.miniGameSecretWord')
            : isMatching
              ? undefined
              : t('editor.miniGameFrontSide');
        const defLabel = isHangman
          ? t('editor.miniGameHint')
          : isMatching
            ? undefined
            : t('editor.miniGameBackSide');
        const defPlaceholder = isHangman
          ? t('editor.miniGameHintPlaceholder')
          : t('editor.miniGameDefPlaceholder');
        return (
          <View key={item.id} style={editorStyles.itemCard}>
            <View style={styles.itemHead}>
              <Text style={styles.itemLabel}>
                {(needsWord
                  ? t('editor.miniGameWordN')
                  : t('editor.miniGameItemN')
                ).replace('{{n}}', String(index + 1))}
              </Text>
              {items.length > 1 ? (
                <Pressable
                  onPress={() =>
                    setItems(prev => prev.filter(i => i.id !== item.id))
                  }>
                  <Text style={editorStyles.removeText}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <TextField
              label={termLabel}
              value={item.term}
              placeholder={t('editor.miniGameTermPlaceholder')}
              onChangeText={text => {
                setTouched(prev => ({...prev, [item.id]: true}));
                updateItem(item.id, {term: text});
              }}
              error={
                showError
                  ? needsWord
                    ? t('editor.miniGameNeedWord')
                    : t('editor.miniGameNeedTermShort')
                  : undefined
              }
            />
            {!isWordOnly ? (
              <TextField
                label={defLabel}
                value={item.definition || ''}
                placeholder={defPlaceholder}
                onChangeText={text =>
                  updateItem(item.id, {definition: text})
                }
              />
            ) : null}
          </View>
        );
      })}

      <Pressable
        style={editorStyles.addBtn}
        onPress={() => setItems(prev => prev.concat(makeItem()))}>
        <Text style={editorStyles.addBtnText}>
          {activeGame === 'spin-wheel' ||
          activeGame === 'wordsearch' ||
          activeGame === 'hangman'
            ? t('editor.miniGameAddWord')
            : t('editor.miniGameAddItem')}
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modeCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    backgroundColor: colors.white,
  },
  modeCardActive: {
    borderColor: 'rgba(63, 40, 198, 0.35)',
    backgroundColor: colors.primarySoft,
  },
  modeTitle: {
    fontWeight: '800',
    fontSize: 13,
    color: colors.text,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  optionCheck: {
    fontSize: 18,
    color: colors.primary,
  },
  optionText: {
    fontSize: 13,
    color: colors.text,
  },
  flashLayoutBlock: {
    marginBottom: 12,
    gap: 8,
  },
  flashLayoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  flashLayoutChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.25)',
    backgroundColor: colors.white,
  },
  flashLayoutChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  flashLayoutChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  flashLayoutChipTextOn: {
    color: colors.primary,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemLabel: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
});
