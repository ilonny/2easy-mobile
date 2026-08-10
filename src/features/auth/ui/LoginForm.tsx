import {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useAuth} from '../../../entities/session';
import {useI18n} from '../../../shared/i18n';
import {isValidEmail} from '../../../shared/lib/validation';
import {autofill} from '../../../shared/lib/autofill';
import {useLayout} from '../../../shared/lib/layout';
import {colors, radii} from '../../../shared/config/theme';
import {AppDialog, Button, PasswordField, TextField} from '../../../shared/ui';
import type {RootStackParamList} from '../../../shared/navigation/types';
import {
  loginRequest,
  studentForgotPasswordRequest,
  type LoginRole,
} from '../api/authApi';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LoginForm() {
  const navigation = useNavigation<Nav>();
  const {setSession} = useAuth();
  const {t} = useI18n();
  const {isTablet} = useLayout();

  const roleOptions = useMemo(
    () =>
      [
        {key: 'teacher' as const, emoji: '🧑‍🏫', label: t('auth.loginAsTeacher')},
        {key: 'student' as const, emoji: '🧑‍🎓', label: t('auth.loginAsStudent')},
      ] satisfies {key: LoginRole; emoji: string; label: string}[],
    [t],
  );

  const [role, setRole] = useState<LoginRole | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [responseError, setResponseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [studentForgotView, setStudentForgotView] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotFieldError, setForgotFieldError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

  const canSubmit = useMemo(() => !!role, [role]);

  useEffect(() => {
    if (!role || studentForgotView) {
      return;
    }
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [role, studentForgotView]);

  const switchRole = (next: LoginRole) => {
    setRole(next);
    setResponseError('');
    setForgotError('');
    setStudentForgotView(false);
    setEmailError('');
    setPasswordError('');
  };

  const validateLogin = () => {
    let ok = true;
    if (!login.trim()) {
      setEmailError(t('auth.emailRequired'));
      ok = false;
    } else {
      setEmailError('');
    }
    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      ok = false;
    } else {
      setPasswordError('');
    }
    return ok;
  };

  const onSubmit = async () => {
    if (!role || !validateLogin()) {
      return;
    }

    setLoading(true);
    setResponseError('');
    try {
      const res = await loginRequest({
        login: login.trim(),
        password,
        role,
      });

      if (res.token) {
        await setSession(res);
        return;
      }

      setResponseError(res.message || 'Что-то пошло не так');
    } finally {
      setLoading(false);
    }
  };

  const onForgotSubmit = async () => {
    const email = forgotEmail.trim();
    if (!email) {
      setForgotFieldError(t('auth.emailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setForgotFieldError(t('auth.invalidEmail'));
      return;
    }

    setForgotFieldError('');
    setForgotError('');
    setForgotLoading(true);
    try {
      const res = await studentForgotPasswordRequest(email);
      if (res.success) {
        setForgotEmail('');
        setStudentForgotView(false);
        setNotice(t('auth.studentPasswordSent'));
        return;
      }
      if (res.code === 'STUDENT_NOT_REGISTERED') {
        setForgotError(t('auth.studentNotRegistered'));
        return;
      }
      setForgotError(res.message || 'Что-то пошло не так');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <View>
      <Text style={[styles.title, isTablet && styles.titleTablet]}>
        {t('auth.loginTitle')}
      </Text>

      <View style={[styles.roles, isTablet && styles.rolesTablet]}>
        {roleOptions.map(option => {
          const active = role === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => switchRole(option.key)}
              style={[
                styles.roleCard,
                isTablet && styles.roleCardTablet,
                active && styles.roleCardActive,
              ]}>
              <Text style={[styles.roleEmoji, isTablet && styles.roleEmojiTablet]}>
                {option.emoji}
              </Text>
              <Text
                style={[
                  styles.roleLabel,
                  isTablet && styles.roleLabelTablet,
                  active && styles.roleLabelActive,
                ]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {role === 'teacher' && (
        <View>
          <TextField
            ref={emailInputRef}
            label={t('auth.email')}
            value={login}
            onChangeText={setLogin}
            error={emailError}
            {...autofill.loginUsername}
          />
          <PasswordField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
          />
          <Pressable
            onPress={() => navigation.navigate('RestorePassword')}
            style={styles.linkWrap}>
            <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
          </Pressable>
          <Button
            title={t('common.login')}
            onPress={onSubmit}
            loading={loading}
            disabled={!canSubmit}
          />
          {!!responseError && <Text style={styles.error}>{responseError}</Text>}
          <Pressable
            onPress={() => navigation.navigate('Registration')}
            style={styles.footerLink}>
            <Text style={styles.link}>{t('auth.loginSignUpPrompt')}</Text>
          </Pressable>
        </View>
      )}

      {role === 'student' && !studentForgotView && (
        <View>
          <TextField
            ref={emailInputRef}
            label={t('auth.email')}
            value={login}
            onChangeText={setLogin}
            error={emailError}
            {...autofill.loginUsername}
          />
          <PasswordField
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            error={passwordError}
          />
          <Pressable
            onPress={() => {
              setForgotError('');
              setForgotFieldError('');
              setStudentForgotView(true);
            }}
            style={styles.linkWrap}>
            <Text style={styles.link}>{t('auth.forgotPassword')}</Text>
          </Pressable>
          <Button
            title={t('common.login')}
            onPress={onSubmit}
            loading={loading}
            disabled={!canSubmit}
          />
          {!!responseError && <Text style={styles.error}>{responseError}</Text>}
          <Text style={styles.hint}>{t('auth.studentLoginHint')}</Text>
        </View>
      )}

      {role === 'student' && studentForgotView && (
        <View>
          <Text style={styles.hintTop}>{t('auth.studentForgotHint')}</Text>
          <TextField
            label={t('auth.email')}
            value={forgotEmail}
            onChangeText={setForgotEmail}
            error={forgotFieldError}
            {...autofill.email}
          />
          <Button
            title={t('auth.restorePasswordSubmit')}
            onPress={onForgotSubmit}
            loading={forgotLoading}
          />
          {!!forgotError && <Text style={styles.error}>{forgotError}</Text>}
          <Pressable
            onPress={() => setStudentForgotView(false)}
            style={styles.footerLink}>
            <Text style={styles.link}>{t('auth.backToLogin')}</Text>
          </Pressable>
        </View>
      )}

      <AppDialog
        visible={!!notice}
        message={notice || undefined}
        onClose={() => setNotice(null)}
        actions={[
          {
            label: t('common.back'),
            variant: 'primary',
            onPress: () => setNotice(null),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  titleTablet: {
    fontSize: 28,
    marginBottom: 20,
  },
  roles: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  rolesTablet: {
    gap: 16,
    marginBottom: 28,
  },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  roleCardTablet: {
    paddingVertical: 22,
    paddingHorizontal: 16,
    minHeight: 120,
    justifyContent: 'center',
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  roleEmoji: {
    fontSize: 32,
  },
  roleEmojiTablet: {
    fontSize: 40,
  },
  roleLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleLabelTablet: {
    fontSize: 16,
  },
  roleLabelActive: {
    color: colors.primary,
  },
  linkWrap: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  error: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
  },
  hint: {
    marginTop: 16,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  hintTop: {
    marginBottom: 12,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
});
