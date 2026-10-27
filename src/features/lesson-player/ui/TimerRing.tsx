import {StyleSheet, Text, View} from 'react-native';

import {colors} from '../../../shared/config/theme';

type Props = {
  progress: number;
  label: string;
  size?: number;
  pulse?: boolean;
  active?: boolean;
};

export function TimerRing({
  label,
  size = 44,
  pulse,
  active,
}: Props) {
  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pulse ? 0.6 : 1,
          borderColor: active || pulse ? colors.primary : colors.primarySoft,
          backgroundColor: colors.primarySoft,
        },
      ]}>
      <Text
        style={[styles.label, {fontSize: size < 50 ? 10 : 18}]}
        numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  label: {
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
