import {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {useI18n} from '../../../shared/i18n';
import {isOutlookEmail, isValidEmail} from '../../../shared/lib/validation';
import {autofill} from '../../../shared/lib/autofill';
import {colors} from '../../../shared/config/theme';
import {Button, Checkbox, PasswordField, TextField} from '../../../shared/ui';
import {loginRequest, registerRequest} from '../api/authApi';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RegistrationForm() {
  const navigation = useNavigation<Nav>();
  const {t} = useI18n();
  const {setSession, markRegistrationCompleted, hasCompletedRegistration} =
    useAuth();

  const [step, setStep] = useState(0);
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [adsAgreement, setAdsAgreement] = useState(true);
  const [password, setPassword] = useState('');

  const [loginError, setLoginError] = useState('');
  const [nameError, setNameError] = useState('');
  const [privacyError, setPrivacyError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [responseError, setResponseError] = useState('');
  const [loading, setLoading] = useState(false);

  if (hasCompletedRegistration) {
    return (
      <View>
        <Text style={styles.title}>{t('auth.alreadyHaveAccount')}</Text>
        <Text style={styles.subtitle}>{t('auth.registrationLimited')}</Text>
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.footerLink}>
          <Text style={styles.link}>{t('common.login')}</Text>
        </Pressable>
      </View>
    );
  }

  const validateStep0 = () => {
    let ok = true;
    const email = login.trim();

    if (!email) {
      setLoginError(t('auth.emailRequired'));
      ok = false;
    } else if (!isValidEmail(email)) {
      setLoginError(t('auth.invalidEmail'));
      ok = false;
    } else if (isOutlookEmail(email)) {
      setLoginError(t('auth.outlookEmailBlocked'));
      ok = false;
    } else {
      setLoginError('');
    }

    if (!name.trim()) {
      setNameError(t('auth.nameRequired'));
      ok = false;
    } else {
      setNameError('');
    }

    if (!privacy) {
      setPrivacyError(t('auth.requiredField'));
      ok = false;
    } else {
      setPrivacyError('');
    }

    return ok;
  };

  const onRegister = async () => {
    if (!validateStep0()) {
      return;
    }

    setLoading(true);
    setResponseError('');
    try {
      const res = await registerRequest({
        login: login.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        privacy,
        ads_agreement: adsAgreement,
      });

      if (res.ok) {
        setStep(1);
        return;
      }

      setResponseError(res.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const onConfirmLogin = async () => {
    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      return;
    }
    setPasswordError('');
    setLoading(true);
    setResponseError('');
    try {
      const res = await loginRequest({
        login: login.trim(),
        password,
      });

      if (res.token) {
        await setSession(res);
        await markRegistrationCompleted();
        return;
      }

      setResponseError(res.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <View>
        <View style={styles.stepHeader}>
          <Pressable onPress={() => setStep(0)} style={styles.backBtn}>
            <Text style={styles.backText}>{`<- ${t('common.back')}`}</Text>
          </Pressable>
          <Text style={styles.title}>{t('auth.registration')}</Text>
        </View>
        <Text style={styles.subtitle}>
          {t('auth.enterPasswordSent')} {login.trim()}
        </Text>
        <PasswordField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          error={passwordError}
        />
        <Text style={styles.spamHint}>{t('auth.checkSpamFolder')}</Text>
        <Button
          title={t('common.login')}
          onPress={onConfirmLogin}
          loading={loading}
        />
        {!!responseError && <Text style={styles.error}>{responseError}</Text>}
        <Pressable
          onPress={() => navigation.navigate('Login')}
          style={styles.footerLink}>
          <Text style={styles.link}>{t('auth.registrationFooterPrompt')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.title, styles.titleExtrabold]}>
        {t('auth.registration')}
      </Text>
      <Text style={styles.subtitle}>{t('auth.afterRegistration')}</Text>

      <TextField
        label={t('auth.emailLabel')}
        value={login}
        onChangeText={setLogin}
        error={loginError}
        {...autofill.email}
      />
      <TextField
        label={t('auth.nameLabel')}
        value={name}
        onChangeText={setName}
        error={nameError}
        {...autofill.name}
      />
      <TextField
        label={t('auth.phoneLabel')}
        value={phone}
        onChangeText={setPhone}
        {...autofill.phone}
      />

      <Checkbox
        checked={privacy}
        onChange={setPrivacy}
        error={privacyError}
        label={
          <Text style={styles.checkboxText}>
            {t('auth.acceptTerms')}
            <Text
              style={styles.inlineLink}
              onPress={() =>
                navigation.navigate('LegalDocument', {docId: 'public_offer'})
              }>
              {t('auth.publicOffer')}
            </Text>
            {t('auth.registrationTermsAfterPublicOffer')}
            <Text
              style={styles.inlineLink}
              onPress={() =>
                navigation.navigate('LegalDocument', {docId: 'privacy_policy'})
              }>
              {t('auth.privacyPolicy')}
            </Text>
            {t('auth.registrationTermsBeforeConsent')}
            <Text
              style={styles.inlineLink}
              onPress={() =>
                navigation.navigate('LegalDocument', {
                  docId: 'personal_agreement',
                })
              }>
              {t('auth.personalDataConsent')}
            </Text>
          </Text>
        }
      />

      <Checkbox
        checked={adsAgreement}
        onChange={setAdsAgreement}
        label={<Text style={styles.checkboxText}>{t('auth.newsConsent')}</Text>}
      />

      <Button
        title={t('auth.getPassword')}
        onPress={onRegister}
        loading={loading}
      />
      {!!responseError && <Text style={styles.error}>{responseError}</Text>}

      <Pressable
        onPress={() => navigation.navigate('Login')}
        style={styles.footerLink}>
        <Text style={styles.link}>{t('auth.registrationFooterPrompt')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  titleExtrabold: {
    fontWeight: '800',
  },
  stepHeader: {
    marginBottom: 8,
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: colors.muted,
    fontSize: 14,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 20,
  },
  spamHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  checkboxText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  inlineLink: {
    color: colors.primary,
  },
  footerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  error: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
  },
});
