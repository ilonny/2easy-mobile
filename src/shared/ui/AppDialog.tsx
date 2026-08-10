import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../config/theme';
import {fontFamily} from '../config/fonts';
import {Button} from './Button';

export type AppDialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  actions?: AppDialogAction[];
  /** Close when tapping the dimmed backdrop. Default true. */
  closeOnBackdrop?: boolean;
};

export function AppDialog({
  visible,
  title,
  message,
  onClose,
  actions = [],
  closeOnBackdrop = true,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={closeOnBackdrop ? onClose : undefined}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}

          {actions.length ? (
            <View style={styles.actions}>
              {actions.map((action, index) => {
                if (action.variant === 'ghost') {
                  return (
                    <Pressable
                      key={`${action.label}-${index}`}
                      onPress={action.onPress}
                      style={styles.ghostBtn}>
                      <Text style={styles.ghostText}>{action.label}</Text>
                    </Pressable>
                  );
                }

                if (action.variant === 'danger') {
                  return (
                    <Pressable
                      key={`${action.label}-${index}`}
                      onPress={action.onPress}
                      disabled={action.loading}
                      style={({pressed}) => [
                        styles.dangerBtn,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.dangerText}>{action.label}</Text>
                    </Pressable>
                  );
                }

                return (
                  <Button
                    key={`${action.label}-${index}`}
                    title={action.label}
                    onPress={action.onPress}
                    loading={action.loading}
                    variant={
                      action.variant === 'secondary' ? 'secondary' : 'primary'
                    }
                  />
                );
              })}
            </View>
          ) : null}
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
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  actions: {
    gap: 10,
    marginTop: 8,
  },
  dangerBtn: {
    borderRadius: radii.sm,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FCEAEA',
    borderWidth: 1,
    borderColor: '#F0C9C9',
  },
  dangerText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontFamily.bold,
  },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: fontFamily.semiBold,
  },
  pressed: {
    opacity: 0.9,
  },
});
