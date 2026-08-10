import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {colors, radii} from '../config/theme';

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: ReactNode;
  error?: string;
};

export function Checkbox({checked, onChange, label, error}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{checked}}
        onPress={() => onChange(!checked)}
        style={styles.row}>
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Text style={styles.mark}>✓</Text> : null}
        </View>
        <View style={styles.label}>{label}</View>
      </Pressable>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: colors.white,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  label: {
    flex: 1,
  },
  error: {
    marginTop: 6,
    marginLeft: 32,
    color: colors.danger,
    fontSize: 12,
  },
});
