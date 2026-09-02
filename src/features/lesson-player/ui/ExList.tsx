import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {ActionMenuModal, EyeIcon, type ActionMenuItem} from '../../../shared/ui';
import {getExerciseTypeLabel} from '../../lesson-editor/model/templates';
import {
  type Exercise,
  type ExListChromeHandlers,
} from '../model/types';
import {isExVisible} from '../lib/exMappers';
import {useLessonPlayer} from '../model/LessonPlayerContext';
import {stripHtml} from './HtmlContent';
import {useChipDrag} from './interaction/ChipDragContext';
import {ExViewRouter} from './views/ExViewRouter';

type Props = {
  list: Exercise[];
  chrome?: ExListChromeHandlers;
};

function exerciseTitle(data: Exercise['data']) {
  const candidates = [
    data?.subtitle,
    data?.description,
    data?.title,
    (data as {name?: string})?.name,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      const plain = stripHtml(value);
      if (plain) {
        return plain;
      }
    }
  }
  return '';
}

function visibilityLabel(
  type: string,
  visible: boolean,
  t: (k: string) => string,
) {
  if (type === 'note') {
    return visible
      ? t('lessons.noteVisibleToStudent')
      : t('lessons.noteHiddenFromStudent');
  }
  return visible
    ? t('lessons.taskVisibleToStudent')
    : t('lessons.taskHiddenFromStudent');
}

