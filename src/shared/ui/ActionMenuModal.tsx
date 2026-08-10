import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../config/theme';
import {fontFamily} from '../config/fonts';

export type ActionMenuItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  items: ActionMenuItem[];
  cancelLabel: string;
  onClose: () => void;
};

export function ActionMenuModal({
  visible,
  title,
  items,
  cancelLabel,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          <View style={styles.list}>
            {items.map((item, index) => (
              <Pressable
                key={`${item.label}-${index}`}
                onPress={() => {
                  onClose();
                  // Defer so modal can close before opening another.
                  requestAnimationFrame(() => item.onPress());
                }}
                style={({pressed}) => [
                  styles.item,
                  index < items.length - 1 && styles.itemBorder,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.itemLabel,
                    item.destructive && styles.itemDestructive,
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({pressed}) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelLabel}>{cancelLabel}</Text>
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
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    paddingTop: 8,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  itemLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  itemDestructive: {
    color: colors.danger,
  },
  cancel: {
    marginTop: 8,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: radii.sm,
    backgroundColor: '#F2F2F2',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pressed: {
    opacity: 0.88,
  },
});
