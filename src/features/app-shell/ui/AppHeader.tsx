import {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  useNavigation,
  useNavigationState,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {resetToRoute} from '../../../shared/navigation/resetToLessonPlans';
import {BrandLogo} from '../../../shared/ui/BrandLogo';
import {ProfileMenuButton} from '../../lesson-plans/ui/ProfileMenuButton';
import {AppSidebar} from './AppSidebar';

const BRAND_VIOLET = '#5A42D4';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  style?: object;
};

/** Tab roots / guest home — show menu (or empty slot for students). */
const MAIN_ROUTE_NAMES = new Set([
  'LessonPlans',
  'StudentsList',
  'Profile',
  'Home',
  'MainTabs',
  'Lessons',
  'Students',
]);

function getFocusedRouteName(
  state?: NavigationState | PartialState<NavigationState>,
): string | undefined {
  if (!state || !('routes' in state) || !state.routes?.length) {
    return undefined;
  }
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) {
    return undefined;
  }
  if (route.state) {
    return getFocusedRouteName(route.state);
  }
  return route.name;
}

function MenuIcon() {
  return (
    <View style={styles.menuIcon} accessibilityElementsHidden>
      <View style={styles.menuLineWide} />
      <View style={styles.menuLine} />
      <View style={styles.menuLineShort} />
    </View>
  );
}

function CloseIcon() {
  return (
    <View style={styles.closeIcon} accessibilityElementsHidden>
      <View style={[styles.closeLine, styles.closeLineA]} />
      <View style={[styles.closeLine, styles.closeLineB]} />
    </View>
  );
}

function ChevronLeftIcon() {
  return (
    <View style={styles.chevronWrap} accessibilityElementsHidden>
      <View style={styles.chevron} />
    </View>
  );
}

export function AppHeader({style}: Props) {
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStudent = !!profile?.isStudent;

  const focusedRoute = useNavigationState(state => getFocusedRouteName(state));
  const isMainScreen = useMemo(() => {
    if (!focusedRoute) {
      return true;
    }
    return MAIN_ROUTE_NAMES.has(focusedRoute);
  }, [focusedRoute]);

  const onBack = () => {
    if (isStudent) {
      resetToRoute(navigation, 'Students', {
        studentId: Number(profile?.studentId || 0),
      });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    resetToRoute(navigation, 'Lessons');
  };

  if (!isAuthorized) {
    return (
      <View style={[styles.rowGuest, style]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="2easy"
          hitSlop={8}
          onPress={() => navigation.navigate('Home')}>
          <BrandLogo height={32} />
        </Pressable>
        <View style={styles.guestActions}>
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => navigation.navigate('Login')}
            style={({pressed}) => pressed && styles.pressed}>
            <Text style={styles.loginLink}>{t('common.login')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Registration')}
            style={({pressed}) => [styles.tryFree, pressed && styles.pressed]}>
            <Text style={styles.tryFreeText}>{t('header.tryFree')}</Text>
            <Text style={styles.tryFreeFire}>🔥</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const leftControl = !isMainScreen ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      onPress={onBack}
      style={styles.menuButton}>
      <ChevronLeftIcon />
    </Pressable>
  ) : isStudent ? (
    <View style={styles.menuButton} />
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sidebarOpen ? t('common.close') : t('header.menu')}
      hitSlop={8}
      onPress={() => setSidebarOpen(current => !current)}
      style={styles.menuButton}>
      {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
    </Pressable>
  );

  return (
    <>
      <View style={[styles.rowAuth, style]}>
        {leftControl}

        <Pressable
          onPress={() => {
            if (isStudent) {
              resetToRoute(navigation, 'Students', {
                studentId: Number(profile?.studentId || 0),
              });
              return;
            }
            resetToRoute(navigation, 'Lessons');
          }}
          hitSlop={8}
          style={styles.logoCenterWrap}>
          <BrandLogo height={34} />
        </Pressable>

        <View style={styles.right}>
          <ProfileMenuButton
            onLogin={() => navigation.navigate('Login')}
            onRegister={() => navigation.navigate('Registration')}
          />
        </View>
      </View>

      {!isStudent && isMainScreen ? (
        <AppSidebar
          visible={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  rowGuest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    gap: 12,
  },
  rowAuth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  guestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  loginLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#181818',
    letterSpacing: -0.1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tryFree: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND_VIOLET,
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 7,
    maxWidth: 180,
  },
  tryFreeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  tryFreeFire: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.88,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2,
  },
  menuIcon: {
    width: 28,
    gap: 5,
  },
  menuLineWide: {
    height: 2.5,
    width: 28,
    borderRadius: 2,
    backgroundColor: '#1A1A1A',
  },
  menuLine: {
    height: 2.5,
    width: 22,
    borderRadius: 2,
    backgroundColor: '#1A1A1A',
  },
  menuLineShort: {
    height: 2.5,
    width: 16,
    borderRadius: 2,
    backgroundColor: '#1A1A1A',
  },
  closeIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 22,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#1A1A1A',
  },
  closeLineA: {
    transform: [{rotate: '45deg'}],
  },
  closeLineB: {
    transform: [{rotate: '-45deg'}],
  },
  chevronWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#1A1A1A',
    transform: [{rotate: '45deg'}],
    marginLeft: 4,
  },
  logoCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  right: {
    zIndex: 2,
  },
});
