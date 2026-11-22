import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useI18n} from '../../../../shared/i18n';
import {colors, radii} from '../../../../shared/config/theme';
import {Checkbox, TextField, TitleColorField} from '../../../../shared/ui';
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
  TABLE_TEXT_COLORS,
  TABLES_CAPTION_MAX,
  TABLES_EX_TYPE,
  TABLES_MAX_COLS,
  TABLES_MAX_ROWS,
  TABLES_MAX_TABLES,
  blankTableLike,
  canAddTable,
  cellFromPlainText,
  cellMarks,
  cellPlainText,
  clampInt,
  createTable,
  gridSize,
  normalizeTablesData,
  resizeGrid,
  shrinkWouldDropContent,
  tableHasText,
  type TCellMarks,
  type TLessonTable,
} from './tablesModel';

type CellPos = {tableId: string; row: number; col: number};

function SizeStepper({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (next: number) => boolean;
}) {
  return (
    <View style={styles.sizeField}>
      <Text style={styles.sizeLabel}>{label}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}
          disabled={value <= min}
          onPress={() => onCommit(value - 1)}
          accessibilityLabel={`${label} -`}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.sizeValue}>{value}</Text>
        <Pressable
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}
          disabled={value >= max}
          onPress={() => onCommit(value + 1)}
          accessibilityLabel={`${label} +`}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TablesEditor({
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
  const [title, setTitle] = useState("Let's look!");
  const [titleColor, setTitleColor] = useState(TITLE_COLOR);
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [tables, setTables] = useState<TLessonTable[]>([
    createTable('table-1'),
  ]);
  const [images, setImages] = useState<PickedImage[]>([]);
  const [openId, setOpenId] = useState<string | null>('table-1');
  const [activePos, setActivePos] = useState<CellPos | null>(null);
  const [saving, setSaving] = useState(false);

  const loadFromData = useCallback((raw: unknown) => {
    const next = normalizeTablesData(raw);
    setTitle(String(next.title || "Let's look!"));
    setTitleColor(readTitleColor(next.titleColor));
    setSubtitle(String(next.subtitle || ''));
    setDescription(String(next.description || ''));
    setImages(attachmentsToPicked(next.images));
    setTables(next.tables);
    setOpenId(next.tables[0]?.id ?? null);
    setActivePos(null);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }
    loadFromData(exercise?.data || {});
  }, [visible, exercise, loadFromData]);

  const activeCell = useMemo(() => {
    if (!activePos) {
      return null;
    }
    const table = tables.find(item => item.id === activePos.tableId);
    return table?.rows?.[activePos.row]?.[activePos.col] ?? null;
  }, [activePos, tables]);

  const marks: TCellMarks = useMemo(
    () => cellMarks(activeCell),
    [activeCell],
  );

  const updateTable = useCallback(
    (tableId: string, patch: (table: TLessonTable) => TLessonTable) => {
      setTables(prev =>
        prev.map(table => (table.id === tableId ? patch(table) : table)),
      );
    },
    [],
  );

  const updateCell = useCallback(
    (pos: CellPos, text: string, nextMarks?: Partial<TCellMarks>) => {
      const table = tables.find(item => item.id === pos.tableId);
      const cell = table?.rows?.[pos.row]?.[pos.col];
      const baseMarks = nextMarks
        ? {...cellMarks(cell), ...nextMarks}
        : cellMarks(cell);
      updateTable(pos.tableId, current => ({
        ...current,
        rows: current.rows.map((row, rowIndex) =>
          rowIndex !== pos.row
            ? row
            : row.map((c, colIndex) =>
                colIndex !== pos.col
                  ? c
                  : cellFromPlainText(text, baseMarks),
              ),
        ),
      }));
    },
    [tables, updateTable],
  );

  const applyMarks = useCallback(
    (patch: Partial<TCellMarks>) => {
      if (!activePos) {
        Alert.alert('', t('editor.tablesNeedCell'));
        return;
      }
      const table = tables.find(item => item.id === activePos.tableId);
      const cell = table?.rows?.[activePos.row]?.[activePos.col];
      updateCell(activePos, cellPlainText(cell), patch);
    },
    [activePos, tables, t, updateCell],
  );

  const resizeTable = useCallback(
    (table: TLessonTable, nextRows: number, nextCols: number) => {
      const size = gridSize(table);
      const rows = clampInt(nextRows, 1, TABLES_MAX_ROWS, size.rows);
      const cols = clampInt(nextCols, 1, TABLES_MAX_COLS, size.cols);
      if (rows === size.rows && cols === size.cols) {
        return false;
      }
      const apply = () => {
        setActivePos(null);
        updateTable(table.id, current => ({
          ...current,
          rows: resizeGrid(current.rows, rows, cols),
        }));
      };
      if (shrinkWouldDropContent(table, rows, cols)) {
        Alert.alert('', t('editor.tablesShrinkConfirm'), [
          {text: t('common.cancel'), style: 'cancel'},
          {text: t('common.delete'), style: 'destructive', onPress: apply},
        ]);
        return false;
      }
      apply();
      return true;
    },
    [t, updateTable],
  );

  const addTable = useCallback(() => {
    if (!canAddTable(tables)) {
      Alert.alert(
        '',
        t('editor.tablesLimit').replace('{{count}}', String(TABLES_MAX_TABLES)),
      );
      return;
    }
    const id = newId();
    const last = tables[tables.length - 1];
    const next = blankTableLike(last, id);
    setTables(prev => prev.concat(next));
    setOpenId(id);
    setActivePos(null);
  }, [t, tables]);

  const removeTable = useCallback(
    (table: TLessonTable) => {
      if (tables.length <= 1) {
        return;
      }
      const doRemove = () => {
        setTables(prev => {
          const next = prev.filter(item => item.id !== table.id);
          setOpenId(current =>
            current === table.id ? next[0]?.id ?? null : current,
          );
          return next;
        });
        setActivePos(null);
      };
      if (tableHasText(table)) {
        Alert.alert('', t('editor.tablesRemoveConfirm'), [
          {text: t('common.cancel'), style: 'cancel'},
          {text: t('common.delete'), style: 'destructive', onPress: doRemove},
        ]);
        return;
      }
      doRemove();
    },
    [t, tables.length],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      const hero = await resolvePickedAttachments(images);
      const normalized = normalizeTablesData({
        title,
        titleColor,
        subtitle,
        description,
        images: hero,
        tables,
      });
      await persistExercise({
        lessonId,
        exercise,
        type: TABLES_EX_TYPE,
        sortIndex,
        currentSortIndexToShift,
        data: {
          title: normalized.title,
          titleColor: normalized.titleColor,
          subtitle: normalized.subtitle,
          description: normalized.description,
          images: hero,
          tables: normalized.tables,
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
    () =>
      normalizeTablesData({
        title,
        titleColor,
        subtitle,
        description,
        images: pickedToPreviewMedia(images),
        tables,
      }) as unknown as Record<string, unknown>,
    [title, titleColor, subtitle, description, images, tables],
  );

  const aiCurrentData = useMemo(
    () =>
      ({
        id: exercise?.id,
        title,
        titleColor,
        subtitle,
        description,
        tables,
      }) as Record<string, unknown>,
    [exercise?.id, title, titleColor, subtitle, description, tables],
  );

  const applyAiData = useCallback(
    (generated: Record<string, unknown>) => {
      const next = normalizeTablesData({
        ...generated,
        id: exercise?.id,
        sortIndex: exercise?.sortIndex,
      });
      setTitle(String(next.title || "Let's look!"));
      setTitleColor(readTitleColor(next.titleColor));
      setSubtitle(String(next.subtitle || ''));
      setDescription(String(next.description || ''));
      if (Array.isArray(generated.images)) {
        setImages(attachmentsToPicked(generated.images));
      }
      setTables(next.tables);
      setOpenId(next.tables[0]?.id ?? null);
      setActivePos(null);
    },
    [exercise?.id, exercise?.sortIndex],
  );

  return (
    <EditorShell
      visible={visible}
      title={exercise ? t('common.edit') : t('templates.tables')}
      onClose={onClose}
      onBackToTemplates={onBackToTemplates}
      onSave={() => {
        void onSave();
      }}
      saving={saving}
      previewType={TABLES_EX_TYPE}
      previewLessonId={lessonId}
      previewData={previewData}
      ai={{
        type: TABLES_EX_TYPE,
        lessonId,
        currentData: aiCurrentData,
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

      <Text style={styles.howTitle}>{t('editor.tablesHowTitle')}</Text>
      <Text style={styles.howHint}>{t('editor.tablesHowHint')}</Text>
      <View style={styles.howto}>
        <Text style={styles.howtoText}>{t('editor.tablesHowSteps')}</Text>
      </View>

      <Text style={styles.countText}>
        {t('editor.tablesCount')
          .replace('{{count}}', String(tables.length))
          .replace('{{max}}', String(TABLES_MAX_TABLES))}
      </Text>

      {tables.map((table, index) => {
        const size = gridSize(table);
        const open = openId === table.id;
        return (
          <View key={table.id} style={editorStyles.itemCard}>
            <View style={styles.cardHead}>
              <Pressable
                style={styles.cardHeadMain}
                onPress={() => {
                  setOpenId(open ? null : table.id);
                  setActivePos(null);
                }}>
                <Text style={styles.cardTitle}>
                  {t('editor.tablesTableN').replace('{{n}}', String(index + 1))}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {size.rows}×{size.cols}
                  {table.caption?.trim() ? ` · ${table.caption.trim()}` : ''}
                </Text>
              </Pressable>
              {tables.length > 1 && (
                <Pressable onPress={() => removeTable(table)}>
                  <Text style={editorStyles.removeText}>
                    {t('common.delete')}
                  </Text>
                </Pressable>
              )}
            </View>

            {open && (
              <View style={styles.body}>
                <TextField
                  label={t('editor.tablesCaption')}
                  value={table.caption}
                  placeholder={t('editor.tablesCaptionPlaceholder')}
                  onChangeText={val =>
                    updateTable(table.id, current => ({
                      ...current,
                      caption: val.slice(0, TABLES_CAPTION_MAX),
                    }))
                  }
                />

                <View style={styles.sizeRow}>
                  <SizeStepper
                    label={t('editor.tablesRows')}
                    value={size.rows}
                    min={1}
                    max={TABLES_MAX_ROWS}
                    onCommit={next => resizeTable(table, next, size.cols)}
                  />
                  <SizeStepper
                    label={t('editor.tablesCols')}
                    value={size.cols}
                    min={1}
                    max={TABLES_MAX_COLS}
                    onCommit={next => resizeTable(table, size.rows, next)}
                  />
                </View>

                <Checkbox
                  checked={table.headerRow !== false}
                  onChange={checked =>
                    updateTable(table.id, current => ({
                      ...current,
                      headerRow: checked,
                    }))
                  }
                  label={
                    <Text style={styles.checkLabel}>
                      {t('editor.tablesHeaderRow')}
                    </Text>
                  }
                />

                <Text style={styles.formatHint}>
                  {t('editor.tablesFormatHint')}
                </Text>
                <View style={styles.toolbar}>
                  <Pressable
                    style={[
                      styles.toolBtn,
                      marks.bold && styles.toolBtnActive,
                    ]}
                    onPress={() => applyMarks({bold: !marks.bold})}
                    accessibilityLabel={t('editor.tablesBold')}>
                    <Text
                      style={[
                        styles.toolBold,
                        marks.bold && styles.toolTextActive,
                      ]}>
                      B
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toolBtn,
                      marks.italic && styles.toolBtnActive,
                    ]}
                    onPress={() => applyMarks({italic: !marks.italic})}
                    accessibilityLabel={t('editor.tablesItalic')}>
                    <Text
                      style={[
                        styles.toolItalic,
                        marks.italic && styles.toolTextActive,
                      ]}>
                      I
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toolBtn,
                      marks.underline && styles.toolBtnActive,
                    ]}
                    onPress={() => applyMarks({underline: !marks.underline})}
                    accessibilityLabel={t('editor.tablesUnderline')}>
                    <Text
                      style={[
                        styles.toolUnderline,
                        marks.underline && styles.toolTextActive,
                      ]}>
                      U
                    </Text>
                  </Pressable>
                  {TABLE_TEXT_COLORS.map(color => {
                    const active =
                      (marks.color || '').toUpperCase() === color.toUpperCase();
                    return (
                      <Pressable
                        key={color}
                        style={[
                          styles.colorSwatch,
                          {backgroundColor: color},
                          active && styles.colorSwatchActive,
                        ]}
                        onPress={() =>
                          applyMarks({
                            color: active ? undefined : color,
                          })
                        }
                        accessibilityLabel={t('editor.tablesColor').replace(
                          '{{color}}',
                          color,
                        )}
                      />
                    );
                  })}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator
                  style={styles.gridScroll}>
                  <View style={styles.grid}>
                    {table.rows.map((row, rowIndex) => {
                      const isHead = !!table.headerRow && rowIndex === 0;
                      return (
                        <View
                          key={`${table.id}-r${rowIndex}`}
                          style={styles.gridRow}>
                          {row.map((cell, colIndex) => {
                            const pos: CellPos = {
                              tableId: table.id,
                              row: rowIndex,
                              col: colIndex,
                            };
                            const isActive =
                              activePos?.tableId === table.id &&
                              activePos.row === rowIndex &&
                              activePos.col === colIndex;
                            const cellStyleMarks = cellMarks(cell);
                            return (
                              <TextInput
                                key={`${table.id}-c${rowIndex}-${colIndex}`}
                                style={[
                                  styles.cellInput,
                                  isHead && styles.cellInputHead,
                                  isActive && styles.cellInputActive,
                                  cellStyleMarks.bold && styles.cellBold,
                                  cellStyleMarks.italic && styles.cellItalic,
                                  cellStyleMarks.underline &&
                                    styles.cellUnderline,
                                  cellStyleMarks.color
                                    ? {color: cellStyleMarks.color}
                                    : null,
                                ]}
                                multiline
                                value={cellPlainText(cell)}
                                placeholder={t('editor.tablesCellPlaceholder')}
                                placeholderTextColor={colors.muted}
                                onFocus={() => setActivePos(pos)}
                                onChangeText={text => updateCell(pos, text)}
                              />
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        );
      })}

      <Pressable
        style={[
          editorStyles.addBtn,
          !canAddTable(tables) && styles.addDisabled,
        ]}
        disabled={!canAddTable(tables)}
        onPress={addTable}>
        <Text style={editorStyles.addBtnText}>{t('editor.tablesAdd')}</Text>
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
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeadMain: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  body: {
    marginTop: 10,
    gap: 4,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  sizeField: {
    minWidth: 120,
  },
  sizeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.35)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 20,
  },
  sizeValue: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  checkLabel: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  formatHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.3)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toolBold: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 15,
  },
  toolItalic: {
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.primary,
    fontSize: 15,
  },
  toolUnderline: {
    textDecorationLine: 'underline',
    fontWeight: '700',
    color: colors.primary,
    fontSize: 15,
  },
  toolTextActive: {
    color: colors.white,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: colors.text,
  },
  gridScroll: {
    marginBottom: 4,
  },
  grid: {
    borderWidth: 1,
    borderColor: 'rgba(63, 40, 198, 0.15)',
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cellInput: {
    width: 120,
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E6E2F2',
    fontSize: 14,
    color: colors.text,
    textAlignVertical: 'top',
  },
  cellInputHead: {
    backgroundColor: '#F4F1FF',
    fontWeight: '700',
  },
  cellInputActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(63, 40, 198, 0.06)',
  },
  cellBold: {
    fontWeight: '700',
  },
  cellItalic: {
    fontStyle: 'italic',
  },
  cellUnderline: {
    textDecorationLine: 'underline',
  },
  addDisabled: {
    opacity: 0.45,
  },
});
