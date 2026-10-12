import {Image, StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';

import {colors} from '../config/theme';
import {getImageUrl} from '../../features/lesson-player/lib/getImageUrl';

type Props = {
  name?: string | null;
  avatar?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

function initials(name?: string | null) {
  if (!name?.trim()) {
    return 'A';
  }
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0] || '')
      .join('')
      .toUpperCase() || 'A'
  );
}

export function UserAvatar({name, avatar, size = 48, style}: Props) {
  const uri = avatar ? getImageUrl(avatar) : '';
  const fontSize = Math.max(12, Math.round(size * 0.38));

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}>
      {uri ? (
        <Image source={{uri}} style={styles.image} />
      ) : (
        <Text style={[styles.text, {fontSize}]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: '700',
    color: '#4031C3',
  },
});
