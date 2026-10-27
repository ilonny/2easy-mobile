import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors} from '../../../shared/config/theme';

type Props = {
  active?: boolean;
  onPress: () => void;
};

export function SyncWithStudentsButton({active = false, onPress}: Props) {
  const {t} = useI18n();
  const label = t(
    active ? 'lessons.syncMedia.tooltipOn' : 'lessons.syncMedia.tooltip',
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: active}}
      onPress={onPress}
      hitSlop={8}
      style={({pressed}) => [
        styles.btn,
        active ? styles.btnOn : styles.btnOff,
        pressed && styles.pressed,
      ]}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>▶</Text>
        <Text style={styles.waves}>))) </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  btnOff: {
    backgroundColor: colors.primary,
  },
  btnOn: {
    backgroundColor: '#FF4FA3',
  },
  pressed: {opacity: 0.88, transform: [{scale: 0.96}]},
  iconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  icon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 2,
  },
  waves: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -1,
  },
});
