import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {APP_NAV_ITEMS} from '../../../shared/navigation/appNavItems';
import {openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {LanguageSwitcher} from '../../../shared/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function AppSidebar({visible, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {t} = useI18n();

  const onPressItem = (item: (typeof APP_NAV_ITEMS)[number]) => {
    onClose();
    openSectionRoute(navigation, item.route, isAuthorized);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={styles.root} pointerEvents="box-none">
        <Pressable
          style={[styles.backdrop, {top: insets.top + 48}]}
          onPress={onClose}
        />
        <View
          style={[
            styles.panel,
            {
              marginTop: insets.top + 48,
              paddingTop: 12,
              paddingBottom: insets.bottom + 24,
            },
          ]}>
          <View style={styles.panelHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
            <Text style={styles.panelTitle}>{t('header.menu')}</Text>
            <View style={styles.closeBtn} />
          </View>

          {APP_NAV_ITEMS.map(item => (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={() => onPressItem(item)}>
              <Text style={styles.itemLabel}>{t(item.labelKey)}</Text>
            </Pressable>
          ))}

          <View style={styles.lang}>
            <LanguageSwitcher />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.modalBackdrop,
  },
  panel: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: {width: 4, height: 0},
    elevation: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 44,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  close: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '600',
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
  },
  lang: {
    marginTop: 24,
  },
});
