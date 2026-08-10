import {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {templates, type TTemplate} from '../model/templates';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
};

export function ChooseTemplateModal({visible, onClose, onSelect}: Props) {
  const insets = useSafeAreaInsets();
  const {t} = useI18n();
  const root = useMemo(() => templates, []);
  const [list, setList] = useState<TTemplate[]>(root);
  const [isSub, setIsSub] = useState(false);

  useEffect(() => {
    if (visible) {
      setList(root);
      setIsSub(false);
    }
  }, [visible, root]);

  const label = (item: TTemplate) => {
    const translated = t(item.titleKey);
    return translated === item.titleKey
      ? item.titleDefault || item.type
      : translated;
  };

  const desc = (item: TTemplate) => {
    if (!item.descriptionKey) return '';
    const translated = t(item.descriptionKey);
    return translated === item.descriptionKey
      ? item.descriptionDefault || ''
      : translated;
  };

  const onPress = (item: TTemplate) => {
    if (item.subItems?.length) {
      setList(item.subItems);
      setIsSub(true);
      return;
    }
    onSelect(item.type);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.root, {paddingTop: insets.top + 8}]}>
        <View style={styles.header}>
          {isSub ? (
            <Pressable
              onPress={() => {
                setList(root);
                setIsSub(false);
              }}>
              <Text style={styles.back}>← {t('editor.chooseTemplate')}</Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <Text style={styles.title}>{t('editor.chooseTemplate')}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{t('editor.addExerciseHint')}</Text>
        <ScrollView
          contentContainerStyle={[
            styles.list,
            {paddingBottom: insets.bottom + 24},
          ]}>
          {list.map(item => (
            <Pressable
              key={item.type}
              style={({pressed}) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onPress(item)}>
              <Text style={styles.cardTitle}>{label(item)}</Text>
              {!!desc(item) && (
                <Text style={styles.cardDesc}>{desc(item)}</Text>
              )}
              {!!item.subItems?.length && (
                <Text style={styles.more}>→</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#F9F9F9'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {color: colors.primary, fontWeight: '600', width: 90},
  backPlaceholder: {width: 90},
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  close: {width: 90, textAlign: 'right', fontSize: 22, color: colors.muted},
  list: {padding: 16, gap: 12},
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 20,
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  cardPressed: {opacity: 0.92, backgroundColor: colors.primarySoft},
  cardTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 17,
  },
  cardDesc: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  more: {
    position: 'absolute',
    right: 16,
    top: 16,
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
});
