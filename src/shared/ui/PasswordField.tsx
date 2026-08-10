import {useState} from 'react';
import {Pressable, StyleSheet, Text, View, type TextInputProps} from 'react-native';

import {colors} from '../config/theme';
import {autofill} from '../lib/autofill';
import {TextField} from './TextField';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  kind?: 'password' | 'newPassword';
};

export function PasswordField({
  label,
  value,
  onChangeText,
  error,
  kind = 'password',
}: Props) {
  const [visible, setVisible] = useState(false);
  const autofillProps =
    kind === 'newPassword' ? autofill.newPassword : autofill.password;

  return (
    <View>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        secureTextEntry={!visible}
        {...(autofillProps as TextInputProps)}
        style={styles.inputWithToggle}
      />
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible(current => !current)}
        style={styles.toggle}>
        <Text style={styles.toggleLabel}>{visible ? 'Скрыть' : 'Показать'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  inputWithToggle: {
    paddingRight: 84,
  },
  toggle: {
    position: 'absolute',
    right: 12,
    top: 34,
  },
  toggleLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
});
