import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {AppDialog, Breadcrumbs, TextField, UserAvatar} from '../../../shared/ui';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {goHome} from '../../../shared/navigation/resetToLessonPlans';
import {AppHeader} from '../../app-shell';
import {updateProfile, uploadProfileAvatar} from '../api/profileApi';
import {ChangePasswordModal} from './ChangePasswordModal';
import {ProfileSubscribeInformer} from './ProfileSubscribeInformer';
import {SubscribeCancelButton} from './SubscribeCancelButton';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {profile, isAuthorized, setSession} = useAuth();
  const {t} = useI18n();
  const {pageGutter, pageContentMaxWidth, authFormMaxWidth} = useLayout();
  const isStudent = !!profile?.isStudent;

  const [name, setName] = useState(profile?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.name || '');
  }, [profile?.name]);

  const dirty = name.trim() !== (profile?.name || '').trim();

  const onPickAvatar = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri || result.didCancel) {
      return;
    }
    setUploading(true);
    setLocalPreview(asset.uri);
    try {
      const res = await uploadProfileAvatar(
        asset.uri,
        asset.fileName || undefined,
        asset.type || undefined,
      );
      if (res.success === false || !res.profile) {
        setLocalPreview(null);
        setNotice(res.message || t('auth.authError'));
        return;
      }
      await setSession({...profile, ...res.profile, token: profile?.token});
      setLocalPreview(null);
      setNotice(t('profile.avatarUpdated'));
    } catch {
      setLocalPreview(null);
      setNotice(t('auth.authError'));
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    const nextName = name.trim();
    if (!nextName) {
      setNotice(t('profile.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({name: nextName});
      if (res.success === false || !res.profile) {
        setNotice(res.message || t('auth.authError'));
        return;
      }
      await setSession({...profile, ...res.profile, token: profile?.token});
      setNotice(t('profile.saved'));
    } catch {
      setNotice(t('auth.authError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <AppHeader />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
        <Text style={styles.intro}>{t('profile.friendlyIntro')}</Text>

        <View style={[styles.formCol, {maxWidth: authFormMaxWidth}]}>
          <Pressable
            onPress={() => void onPickAvatar()}
            disabled={uploading}
            style={styles.avatarWrap}>
            {localPreview ? (
              <Image source={{uri: localPreview}} style={styles.avatarImage} />
            ) : (
              <UserAvatar
                name={profile?.name}
                avatar={profile?.avatar}
                size={120}
              />
            )}
            <View style={styles.avatarBadge}>
              {uploading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.avatarBadgeText}>
                  {t('profile.changePhoto')}
                </Text>
              )}
            </View>
          </Pressable>
          <Text style={styles.avatarHint}>{t('profile.avatarHint')}</Text>

          <TextField
            label={t('profile.name')}
            value={name}
            onChangeText={setName}
            placeholder={t('profile.namePlaceholder')}
          />
          <TextField
            label={t('auth.email')}
            value={profile?.login || profile?.email || ''}
            editable={false}
          />

          {!isStudent && (
            <>
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
              <SubscribeCancelButton disableUppercase />
            </>
          )}

          <Pressable
            style={[
              styles.saveBtn,
              (!dirty || saving) && styles.saveBtnDisabled,
            ]}
            disabled={!dirty || saving}
            onPress={() => void onSave()}>
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('profile.save')}</Text>
            )}
          </Pressable>

          {!isStudent && (
            <View style={styles.informer}>
              <ProfileSubscribeInformer />
            </View>
          )}
        </View>
      </ScrollView>

      <ChangePasswordModal
        visible={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
      <AppDialog
        visible={!!notice}
        message={notice || ''}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.close'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
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
    marginBottom: 8,
  },
  intro: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  formCol: {
    width: '100%',
    alignSelf: 'center',
  },
  avatarWrap: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarBadge: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(40,30,90,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  avatarBadgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  avatarHint: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    marginBottom: 20,
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
  saveBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  informer: {
    marginTop: 24,
  },
});
