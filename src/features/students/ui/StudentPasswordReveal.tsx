import {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {AppDialog} from '../../../shared/ui';
import {fetchStudentPassword} from '../api/studentsApi';

const AUTO_HIDE_MS = 10_000;

type Props = {
  studentId: number;
};

export function StudentPasswordReveal({studentId}: Props) {
  const {t} = useI18n();
  const [password, setPassword] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const revealPassword = useCallback(() => {
    clearHideTimer();
    setRevealed(true);
    hideTimerRef.current = setTimeout(() => {
      setRevealed(false);
      hideTimerRef.current = null;
    }, AUTO_HIDE_MS);
  }, [clearHideTimer]);

  const hidePassword = useCallback(() => {
    clearHideTimer();
    setRevealed(false);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  const loadPassword = async () => {
    if (password) {
      revealPassword();
      return;
    }
    setLoading(true);
    try {
      const res = await fetchStudentPassword(studentId);
      if (!res.password) {
        setNotice(res.message || t('students.passwordNotFound'));
        return;
      }
      setPassword(res.password);
      revealPassword();
    } catch {
      setNotice(t('students.passwordNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = async () => {
    if (!password) {
      return;
    }
    try {
      if (typeof Clipboard?.setString === 'function') {
        Clipboard.setString(password);
        setNotice(t('students.passwordCopied'));
        return;
      }
      await Share.share({message: password});
      setNotice(t('students.passwordCopied'));
    } catch {
      try {
        await Share.share({message: password});
        setNotice(t('students.passwordCopied'));
      } catch {
        // user dismissed share sheet
      }
    }
  };

  if (!password) {
    return (
      <>
        <Pressable
          onPress={e => {
            e.stopPropagation?.();
            void loadPassword();
          }}
          hitSlop={6}
          style={styles.linkBtn}
          accessibilityHint={t('students.showPasswordHint')}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={styles.linkText}>{t('students.showPassword')}</Text>
          )}
        </Pressable>
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
      </>
    );
  }

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.password}>
          {revealed ? password : '••••••••••'}
        </Text>
        <Pressable
          onPress={() => (revealed ? hidePassword() : revealPassword())}
          hitSlop={6}>
          <Text style={styles.linkText}>
            {revealed ? t('students.hidePassword') : t('students.showPassword')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void copyPassword()}
          hitSlop={6}
          style={styles.copyBtn}>
          <Text style={styles.copyIcon}>⧉</Text>
        </Pressable>
      </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  linkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  password: {
    fontFamily: 'Menlo',
    fontSize: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    overflow: 'hidden',
    color: colors.text,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIcon: {
    fontSize: 14,
    color: colors.text,
  },
});