export function ExList({list, chrome}: Props) {
  const {t} = useI18n();
  const {isTeacher, isEdit, isView} = useLessonPlayer();
  const {isDragging} = useChipDrag();
  const [menuExId, setMenuExId] = useState<number | null>(null);

  const menuEx = useMemo(
    () => list.find(ex => ex.id === menuExId) ?? null,
    [list, menuExId],
  );
  const menuIndex = useMemo(
    () => (menuEx ? list.findIndex(ex => ex.id === menuEx.id) : -1),
    [list, menuEx],
  );

  const menuItems: ActionMenuItem[] = useMemo(() => {
    if (!menuEx || menuIndex < 0) {
      return [];
    }
    const items: ActionMenuItem[] = [];
    if (menuIndex > 0) {
      items.push({
        label: t('editor.moveUp'),
        onPress: () => {
          const prev = list[menuIndex - 1];
          if (prev) {
            chrome?.changeSortIndex?.(prev.id, prev.sortIndex + 1);
          }
          chrome?.changeSortIndex?.(menuEx.id, menuEx.sortIndex - 1);
        },
      });
    }
    if (menuIndex < list.length - 1) {
      items.push({
        label: t('editor.moveDown'),
        onPress: () => {
          const next = list[menuIndex + 1];
          if (next) {
            chrome?.changeSortIndex?.(next.id, next.sortIndex - 1);
          }
          chrome?.changeSortIndex?.(menuEx.id, menuEx.sortIndex + 1);
        },
      });
    }
    items.push({
      label: t('editor.editTask'),
      onPress: () => chrome?.onPressEdit?.(menuEx),
    });
    items.push({
      label: t('lessons.copyTask'),
      onPress: () => chrome?.onPressCopy?.(menuEx),
    });
    items.push({
      label: t('lessons.deleteTask'),
      destructive: true,
      onPress: () => chrome?.onPressDelete?.(menuEx.id),
    });
    return items;
  }, [chrome, list, menuEx, menuIndex, t]);

  const hasClipboard = !!chrome?.hasClipboard;

  return (
    <View style={styles.list}>
      {list.map((ex, index) => {
        const visible = isExVisible(ex.is_visible);
        if (isView && !isEdit && !visible && !isTeacher) {
          return null;
        }
        if (ex.type === 'note' && !isTeacher && !visible) {
          return null;
        }

        return (
          <View key={ex.id}>
            <View
              style={[
                styles.card,
                !visible && styles.cardHidden,
                isDragging && styles.cardDragging,
                !!chrome?.onChangeIsVisible &&
                  isView &&
                  !isEdit &&
                  styles.cardWithEye,
              ]}>
              {chrome?.onChangeIsVisible ? (
                <Pressable
                  onPress={() => chrome?.onChangeIsVisible?.(ex)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={visibilityLabel(ex.type, visible, t)}
                  style={[
                    styles.eyeBtn,
                    isEdit ? styles.eyeBtnEdit : styles.eyeBtnView,
                  ]}>
                  <EyeIcon enabled={visible} size={24} />
                </Pressable>
              ) : null}

              {isEdit ? (
                <View style={styles.chrome}>
                  <View style={styles.chromeTop}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{index + 1}</Text>
                    </View>
                    <View style={styles.chromeMeta}>
                      <Text style={styles.chromeTitle} numberOfLines={1}>
                        {exerciseTitle(ex.data) ||
                          getExerciseTypeLabel(ex.type, t)}
                      </Text>
                      <Text style={styles.chromeType}>
                        {getExerciseTypeLabel(ex.type, t)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => chrome?.onPressEdit?.(ex)}
                      style={styles.editBtn}>
                      <Text style={styles.editBtnText}>{t('common.edit')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setMenuExId(ex.id)}
                      hitSlop={8}
                      style={styles.moreBtn}>
                      <Text style={styles.moreBtnText}>⋯</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <ExViewRouter type={ex.type} data={{...ex.data, id: ex.id}} />
            </View>

            {isEdit && index < list.length - 1 ? (
              <View style={styles.between}>
                <Pressable
                  style={styles.betweenBtn}
                  onPress={() => chrome?.onPressCreate?.(ex.sortIndex)}>
                  <Text style={styles.betweenBtnText}>
                    + {t('lessons.createNewTask')}
                  </Text>
                </Pressable>
                {hasClipboard ? (
                  <Pressable
                    style={styles.betweenBtn}
                    onPress={() => chrome?.onPressPaste?.(ex.sortIndex)}>
                    <Text style={styles.betweenBtnText}>
                      {t('lessons.pasteTask')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}

      {isEdit ? (
        <View style={styles.bottomActions}>
          <Pressable
            style={styles.addBottom}
            onPress={() =>
              chrome?.onPressCreate?.(
                list.length ? list[list.length - 1]?.sortIndex : undefined,
              )
            }>
            <Text style={styles.addBottomText}>
              + {t('editor.addExercise')}
            </Text>
            <Text style={styles.addBottomHint}>
              {t('editor.addExerciseHint')}
            </Text>
          </Pressable>
          {hasClipboard ? (
            <Pressable
              style={styles.pasteBtn}
              onPress={() =>
                chrome?.onPressPaste?.(
                  list.length
                    ? list[list.length - 1]?.sortIndex
                    : undefined,
                )
              }>
              <Text style={styles.insertText}>{t('lessons.pasteTask')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <ActionMenuModal
        visible={menuExId != null}
        title={
          menuEx
            ? exerciseTitle(menuEx.data) || getExerciseTypeLabel(menuEx.type, t)
            : undefined
        }
        items={menuItems}
        cancelLabel={t('common.cancel')}
        onClose={() => setMenuExId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {gap: 8, paddingBottom: 24},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 16,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
    zIndex: 1,
    position: 'relative',
  },
  cardWithEye: {
    paddingLeft: 44,
  },
  cardDragging: {
    zIndex: 50,
    elevation: 8,
  },
  cardHidden: {opacity: 0.55},
  chrome: {
    marginBottom: 14,
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chromeTop: {flexDirection: 'row', alignItems: 'center', gap: 8},
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {color: colors.white, fontWeight: '800', fontSize: 13},
  chromeMeta: {flex: 1, gap: 2, minWidth: 0},
  chromeTitle: {fontWeight: '800', color: colors.primary, fontSize: 15},
  chromeType: {fontSize: 12, color: colors.muted},
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: colors.primarySoft,
  },
  editBtnText: {fontSize: 12, fontWeight: '700', color: colors.primary},
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginTop: -4,
  },
  eyeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  eyeBtnEdit: {
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  eyeBtnView: {
    position: 'absolute',
    left: 8,
    top: 8,
  },
  between: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  betweenBtn: {
    backgroundColor: '#F2F2F2',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  betweenBtnText: {color: colors.primary, fontWeight: '700', fontSize: 13},
  bottomActions: {gap: 8, marginTop: 8},
  addBottom: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
  },
  addBottomText: {color: colors.primary, fontWeight: '800', fontSize: 16},
  addBottomHint: {
    color: colors.textSecondary,
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
  },
  pasteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  insertText: {color: colors.primary, fontWeight: '700'},
});
