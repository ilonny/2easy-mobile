import {useEffect, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {resetToRoute} from '../../../shared/navigation/resetToLessonPlans';
import {LanguageSwitcher} from '../../../shared/ui';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  onLogin: () => void;
  onRegister: () => void;
};

export function ProfileMenuButton({onLogin, onRegister}: Props) {
  const navigation = useNavigation<Nav>();
  const {isAuthorized, clearSession, profile} = useAuth();
  const {t} = useI18n();
  const {width: windowWidth} = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<View>(null);
  const [menuTop, setMenuTop] = useState(56);
  const [menuRight, setMenuRight] = useState(16);

  useEffect(() => {
    if (!open) {
      return;
    }
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      setMenuTop(y + h + 8);
      setMenuRight(Math.max(12, windowWidth - (x + w)));
    });
  }, [open, windowWidth]);

  const close = () => setOpen(false);
  const initial = (profile?.name?.trim()?.[0] || '?').toUpperCase();

  const onLogout = async () => {
    close();
    // Reset while nav is still mounted, then clear session (guest stack remounts on Home).
    resetToRoute(navigation, 'Home');
    await clearSession();
  };

  return (
    <>
      <View ref={anchorRef} collapsable={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.profileMenu')}
          hitSlop={8}
          onPress={() => setOpen(current => !current)}
          style={({pressed}) => [
            styles.iconButton,
            isAuthorized && styles.iconButtonAuth,
            pressed && styles.pressed,
          ]}>
          {isAuthorized ? (
            <Text style={styles.initial}>{initial}</Text>
          ) : (
            <Text style={styles.icon}>👤</Text>
          )}
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            style={[styles.menu, {top: menuTop, right: menuRight}]}
            onPress={e => e.stopPropagation()}>
            {isAuthorized ? (
              <>
                {!!profile?.name && (
                  <Text style={styles.userName} numberOfLines={1}>
                    {profile.name}
                  </Text>
                )}
                <Pressable style={styles.item} onPress={() => void onLogout()}>
                  <Text style={styles.itemLabel}>{t('auth.logout')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.item}
                  onPress={() => {
                    close();
                    onRegister();
                  }}>
                  <Text style={styles.itemLabel}>{t('auth.registration')}</Text>
                </Pressable>
                <Pressable
                  style={styles.item}
                  onPress={() => {
                    close();
                    onLogin();
                  }}>
                  <Text style={[styles.itemLabel, styles.itemPrimary]}>
                    {t('common.login')}
                  </Text>
                </Pressable>
              </>
            )}
            <View style={styles.divider} />
            <View style={styles.langWrap}>
              <LanguageSwitcher />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonAuth: {
    borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    borderColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  icon: {
    fontSize: 18,
  },
  initial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4031C3',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
  },
  menu: {
    position: 'absolute',
    right: 16,
    width: 220,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 6,
  },
  userName: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  itemPrimary: {
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  langWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 2,
  },
});
