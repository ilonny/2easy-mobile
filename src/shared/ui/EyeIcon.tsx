import {Image, StyleSheet, View} from 'react-native';

type Props = {
  enabled: boolean;
  size?: number;
};

export function EyeIcon({enabled, size = 24}: Props) {
  return (
    <View
      style={[
        styles.wrap,
        {width: size, height: Math.round(size * 0.72)},
      ]}>
      <Image
        source={
          enabled
            ? require('../assets/icons/eye_enable.png')
            : require('../assets/icons/eye_disabled.png')
        }
        style={{width: size, height: Math.round(size * 0.72)}}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
