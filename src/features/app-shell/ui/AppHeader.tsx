import {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {resetToRoute} from '../../../shared/navigation/resetToLessonPlans';
import {ProfileMenuButton} from '../../lesson-plans/ui/ProfileMenuButton';
import {AppSidebar} from './AppSidebar';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Props = {
  style?: object;
};

function MenuIcon() {
  return (
    <View style={styles.menuIcon} accessibilityElementsHidden>
      <View style={styles.menuLineWide} />
      <View style={styles.menuLine} />
      <View style={styles.menuLineShort} />
    </View>
  );
}

export function AppHeader({style}: Props) {
  const navigation = useNavigation<Nav>();
  const {isAuthorized, profile} = useAuth();
  const {t} = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isStudent = !!profile?.isStudent;

  if (!isAuthorized) {
    return (
      <View style={[styles.row, style]}>
        <Text style={styles.logoLeft}>2EASY</Text>
        <ProfileMenuButton
          onLogin={() => navigation.navigate('Login')}
          onRegister={() => navigation.navigate('Registration')}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.rowAuth, style]}>
        {isStudent ? (
          <View style={styles.menuButton} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('header.menu')}
            hitSlop={8}
            onPress={() => setSidebarOpen(true)}
            style={styles.menuButton}>
            <MenuIcon />
          </Pressable>
        )}

        <Pressable
          onPress={() =>
            resetToRoute(navigation, isStudent ? 'Students' : 'Lessons')
          }
          hitSlop={8}
          style={styles.logoCenterWrap}>
          <Image
            source={require('../../../shared/assets/home/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.right}>
          <ProfileMenuButton
            onLogin={() => navigation.navigate('Login')}
            onRegister={() => navigation.navigate('Registration')}
          />
        </View>
      </View>

      {!isStudent ? (
        <AppSidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  rowAuth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  logoLeft: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
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
  logoCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoImage: {
    width: 106,
    height: 28,
  },
  right: {
    zIndex: 2,
  },
});
