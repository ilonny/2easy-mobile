import {useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import {colors, radii} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {ZoomableImage} from '../../../shared/ui/ZoomableImage';
import {getImageUrl} from '../lib/getImageUrl';
import type {ExAttachment} from '../model/types';

type Props = {
  images?: ExAttachment[];
  viewType?: string;
};

function resolveUri(img: ExAttachment): string {
  const raw = img.dataURL || img.path || '';
  if (!raw) {
    return '';
  }
  if (/\.svg(?:\?|#|$)/i.test(raw) || raw.includes('/_next/static/')) {
    return '';
  }
  if (raw.startsWith('about:')) {
    return '';
  }
  if (
    /^https?:\/\//i.test(raw) ||
    /^file:\/\//i.test(raw) ||
    raw.startsWith('content://') ||
    raw.startsWith('ph://') ||
    raw.startsWith('assets-library://') ||
    raw.startsWith('data:')
  ) {
    return raw;
  }
  return getImageUrl(raw);
}

export function ImageGallery({images = [], viewType = 'carousel'}: Props) {
  const {isTablet} = useLayout();
  const [carouselW, setCarouselW] = useState(0);
  const imageH = isTablet ? 340 : 280;

  const items = useMemo(
    () =>
      images
        .map((img, i) => ({uri: resolveUri(img), text: img.text, key: i}))
        .filter(item => !!item.uri),
    [images],
  );

  const gallerySources = useMemo(
    () => items.map(item => ({uri: item.uri})),
    [items],
  );

  if (!items.length) {
    return <View style={[styles.placeholder, {height: isTablet ? 220 : 180}]} />;
  }

  const isCarousel = viewType === 'carousel' || !viewType;
  const cols = viewType === '3-col' ? 3 : viewType === '2-col' ? 2 : 1;

  return (
    <View
      style={styles.root}
      collapsable={false}
      onLayout={e => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w > 0 && w !== carouselW) {
          setCarouselW(w);
        }
      }}>
      {isCarousel && items.length >= 2 ? (
        carouselW > 0 ? (
          <FlatList
            style={{width: carouselW}}
            data={items}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `${item.uri}-${i}`}
            getItemLayout={(_, index) => ({
              length: carouselW,
              offset: carouselW * index,
              index,
            })}
            renderItem={({item, index}) => (
              <View style={{width: carouselW}}>
                <ZoomableImage
                  source={{uri: item.uri}}
                  gallerySources={gallerySources}
                  galleryIndex={index}
                  style={[styles.carouselImg, {height: imageH}]}
                  resizeMode="contain"
                />
                {!!item.text && <Text style={styles.caption}>{item.text}</Text>}
              </View>
            )}
          />
        ) : (
          <View style={{height: imageH}} />
        )
      ) : isCarousel && items.length === 1 ? (
        <View>
          <ZoomableImage
            source={{uri: items[0].uri}}
            style={[styles.single, {height: imageH}]}
            resizeMode="contain"
          />
          {!!items[0].text && (
            <Text style={styles.caption}>{items[0].text}</Text>
          )}
        </View>
      ) : (
        <View style={[styles.grid, cols === 3 && styles.grid3]}>
          {items.map((item, i) => (
            <View
              key={`${item.uri}-${i}`}
              style={[styles.gridItem, {width: `${100 / cols - 2}%` as never}]}>
              <ZoomableImage
                source={{uri: item.uri}}
                gallerySources={gallerySources}
                galleryIndex={i}
                style={styles.gridImg}
                resizeMode="cover"
              />
              {!!item.text && <Text style={styles.caption}>{item.text}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 0,
    elevation: 0,
    overflow: 'visible',
  },
  placeholder: {
    height: 180,
    borderRadius: radii.lg,
    backgroundColor: '#D9D9D9',
  },
  carouselImg: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  single: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  caption: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  grid3: {},
  gridItem: {
    marginBottom: 8,
  },
  gridImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
});
