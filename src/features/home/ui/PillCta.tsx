import {Pressable, StyleSheet, Text, View} from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'lime';
};

export function PillCta({title, onPress, variant = 'primary'}: Props) {
  const isPrimary = variant === 'primary';
  const isLime = variant === 'lime';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isLime && styles.lime,
        pressed && styles.pressed,
      ]}>
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.labelDark,
          isLime && styles.labelDark,
        ]}>
        {title}
      </Text>
      <View
        style={[
          styles.arrow,
          isPrimary && styles.arrowPrimary,
          variant === 'secondary' && styles.arrowSecondary,
          isLime && styles.arrowLime,
        ]}>
        <Text
          style={[
            styles.arrowText,
            (variant === 'secondary' || isLime) && styles.arrowTextDark,
          ]}>
          →
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 100,
    paddingLeft: 22,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  primary: {
    backgroundColor: '#3F28C6',
  },
  secondary: {
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  lime: {
    backgroundColor: '#D2FF88',
  },
  pressed: {
    opacity: 0.92,
  },
  label: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    letterSpacing: 1.6,
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelDark: {
    color: '#262626',
  },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPrimary: {
    backgroundColor: '#9A84F0',
  },
  arrowSecondary: {
    backgroundColor: '#FFFFFF',
  },
  arrowLime: {
    backgroundColor: '#FFFFFF',
  },
  arrowText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  arrowTextDark: {
    color: '#262626',
  },
});
