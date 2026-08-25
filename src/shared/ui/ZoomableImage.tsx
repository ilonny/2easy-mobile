import {useCallback, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageResizeMode,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  /** When false, renders a plain Image (no zoom). Default true. */
  zoomable?: boolean;
  /**
   * Other images in the same gallery. When set (length > 1), the viewer
   * can be swiped horizontally between images.
   */
  gallerySources?: ImageSourcePropType[];
  /** Index of `source` inside `gallerySources` (default 0). */
  galleryIndex?: number;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;
const PAGE_SWIPE_DISTANCE = 64;
const PAGE_SWIPE_VELOCITY = 0.55;

function distance(
  a: {pageX: number; pageY: number},
  b: {pageX: number; pageY: number},
) {
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.sqrt(dx * dx + dy * dy);
}

function PinchPanImage({
  source,
  onDismiss,
  backdropOpacity,
  screenW,
  screenH,
  canSwipePage = false,
  onSwipePage,
}: {
  source: ImageSourcePropType;
  onDismiss: () => void;
  backdropOpacity: Animated.Value;
  screenW: number;
  screenH: number;
  canSwipePage?: boolean;
  onSwipePage?: (dir: 1 | -1) => void;
}) {
  const imageH = screenH * 0.82;
  const dimsRef = useRef({screenW, screenH, imageH});
  dimsRef.current = {screenW, screenH, imageH};

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleValue = useRef(1);
  const txValue = useRef(0);
  const tyValue = useRef(0);

  const pinchStartScale = useRef(1);
  const pinchStartDistance = useRef(0);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const lastTap = useRef(0);
  const dismissing = useRef(false);
  const paging = useRef(false);
  const moved = useRef(false);
  const pendingClose = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingClose = () => {
    if (pendingClose.current) {
      clearTimeout(pendingClose.current);
      pendingClose.current = null;
    }
  };

  const clampScale = (value: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  const clampTranslate = (s: number, x: number, y: number) => {
    const {screenW: w, imageH: h} = dimsRef.current;
    const maxX = Math.max(0, ((s - 1) * w) / 2);
    const maxY = Math.max(0, ((s - 1) * h) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const applyTransform = (s: number, x: number, y: number) => {
    const clamped = clampTranslate(s, x, y);
    scaleValue.current = s;
    txValue.current = clamped.x;
    tyValue.current = clamped.y;
    scale.setValue(s);
    translateX.setValue(clamped.x);
    translateY.setValue(clamped.y);
  };

  const animateTo = (s: number, x: number, y: number) => {
    const clamped = clampTranslate(s, x, y);
    scaleValue.current = s;
    txValue.current = clamped.x;
    tyValue.current = clamped.y;
    Animated.parallel([
      Animated.timing(scale, {
        toValue: s,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: clamped.x,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: clamped.y,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetBackdrop = () => {
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Claim early so pinch isn't stolen by parent scroll views.
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          g.numberActiveTouches >= 2 ||
          scaleValue.current > 1.01 ||
          Math.abs(g.dx) > 2 ||
          Math.abs(g.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: evt => {
          dismissing.current = false;
          paging.current = false;
          moved.current = false;
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            clearPendingClose();
            pinchStartDistance.current = distance(touches[0], touches[1]);
            pinchStartScale.current = scaleValue.current;
            return;
          }

          panStartX.current = txValue.current;
          panStartY.current = tyValue.current;

          const now = Date.now();
          if (now - lastTap.current < 280) {
            clearPendingClose();
            if (scaleValue.current > 1.05) {
              animateTo(1, 0, 0);
              resetBackdrop();
            } else {
              animateTo(2.5, 0, 0);
            }
            lastTap.current = 0;
          } else {
            lastTap.current = now;
            if (scaleValue.current <= 1.01) {
              clearPendingClose();
              pendingClose.current = setTimeout(() => {
                pendingClose.current = null;
                onDismiss();
              }, 260);
            }
          }
        },
        onPanResponderMove: (evt, gesture) => {
          const touches = evt.nativeEvent.touches;
          if (
            Math.abs(gesture.dx) > 6 ||
            Math.abs(gesture.dy) > 6 ||
            touches.length >= 2
          ) {
            moved.current = true;
            clearPendingClose();
          }

          if (touches.length >= 2) {
            dismissing.current = false;
            paging.current = false;
            const d = distance(touches[0], touches[1]);
            if (pinchStartDistance.current <= 0) {
              pinchStartDistance.current = d;
              pinchStartScale.current = scaleValue.current;
            } else {
              const next = clampScale(
                pinchStartScale.current * (d / pinchStartDistance.current),
              );
              applyTransform(next, txValue.current, tyValue.current);
              backdropOpacity.setValue(1);
            }
            return;
          }

          if (pinchStartDistance.current > 0) {
            pinchStartDistance.current = 0;
            panStartX.current = txValue.current - gesture.dx;
            panStartY.current = tyValue.current - gesture.dy;
          }

          // Idle (not zoomed): horizontal → page swipe, vertical → dismiss.
          if (scaleValue.current <= 1.01) {
            const absX = Math.abs(gesture.dx);
            const absY = Math.abs(gesture.dy);
            const horizontal = absX > absY * 1.05 && absX > 8;
            const vertical = absY > absX * 1.1 && absY > 8;

            if (canSwipePage && (paging.current || (horizontal && !vertical))) {
              paging.current = true;
              dismissing.current = false;
              translateX.setValue(gesture.dx);
              txValue.current = gesture.dx;
              backdropOpacity.setValue(
                1 - Math.min(0.35, absX / (dimsRef.current.screenW * 1.4)),
              );
              return;
            }

            if (!vertical && absY < 8) {
              return;
            }
            paging.current = false;
            clearPendingClose();
            dismissing.current = true;
            translateY.setValue(gesture.dy);
            tyValue.current = gesture.dy;
            const progress = Math.min(
              1,
              absY / (dimsRef.current.screenH * 0.35),
            );
            backdropOpacity.setValue(1 - progress * 0.75);
            return;
          }

          applyTransform(
            scaleValue.current,
            panStartX.current + gesture.dx,
            panStartY.current + gesture.dy,
          );
        },
        onPanResponderRelease: (_, gesture) => {
          pinchStartDistance.current = 0;

          if (scaleValue.current <= 1.01 && paging.current && canSwipePage) {
            clearPendingClose();
            const shouldPage =
              Math.abs(gesture.dx) > PAGE_SWIPE_DISTANCE ||
              Math.abs(gesture.vx) > PAGE_SWIPE_VELOCITY;
            if (shouldPage) {
              const dir: 1 | -1 = gesture.dx < 0 ? 1 : -1;
              const outX = dir * dimsRef.current.screenW;
              Animated.parallel([
                Animated.timing(translateX, {
                  toValue: -outX,
                  duration: 160,
                  useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                  toValue: 1,
                  duration: 160,
                  useNativeDriver: true,
                }),
              ]).start(({finished}) => {
                if (finished) {
                  onSwipePage?.(dir);
                }
              });
              paging.current = false;
              return;
            }
            animateTo(1, 0, 0);
            resetBackdrop();
            paging.current = false;
            return;
          }

          if (scaleValue.current <= 1.01 && dismissing.current) {
            clearPendingClose();
            const shouldClose =
              Math.abs(gesture.dy) > DISMISS_DISTANCE ||
              Math.abs(gesture.vy) > DISMISS_VELOCITY;

            if (shouldClose) {
              const direction = gesture.dy >= 0 ? 1 : -1;
              Animated.parallel([
                Animated.timing(translateY, {
                  toValue: direction * dimsRef.current.screenH,
                  duration: 180,
                  useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                  toValue: 0,
                  duration: 180,
                  useNativeDriver: true,
                }),
              ]).start(({finished}) => {
                if (finished) {
                  onDismiss();
                }
              });
              return;
            }

            animateTo(1, 0, 0);
            resetBackdrop();
            dismissing.current = false;
            return;
          }

          if (moved.current) {
            clearPendingClose();
          }

          if (scaleValue.current < 1.05) {
            animateTo(1, 0, 0);
            resetBackdrop();
          }
          dismissing.current = false;
          paging.current = false;
        },
        onPanResponderTerminate: () => {
          pinchStartDistance.current = 0;
          clearPendingClose();
          if (scaleValue.current <= 1.01) {
            animateTo(1, 0, 0);
            resetBackdrop();
          }
          dismissing.current = false;
          paging.current = false;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDismiss, backdropOpacity, canSwipePage, onSwipePage],
  );

  return (
    <Animated.Image
      {...panResponder.panHandlers}
      source={source}
      style={[
        styles.fullImage,
        {width: screenW, height: imageH},
        {
          transform: [{translateX}, {translateY}, {scale}],
        },
      ]}
      resizeMode="contain"
    />
  );
}

export function ZoomableImage({
  source,
  style,
  resizeMode = 'cover',
  zoomable = true,
  gallerySources,
  galleryIndex = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const {width: screenW, height: screenH} = useWindowDimensions();
  const imageH = screenH * 0.82;
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [pageIndex, setPageIndex] = useState(galleryIndex);
  const backdropOpacity = useRef(new Animated.Value(1)).current;

  const pages = useMemo(() => {
    if (gallerySources && gallerySources.length > 1) {
      return gallerySources;
    }
    return [source];
  }, [gallerySources, source]);

  const multi = pages.length > 1;
  const activeSource = pages[pageIndex] ?? source;

  const openViewer = useCallback(() => {
    backdropOpacity.setValue(1);
    setPageIndex(
      Math.max(0, Math.min(galleryIndex, Math.max(0, pages.length - 1))),
    );
    setSession(s => s + 1);
    setOpen(true);
  }, [backdropOpacity, galleryIndex, pages.length]);

  const close = useCallback(() => {
    setOpen(false);
    backdropOpacity.setValue(1);
  }, [backdropOpacity]);

  const onSwipePage = useCallback(
    (dir: 1 | -1) => {
      setPageIndex(prev => {
        const next = prev + dir;
        if (next < 0 || next >= pages.length) {
          // Bounce back: remount to reset transform.
          setSession(s => s + 1);
          backdropOpacity.setValue(1);
          return prev;
        }
        setSession(s => s + 1);
        backdropOpacity.setValue(1);
        return next;
      });
    },
    [backdropOpacity, pages.length],
  );

  if (!zoomable) {
    return <Image source={source} style={style} resizeMode={resizeMode} />;
  }

  return (
    <>
      <TouchableOpacity
        onPress={openViewer}
        delayPressIn={50}
        activeOpacity={0.92}
        accessibilityRole="imagebutton"
        accessibilityLabel="Zoom image"
        style={style as object}>
        <Image source={source} style={styles.fill} resizeMode={resizeMode} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
        statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents="none"
            style={[styles.backdropFill, {opacity: backdropOpacity}]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="Close"
          />
          <View style={styles.stage} pointerEvents="box-none">
            <Pressable
              onPress={close}
              hitSlop={12}
              style={[styles.closeBtn, {top: insets.top + 12}]}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            {multi ? (
              <Text
                style={[styles.counter, {top: insets.top + 20}]}
                pointerEvents="none">
                {pageIndex + 1} / {pages.length}
              </Text>
            ) : null}
            <View
              style={[
                styles.imageSlot,
                {
                  width: screenW,
                  height: imageH,
                  marginTop: insets.top + 12,
                  marginBottom: insets.bottom + 12,
                },
              ]}>
              {open ? (
                <PinchPanImage
                  key={session}
                  source={activeSource}
                  onDismiss={close}
                  backdropOpacity={backdropOpacity}
                  screenW={screenW}
                  screenH={screenH}
                  canSwipePage={multi}
                  onSwipePage={onSwipePage}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
  },
  backdropFill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  stage: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageSlot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {},
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 2,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
});
