import {useState} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {Breadcrumbs, TextField} from '../../../shared/ui';
import {AppHeader} from '../../app-shell';
import {ChangePasswordModal} from './ChangePasswordModal';
import {ProfileSubscribeInformer} from './ProfileSubscribeInformer';
import {SubscribeCancelButton} from './SubscribeCancelButton';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {profile, isAuthorized} = useAuth();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth} = useLayout();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const initial = (profile?.name?.trim()?.[0] || 'A').toUpperCase();

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: pageGutter,
            paddingBottom: 24,
            maxWidth: pageContentMaxWidth,
            width: '100%',
            alignSelf: 'center',
          },
        ]}>
        <Breadcrumbs
          items={[
            {
              label: t('editor.home'),
              onPress: () => goHome(navigation, isAuthorized),
            },
            {label: t('profile.profileLabel')},
          ]}
        />
        <Text style={styles.pageTitle}>{t('profile.personalData')}</Text>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <TextField
          label={t('profile.name')}
          value={profile?.name || ''}
          editable={false}
        />
        <TextField
          label={t('auth.email')}
          value={profile?.login || profile?.email || ''}
          editable={false}
        />

        <View style={styles.passwordRow}>
          <View style={styles.passwordField}>
            <TextField
              label={t('auth.password')}
              value="*************"
              editable={false}
              secureTextEntry
            />
          </View>
          <Pressable
            style={styles.changeBtn}
            onPress={() => setChangePasswordOpen(true)}>
            <Text style={styles.changeBtnText}>{t('profile.change')}</Text>
          </Pressable>
        </View>

        <SubscribeCancelButton />

        <View style={styles.informer}>
          <ProfileSubscribeInformer />
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: {
    paddingTop: 16,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#4031C3',
  },
  passwordRow: {
    gap: 10,
  },
  passwordField: {
    flex: 1,
  },
  changeBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#000',
    borderRadius: radii.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  changeBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  informer: {
    marginTop: 24,
  },
});
