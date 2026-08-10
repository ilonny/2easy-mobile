import {useCallback, useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {colors, radii} from '../../../shared/config/theme';
import type {ExAttachment} from '../model/types';

type Props = {
  images?: ExAttachment[];
  viewType?: string;
};

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

export function ImageGallery({images = [], viewType = 'carousel'}: Props) {
  const insets = useSafeAreaInsets();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const uris = images
    .map(img => img.dataURL || img.path || '')
    .filter(
      uri =>
        !!uri &&
        /^https?:\/\//i.test(uri) &&
        !/\.svg(?:\?|#|$)/i.test(uri) &&
        !uri.includes('/_next/static/') &&
        !uri.startsWith('about:'),
    );

  const openAt = useCallback((i: number) => {
    setIndex(i);
    setViewerOpen(true);
  }, []);

  const onViewerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) {
      setIndex(i);
    }
  };

  if (!uris.length) {
    return <View style={styles.placeholder} />;
  }

  const isCarousel = viewType === 'carousel' || !viewType;
  const cols = viewType === '3-col' ? 3 : viewType === '2-col' ? 2 : 1;

  return (
    <>
      {isCarousel && uris.length >= 2 ? (
        <FlatList
          data={uris}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          renderItem={({item, index: i}) => (
            <Pressable
              style={{width: SCREEN_W - 48}}
              onPress={() => openAt(i)}>
              <Image source={{uri: item}} style={styles.carouselImg} resizeMode="contain" />
              {!!images[i]?.text && (
                <Text style={styles.caption}>{images[i].text}</Text>
              )}
            </Pressable>
          )}
        />
      ) : isCarousel && uris.length === 1 ? (
        <Pressable onPress={() => openAt(0)}>
          <Image
            source={{uri: uris[0]}}
            style={styles.single}
            resizeMode="contain"
          />
          {!!images[0]?.text && (
            <Text style={styles.caption}>{images[0].text}</Text>
          )}
        </Pressable>
      ) : (
        <View style={[styles.grid, cols === 3 && styles.grid3]}>
          {uris.map((uri, i) => (
            <Pressable
              key={`${uri}-${i}`}
              style={[styles.gridItem, {width: `${100 / cols - 2}%` as never}]}
              onPress={() => openAt(i)}>
              <Image source={{uri}} style={styles.gridImg} resizeMode="cover" />
              {!!images[i]?.text && (
                <Text style={styles.caption}>{images[i].text}</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}>
        <View style={styles.viewer}>
          <Pressable
            style={[styles.close, {top: insets.top + 8}]}
            onPress={() => setViewerOpen(false)}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <FlatList
            ref={listRef}
            data={uris}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({
              length: SCREEN_W,
              offset: SCREEN_W * i,
              index: i,
            })}
            onScroll={onViewerScroll}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => `viewer-${uri}-${i}`}
            renderItem={({item}) => (
              <View style={{width: SCREEN_W, height: SCREEN_H}}>
                <Image
                  source={{uri: item}}
                  style={styles.viewerImg}
                  resizeMode="contain"
                />
              </View>
            )}
          />
          {uris.length > 1 ? (
            <Text style={[styles.counter, {bottom: insets.bottom + 16}]}>
              {index + 1} / {uris.length}
            </Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  },
  single: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
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
  },
  viewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  close: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {color: '#fff', fontSize: 18, fontWeight: '700'},
  viewerImg: {
    width: SCREEN_W,
    height: SCREEN_H * 0.82,
    alignSelf: 'center',
    marginTop: SCREEN_H * 0.08,
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#fff',
    fontWeight: '700',
  },
});
