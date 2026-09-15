import {useEffect, useState} from 'react';
import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';

import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {isSvgUri, uriFromSource} from '../../../shared/lib/mediaUri';
import {ZoomableImage} from '../../../shared/ui';

type Props = {
  source: ImageSourcePropType;
};

export function LessonCover({source}: Props) {
  const {height: screenH} = useWindowDimensions();
  const {isTablet} = useLayout();
  const [boxW, setBoxW] = useState(0);
  const [ratio, setRatio] = useState(16 / 9);

  const uri = uriFromSource(source);

  useEffect(() => {
    if (!uri || isSvgUri(uri)) {
      return;
    }
    Image.getSize(
      uri,
      (w, h) => {
        if (w > 0 && h > 0) {
          setRatio(w / h);
        }
      },
      () => undefined,
    );
  }, [uri]);

  const maxH = Math.round(screenH * (isTablet ? 0.48 : 0.42));
  const minH = isTablet ? 180 : 140;
  const height =
    boxW > 0
      ? Math.min(maxH, Math.max(minH, Math.round(boxW / ratio)))
      : isTablet
        ? 240
        : 200;

  return (
    <View
      style={styles.wrap}
      onLayout={e => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== boxW) {
          setBoxW(w);
        }
      }}>
      <ZoomableImage
        source={source}
        style={[styles.image, {height}]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {width: '100%'},
  image: {
    width: '100%',
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
});
