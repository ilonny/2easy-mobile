import {useCallback, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
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
};

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const IMAGE_H = SCREEN_H * 0.82;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.9;

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
}: {
  source: ImageSourcePropType;
  onDismiss: () => void;
  backdropOpacity: Animated.Value;
}) {
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
    const maxX = Math.max(0, ((s - 1) * SCREEN_W) / 2);
    const maxY = Math.max(0, ((s - 1) * IMAGE_H) / 2);
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
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          g.numberActiveTouches >= 2 ||
          scaleValue.current > 1.01 ||
          Math.abs(g.dx) > 2 ||
          Math.abs(g.dy) > 2,
        onPanResponderGrant: evt => {
          dismissing.current = false;
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
            // Single tap on image / letterbox closes when not zoomed.
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

          // Swipe-to-dismiss when not zoomed
          if (scaleValue.current <= 1.01) {
            const vertical =
              Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.1;
            if (!vertical && Math.abs(gesture.dy) < 8) {
              return;
            }
            clearPendingClose();
            dismissing.current = true;
            translateY.setValue(gesture.dy);
            tyValue.current = gesture.dy;
            const progress = Math.min(
              1,
              Math.abs(gesture.dy) / (SCREEN_H * 0.35),
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

          if (scaleValue.current <= 1.01 && dismissing.current) {
            clearPendingClose();
            const shouldClose =
              Math.abs(gesture.dy) > DISMISS_DISTANCE ||
              Math.abs(gesture.vy) > DISMISS_VELOCITY;

            if (shouldClose) {
              const direction = gesture.dy >= 0 ? 1 : -1;
              Animated.parallel([
                Animated.timing(translateY, {
                  toValue: direction * SCREEN_H,
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
        },
        onPanResponderTerminate: () => {
          pinchStartDistance.current = 0;
          clearPendingClose();
          if (scaleValue.current <= 1.01) {
            animateTo(1, 0, 0);
            resetBackdrop();
          }
          dismissing.current = false;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onDismiss, backdropOpacity],
  );

  return (
    <Animated.Image
      {...panResponder.panHandlers}
      source={source}
      style={[
        styles.fullImage,
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
}: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const backdropOpacity = useRef(new Animated.Value(1)).current;

  const openViewer = useCallback(() => {
    backdropOpacity.setValue(1);
    setSession(s => s + 1);
    setOpen(true);
  }, [backdropOpacity]);

  const close = useCallback(() => {
    setOpen(false);
    backdropOpacity.setValue(1);
  }, [backdropOpacity]);

  if (!zoomable) {
    return <Image source={source} style={style} resizeMode={resizeMode} />;
  }

  return (
    <>
      <Pressable
        onPress={openViewer}
        accessibilityRole="imagebutton"
        accessibilityLabel="Zoom image"
        style={({pressed}) => [style as object, pressed && styles.pressed]}>
        <Image source={source} style={styles.fill} resizeMode={resizeMode} />
      </Pressable>

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
            <View
              style={[
                styles.imageSlot,
                {
                  marginTop: insets.top + 12,
                  marginBottom: insets.bottom + 12,
                },
              ]}>
              {open ? (
                <PinchPanImage
                  key={session}
                  source={source}
                  onDismiss={close}
                  backdropOpacity={backdropOpacity}
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
  pressed: {
    opacity: 0.92,
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
    width: SCREEN_W,
    height: IMAGE_H,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: IMAGE_H,
  },
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
});
