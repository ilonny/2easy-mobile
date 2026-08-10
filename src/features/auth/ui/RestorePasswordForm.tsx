import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {isValidEmail} from '../../../shared/lib/validation';
import {autofill} from '../../../shared/lib/autofill';
import {colors} from '../../../shared/config/theme';
import {Button, TextField} from '../../../shared/ui';
import {resetPasswordRequest} from '../api/authApi';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RestorePasswordForm() {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const [login, setLogin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [responseError, setResponseError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    const email = login.trim();
    if (!email) {
      setLoginError(t('auth.emailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setLoginError(t('auth.invalidEmail'));
      return;
    }

    setLoginError('');
    setResponseError('');
    setLoading(true);
    try {
      const res = await resetPasswordRequest(email);
      if (res.success) {
        navigation.navigate('Login');
        return;
      }
      setResponseError(res.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text style={styles.title}>{t('auth.restorePasswordTitle')}</Text>
      <Text style={styles.line}>{t('auth.restorePasswordLine1')}</Text>
      <Text style={[styles.line, styles.lineBottom]}>
        {t('auth.restorePasswordLine2')}
      </Text>

      <TextField
        label={t('auth.email')}
        value={login}
        onChangeText={setLogin}
        error={loginError}
        {...autofill.email}
      />

      <Button
        title={t('auth.restorePasswordSubmit')}
        onPress={onSubmit}
        loading={loading}
      />
      {!!responseError && <Text style={styles.error}>{responseError}</Text>}

      <View style={styles.footer}>
        <Text style={styles.remember}>{t('auth.rememberPassword')} </Text>
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>{t('common.login')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  line: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  lineBottom: {
    marginBottom: 20,
  },
  footer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  remember: {
    color: colors.text,
    fontSize: 14,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '500',
  },
  error: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
  },
});
