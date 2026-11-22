import {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Button} from '../../../shared/ui';
import type {CatalogFolder} from '../model/catalogTypes';

type Props = {
  visible: boolean;
  folders: CatalogFolder[];
  currentFolderId?: number | null;
  onClose: () => void;
  onPick: (folderId: number | null) => Promise<void> | void;
};

export function MoveToFolderModal({
  visible,
  folders,
  currentFolderId,
  onClose,
  onPick,
}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const options = useMemo(
    () =>
      [
        {id: null as number | null, title: t('lessons.noFolder')},
        ...folders.map(f => ({id: f.id as number | null, title: f.title})),
      ].filter(opt => {
        if (opt.id == null) {
          return currentFolderId != null;
        }
        return Number(currentFolderId) !== Number(opt.id);
      }),
    [folders, currentFolderId, t],
  );

  const pick = async (folderId: number | null) => {
    setSubmitting(true);
    setError('');
    try {
      await onPick(folderId);
      onClose();
    } catch {
      setError(t('lessons.moveToFolderFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View
          style={[
            styles.inner,
            {paddingHorizontal: pageGutter, maxWidth: pageContentMaxWidth},
          ]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('lessons.moveToFolder')}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          {submitting ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={options}
              keyExtractor={item =>
                item.id == null ? 'root' : `f-${item.id}`
              }
              contentContainerStyle={[
                styles.list,
                {paddingBottom: insets.bottom + 24},
              ]}
              ListEmptyComponent={
                <Text style={styles.empty}>{t('lessons.noFoldersYet')}</Text>
              }
              renderItem={({item}) => (
                <Pressable
                  onPress={() => void pick(item.id)}
                  style={({pressed}) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}>
                  <Text style={styles.rowIcon}>
                    {item.id == null ? '↑' : '📁'}
                  </Text>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                </Pressable>
              )}
            />
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={{paddingBottom: insets.bottom + 12}}>
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={onClose}
              disabled={submitting}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.white},
  inner: {flex: 1, width: '100%', alignSelf: 'center'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {flex: 1, color: colors.text, fontSize: 18, fontWeight: '700'},
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  close: {color: colors.primary, fontSize: 16, fontWeight: '700'},
  list: {paddingTop: 12, gap: 8},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  rowPressed: {backgroundColor: colors.primarySoft},
  rowIcon: {fontSize: 18},
  rowTitle: {flex: 1, color: colors.text, fontSize: 15, fontWeight: '600'},
  empty: {color: colors.muted, textAlign: 'center', marginTop: 24},
  error: {color: colors.danger, marginVertical: 8},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
});
