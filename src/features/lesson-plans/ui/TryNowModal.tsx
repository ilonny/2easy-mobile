import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';
import {Button} from '../../../shared/ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
};

export function TryNowModal({visible, onClose, onLogin, onRegister}: Props) {
  const {t} = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{t('lessonPlans.tryNowTitle')}</Text>
          <Text style={styles.text}>{t('lessonPlans.tryNowText')}</Text>
          <Button title={t('auth.registration')} onPress={onRegister} />
          <Pressable onPress={onLogin} style={styles.loginLink}>
            <Text style={styles.link}>{t('common.login')}</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>{t('common.back')}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  close: {
    alignItems: 'center',
    paddingTop: 4,
  },
  closeText: {
    color: colors.muted,
  },
});
