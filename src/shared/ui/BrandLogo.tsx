import {Image, StyleSheet, type ImageStyle, type StyleProp} from 'react-native';

type Props = {
  /** Em-based site scale: ~28–43px → width ≈ 3.47 × height. */
  height?: number;
  style?: StyleProp<ImageStyle>;
};

/** Redesign wordmark (site `public/logo.svg`), dark #11181C. */
export function BrandLogo({height = 34, style}: Props) {
  const width = Math.round(height * (889 / 315));
  return (
    <Image
      source={require('../assets/logo-wordmark.png')}
      style={[{width, height}, styles.img, style]}
      resizeMode="contain"
      accessibilityLabel="2easy"
    />
  );
}

const styles = StyleSheet.create({
  img: {
    // Keep transparent background over landing hero.
  },
});
