import {forwardRef} from 'react';
import {StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';

import {colors, radii} from '../config/theme';
import {useLayout} from '../lib/layout';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  {label, error, style, ...rest},
  ref,
) {
  const {isTablet} = useLayout();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, isTablet && styles.labelTablet]}>{label}</Text>
      <TextInput
        ref={ref}
        {...rest}
        importantForAutofill={rest.importantForAutofill ?? 'yes'}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          isTablet && styles.inputTablet,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  labelTablet: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBg,
    borderRadius: radii.sm,
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputTablet: {
    minHeight: 52,
    fontSize: 17,
    paddingHorizontal: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontSize: 12,
  },
});
