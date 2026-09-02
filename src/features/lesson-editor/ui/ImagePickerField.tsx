import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {Button} from '../../../shared/ui';
import {searchImages} from '../../lesson-player/api/lessonApi';
import {newId} from './editors/editorShared';

export type PickedImage = {
  id: string;
  /** Display / preview URI */
  uri: string;
  /** Already persisted storage path */
  path?: string;
  remoteId?: number | string;
  /** Local device file — upload via /upload-photos */
  isLocalFile?: boolean;
  /** Remote URL from search — upload via /upload-photos-by-url */
  isRemoteUrl?: boolean;
};

type Props = {
  images: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  /** Allow selecting multiple images. Default true. */
  multiple?: boolean;
  max?: number;
  label?: string;
};

export function ImagePickerField({
  images,
  onChange,
  multiple = true,
  max = 12,
  label,
}: Props) {
  const {t} = useI18n();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setResults([]);
      setSelected([]);
    }
  }, [searchOpen]);

  // Keep stored list within max (e.g. legacy multi cover → single).
  useEffect(() => {
    if (images.length > max) {
      onChange(images.slice(0, max));
    }
  }, [images, max, onChange]);

  const canAddMore = images.length < max;

  const pickFromDevice = async () => {
    if (!canAddMore) {
      return;
    }
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: multiple ? Math.max(1, max - images.length) : 1,
    });
    if (result.didCancel || !result.assets?.length) {
      return;
    }
    const next = result.assets
      .filter(a => !!a.uri)
      .map(asset => ({
        id: newId(),
        uri: asset.uri!,
        isLocalFile: true,
        isRemoteUrl: false,
      }));
    onChange(multiple ? images.concat(next).slice(0, max) : next.slice(0, 1));
  };

  const runSearch = async () => {
    const q = query.trim();
    if (!q) {
      return;
    }
    setSearching(true);
    try {
      const res = await searchImages(q);
      setResults(Array.isArray(res.images) ? res.images : []);
      setSelected([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleResult = (url: string) => {
    if (multiple) {
      setSelected(prev =>
        prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url],
      );
      return;
    }
    setSelected([url]);
  };

  const confirmSearch = () => {
    if (!selected.length) {
      setSearchOpen(false);
      return;
    }
    const picked = selected.map(url => ({
      id: newId(),
      uri: url,
      isLocalFile: false,
      isRemoteUrl: true,
    }));
    onChange(
      multiple
        ? images.concat(picked).slice(0, max)
        : picked.slice(0, 1),
    );
    setSearchOpen(false);
  };

  const removeAt = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionCard, !canAddMore && styles.actionDisabled]}
          disabled={!canAddMore}
          onPress={() => {
            void pickFromDevice();
          }}>
          <Text style={styles.actionEmoji}>🖼</Text>
          <Text style={styles.actionTitle}>
            {t('editor.imageFromDevice')}
          </Text>
          <Text style={styles.actionHint}>
            {t('editor.imageFromDeviceHint')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.actionCard, !canAddMore && styles.actionDisabled]}
          disabled={!canAddMore}
          onPress={() => setSearchOpen(true)}>
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionTitle}>
            {t('editor.imageFromWeb')}
          </Text>
          <Text style={styles.actionHint}>
            {t('editor.imageFromWebHint')}
          </Text>
        </Pressable>
      </View>

      {images.length ? (
        <View style={styles.thumbs}>
          {images.map(img => (
            <View key={img.id} style={styles.thumbWrap}>
              <Image source={{uri: img.uri}} style={styles.thumb} />
              <Pressable
                style={styles.remove}
                onPress={() => removeAt(img.id)}
                hitSlop={8}>
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{t('editor.noImagesYet')}</Text>
      )}

      <Modal
        visible={searchOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSearchOpen(false)}>
        <View style={[styles.searchRoot, {paddingTop: insets.top + 8}]}>
          <View style={styles.searchHeader}>
            <Text style={styles.searchTitle}>{t('editor.imageFromWeb')}</Text>
            <Pressable onPress={() => setSearchOpen(false)} hitSlop={10}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('editor.imageSearchPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={() => {
                void runSearch();
              }}
              autoFocus
            />
            <Pressable
              style={styles.searchBtn}
              onPress={() => {
                void runSearch();
              }}>
              <Text style={styles.searchBtnText}>{t('editor.find')}</Text>
            </Pressable>
          </View>

          {searching ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(uri, i) => `${uri}-${i}`}
              numColumns={3}
              contentContainerStyle={{
                padding: 12,
                paddingBottom: insets.bottom + 100,
                gap: 8,
              }}
              columnWrapperStyle={{gap: 8}}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {query.trim()
                    ? t('editor.imageSearchEmpty')
                    : t('editor.imageSearchHint')}
                </Text>
              }
              renderItem={({item}) => {
                const active = selected.includes(item);
                return (
                  <Pressable
                    style={[styles.result, active && styles.resultActive]}
                    onPress={() => toggleResult(item)}>
                    <Image source={{uri: item}} style={styles.resultImg} />
                    {active ? (
                      <View style={styles.check}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}

          <View
            style={[
              styles.footer,
              {paddingBottom: Math.max(insets.bottom, 12)},
            ]}>
            <Button
              title={t('common.add')}
              onPress={confirmSearch}
              disabled={!selected.length}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {marginBottom: 16, gap: 12},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actions: {flexDirection: 'row', gap: 10},
  actionCard: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    minHeight: 110,
  },
  actionDisabled: {opacity: 0.45},
  actionEmoji: {fontSize: 22, marginBottom: 6},
  actionTitle: {
    fontWeight: '800',
    color: colors.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  actionHint: {fontSize: 12, color: colors.textSecondary, lineHeight: 16},
  thumbs: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  thumbWrap: {position: 'relative'},
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: '#EEE',
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {color: '#fff', fontWeight: '800', fontSize: 12},
  empty: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 8,
  },
  searchRoot: {flex: 1, backgroundColor: colors.white},
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  close: {fontSize: 22, color: colors.muted, fontWeight: '700'},
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBg,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: {color: colors.white, fontWeight: '700'},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  result: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.primarySoft,
  },
  resultActive: {borderColor: colors.primary},
  resultImg: {width: '100%', height: '100%'},
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {color: '#fff', fontWeight: '800', fontSize: 12},
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
