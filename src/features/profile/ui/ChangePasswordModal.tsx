import {useCallback, useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {postJson} from '../../../shared/api';
import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {Button, PasswordField} from '../../../shared/ui';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ChangePasswordModal({visible, onClose}: Props) {
  const {t} = useI18n();
  const keyboardHeight = useKeyboardBottomOffset(visible);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setOldPassword('');
    setNewPassword('');
    setRepeatPassword('');
    setError('');
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    setError('');
    if (!oldPassword) {
      setError(t('auth.enterOldPassword'));
      return;
    }
    if (!newPassword) {
      setError(t('auth.enterNewPassword'));
      return;
    }
    if (newPassword !== repeatPassword) {
      setError(t('auth.passwordsMustMatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await postJson<{ok?: boolean; message?: string}>({
        path: '/change-password',
        isSecure: true,
        data: {
          old_password: oldPassword,
          new_password: newPassword,
          new_password_repeat: repeatPassword,
        },
      });
      if (res.ok) {
        close();
        return;
      }
      setError(res.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        style={[styles.backdrop, {paddingBottom: keyboardHeight}]}
        onPress={close}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{t('profile.changePassword')}</Text>
          <PasswordField
            label={t('auth.oldPassword')}
            value={oldPassword}
            onChangeText={setOldPassword}
          />
          <PasswordField
            label={t('auth.newPassword')}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <PasswordField
            label={t('auth.repeatNewPassword')}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button
            title={t('auth.confirm')}
            onPress={onSubmit}
            loading={loading}
          />
          <Pressable onPress={close} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('common.back')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.modalBackdrop,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    marginBottom: 12,
    fontSize: 13,
  },
  cancel: {
    marginTop: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '600',
  },
});
