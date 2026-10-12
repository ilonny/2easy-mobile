import {useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {DictionaryItem} from '../api/dictionaryApi';
import {groupByLesson} from '../lib/groupByLesson';

type Props = {
  items: DictionaryItem[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onToggleAll: () => void;
  onToggleGroup: (ids: number[], select: boolean) => void;
};

export function TrainingWordPicker({
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  onToggleGroup,
}: Props) {
  const {t} = useI18n();
  const lessonGroups = useMemo(
    () => groupByLesson(items, t('dictionary.training.noLessonGroup')),
    [items, t],
  );
  const allSelected =
    items.length > 0 && items.every(item => selectedIds.includes(item.id));

  if (!items.length) {
    return (
      <Text style={styles.empty}>{t('dictionary.training.emptyUnlearned')}</Text>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Text style={styles.toolbarMeta}>
          {t('dictionary.selectedCount').replace(
            '{{count}}',
            String(selectedIds.length),
          )}
        </Text>
        <Pressable onPress={onToggleAll} hitSlop={8}>
          <Text style={styles.toolbarAction}>
            {allSelected
              ? t('dictionary.resetSelection')
              : t('dictionary.allWords')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {lessonGroups.map(group => {
          const groupIds = group.items.map(item => item.id);
          const groupSelected =
            groupIds.length > 0 &&
            groupIds.every(id => selectedIds.includes(id));
          return (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle} numberOfLines={2}>
                  {group.label}
                </Text>
                <Pressable
                  onPress={() => onToggleGroup(groupIds, !groupSelected)}
                  style={[styles.check, groupSelected && styles.checkOn]}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: groupSelected}}
                  accessibilityLabel={t(
                    'dictionary.training.selectLessonGroup',
                  ).replace('{{name}}', group.label)}>
                  {groupSelected ? (
                    <Text style={styles.checkMark}>✓</Text>
                  ) : null}
                </Pressable>
              </View>
              {group.items.map(item => {
                const selected = selectedIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onToggle(item.id)}
                    style={[styles.card, selected && styles.cardOn]}>
                    <View style={styles.cardText}>
                      <Text style={styles.source}>{item.sourceWord}</Text>
                      <Text style={styles.translation}>
                        {item.translatedWord}
                      </Text>
                    </View>
                    <View style={[styles.check, selected && styles.checkOn]}>
                      {selected ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, minHeight: 0, gap: 8},
  empty: {textAlign: 'center', color: colors.muted, marginTop: 40},
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toolbarMeta: {color: colors.textSecondary, fontSize: 13, fontWeight: '600'},
  toolbarAction: {color: colors.primary, fontWeight: '700', fontSize: 14},
  list: {gap: 12, paddingBottom: 16},
  group: {gap: 8},
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  groupTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cardText: {flex: 1, gap: 2},
  source: {fontSize: 16, fontWeight: '700', color: colors.text},
  translation: {fontSize: 14, color: colors.textSecondary},
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {color: colors.white, fontWeight: '800', fontSize: 13},
});
