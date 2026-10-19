import type {ReactNode} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {hapticLight} from '../../../../shared/lib/haptics';
import {landing} from './landingTheme';

type Props = {
  title: string;
  onPress: () => void;
  chip?: string;
  trailing?: ReactNode;
  disabled?: boolean;
};

export function LandingButton({
  title,
  onPress,
  chip,
  trailing,
  disabled,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => {
          if (disabled) {
            return;
          }
          hapticLight();
          onPress();
        }}
        style={({pressed}) => [
          styles.button,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <Text style={styles.label}>{title}</Text>
        {trailing}
      </Pressable>
      {chip ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{chip}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignSelf: 'center',
    paddingTop: 10,
  },
  button: {
    minWidth: 200,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: landing.violet,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: landing.white,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  chip: {
    position: 'absolute',
    top: -2,
    right: 12,
    backgroundColor: landing.green,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{rotate: '5.88deg'}],
  },
  chipText: {
    color: landing.black,
    fontSize: 11,
    fontWeight: '700',
  },
});
