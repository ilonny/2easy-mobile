import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useI18n} from '../../../shared/i18n';
import {colors, radii} from '../../../shared/config/theme';

type Props = {
  visible: boolean;
  pageX: number;
  pageY: number;
  onPress: () => void;
};

const PILL_W = 200;
const PILL_H = 44;

export function DictionarySelectionPill({
  visible,
  pageX,
  pageY,
  onPress,
}: Props) {
  const {t} = useI18n();

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Pressable
        onPress={onPress}
        style={[
          styles.pill,
          {
            left: Math.max(8, pageX - PILL_W / 2),
            top: pageY + 8,
          },
        ]}>
        <Text style={styles.icon}>📖</Text>
        <Text style={styles.label} numberOfLines={1}>
          {t('dictionary.addToDictionary')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 60,
    elevation: 60,
  },
  pill: {
    position: 'absolute',
    minWidth: PILL_W,
    minHeight: PILL_H,
    maxWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 8,
  },
  icon: {fontSize: 16},
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
