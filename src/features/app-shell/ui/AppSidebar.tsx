import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {APP_NAV_ITEMS} from '../../../shared/navigation/appNavItems';
import {openSectionRoute} from '../../../shared/navigation/resetToLessonPlans';
import {LanguageSwitcher} from '../../../shared/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Matches AppHeader `rowAuth` minHeight. */
const HEADER_BAR_HEIGHT = 48;

export function AppSidebar({visible, onClose}: Props) {
  const insets = useSafeAreaInsets();
  const {pageGutter, isTablet} = useLayout();
  const navigation = useNavigation<Nav>();
  const {isAuthorized} = useAuth();
  const {t} = useI18n();

  const headerTopPad = insets.top + 8;
  const panelWidth = isTablet ? 360 : '82%';

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
        {/* Transparent strip over white header; hit target aligned with navbar ✕ */}
        <View
          style={[styles.headerHitArea, {height: headerTopPad + HEADER_BAR_HEIGHT}]}
          pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            hitSlop={10}
            style={[
              styles.headerCloseHit,
              {
                marginTop: headerTopPad,
                marginLeft: pageGutter,
              },
            ]}
          />
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.panel,
              {
                width: panelWidth,
                maxWidth: isTablet ? 360 : 320,
                paddingHorizontal: pageGutter,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuContent}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {APP_NAV_ITEMS.map((item, index) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.item,
                    index === APP_NAV_ITEMS.length - 1 && styles.itemLast,
                  ]}
                  onPress={() => onPressItem(item)}>
                  <Text style={styles.itemLabel}>{t(item.labelKey)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.lang}>
              <LanguageSwitcher />
            </View>
          </View>

          <Pressable
            style={styles.backdrop}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerHitArea: {
    width: '100%',
  },
  headerCloseHit: {
    width: 44,
    height: HEADER_BAR_HEIGHT,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
  },
  panel: {
    height: '100%',
    backgroundColor: colors.white,
    paddingTop: 8,
  },
  menuScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  menuContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  item: {
    minHeight: 52,
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.4,
  },
  lang: {
    marginTop: 'auto',
    paddingTop: 20,
    alignSelf: 'flex-start',
    width: 120,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
  },
});
