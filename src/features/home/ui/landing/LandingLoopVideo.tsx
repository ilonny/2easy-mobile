import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Video, {
  ViewType,
  type OnLoadData,
  type VideoRef,
} from 'react-native-video';

import {useLandingScroll} from './LandingScrollContext';

type Props = {
  /** `require(...mp4)` asset id. */
  source: number;
  poster?: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  playing?: boolean;
  /** Skip poster Image when parent already draws one. */
  showPoster?: boolean;
  /**
   * Skip intersection gating (hero marquee). Still respects reduceMotion.
   */
  eager?: boolean;
};

/**
 * Muted looping clip. Keeps the poster visible until the first decoded
 * frame so Android doesn't flash a black ExoPlayer surface over the card.
 *
 * Once a clip has entered the viewport it stays mounted and only pauses —
 * remounting ExoPlayer mid-scroll collapses content offset on Android.
 *
 * TextureView is required on Android: SurfaceView does not composite inside
 * a parent with a native-driven transform (hero marquee).
 */
export function LandingLoopVideo({
  source,
  poster,
  style,
  playing = true,
  showPoster = true,
  eager = false,
}: Props) {
  const wrapRef = useRef<View>(null);
  const videoRef = useRef<VideoRef>(null);
  const {width: windowWidth} = useWindowDimensions();
  const {viewportHeight, reduceMotion, subscribeScroll} = useLandingScroll();
  const [inView, setInView] = useState(eager);
  const inViewRef = useRef(eager);
  const [mountedOnce, setMountedOnce] = useState(eager);
  const [frameReady, setFrameReady] = useState(false);

  const resolvedSource = useMemo(() => {
    const resolved = Image.resolveAssetSource(source);
    if (!resolved?.uri) {
      // Fallback: let RN-video resolve the asset number itself.
      return source as unknown as {uri: string};
    }
    return {
      uri: resolved.uri,
      ...(Platform.OS === 'android' ? {isLocalAssetFile: true as const} : null),
    };
  }, [source]);

  const measure = useCallback(() => {
    if (eager) {
      return;
    }
    wrapRef.current?.measureInWindow((x, y, w, h) => {
      const verticallyVisible = y + h > 40 && y < viewportHeight - 40;
      const horizontallyVisible = x + w > 24 && x < windowWidth - 24;
      const visible = verticallyVisible && horizontallyVisible;
      if (visible !== inViewRef.current) {
        inViewRef.current = visible;
        setInView(visible);
        if (visible) {
          setMountedOnce(true);
        }
      }
    });
  }, [eager, viewportHeight, windowWidth]);

  useEffect(() => {
    if (eager) {
      inViewRef.current = true;
      setInView(true);
      setMountedOnce(true);
      return;
    }
    measure();
    const id = setInterval(measure, 600);
    const unsub = subscribeScroll(() => measure());
    return () => {
      clearInterval(id);
      unsub();
    };
  }, [eager, measure, subscribeScroll]);

  useEffect(() => {
    setFrameReady(false);
  }, [source]);

  const shouldMount = playing && mountedOnce && !reduceMotion && !!resolvedSource;
  const shouldPlay = shouldMount && (eager || inView);

  const onReady = useCallback((_data?: OnLoadData) => {
    setFrameReady(true);
  }, []);

  return (
    <View
      ref={wrapRef}
      style={[styles.root, style]}
      pointerEvents="none"
      collapsable={false}>
      {showPoster && poster ? (
        <Image source={poster} style={styles.poster} resizeMode="cover" />
      ) : null}
      {shouldMount ? (
        <Video
          ref={videoRef}
          source={resolvedSource as {uri: string}}
          style={[styles.video, !frameReady && styles.videoHidden]}
          resizeMode="cover"
          muted
          repeat
          paused={!shouldPlay}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          disableFocus
          controls={false}
          shutterColor="transparent"
          hideShutterView
          useTextureView
          viewType={ViewType.TEXTURE}
          onLoad={onReady}
          onReadyForDisplay={() => setFrameReady(true)}
          onError={() => {
            // Keep poster visible if decode fails.
            setFrameReady(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  poster: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  video: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  videoHidden: {
    opacity: 0,
  },
});
