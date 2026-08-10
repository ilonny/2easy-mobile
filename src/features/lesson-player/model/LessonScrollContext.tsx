import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';

type StickyPayload = {
  id: string;
  node: ReactNode;
  height: number;
};

type LessonScrollContextValue = {
  scrollY: Animated.Value;
  stickyTop: number;
  setStickyOverlay: (payload: StickyPayload | null) => void;
  stickyOverlay: StickyPayload | null;
};

const LessonScrollContext = createContext<LessonScrollContextValue | null>(
  null,
);

const AnimatedGHScrollView = Animated.createAnimatedComponent(GHScrollView);

export function LessonScrollProvider({
  children,
  stickyTop = 0,
}: {
  children: ReactNode;
  /** Distance from top of this provider where sticky chips pin. */
  stickyTop?: number;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [stickyOverlay, setStickyOverlayState] =
    useState<StickyPayload | null>(null);

  const setStickyOverlay = useCallback((payload: StickyPayload | null) => {
    setStickyOverlayState(prev => {
      if (!payload) {
        return prev ? null : prev;
      }
      if (
        prev &&
        prev.id === payload.id &&
        prev.height === payload.height &&
        prev.node === payload.node
      ) {
        return prev;
      }
      return payload;
    });
  }, []);

  const value = useMemo(
    () => ({scrollY, stickyTop, setStickyOverlay, stickyOverlay}),
    [scrollY, stickyTop, setStickyOverlay, stickyOverlay],
  );

  return (
    <LessonScrollContext.Provider value={value}>
      <View style={styles.flex}>
        {children}
        {stickyOverlay ? (
          <View
            pointerEvents="box-none"
            style={[styles.overlay, {top: stickyTop}]}>
            <View style={styles.overlayInner}>{stickyOverlay.node}</View>
          </View>
        ) : null}
      </View>
    </LessonScrollContext.Provider>
  );
}

export function LessonScrollView({
  children,
  onScroll: onScrollProp,
  ...props
}: ScrollViewProps & {children?: ReactNode}) {
  const {scrollY} = useLessonScroll();
  const onScroll = useMemo(
    () =>
      Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
        useNativeDriver: false,
        listener: onScrollProp,
      }),
    [scrollY, onScrollProp],
  );

  return (
    <AnimatedGHScrollView
      {...props}
      scrollEventThrottle={16}
      onScroll={onScroll}>
      {children}
    </AnimatedGHScrollView>
  );
}

export function useLessonScroll() {
  const ctx = useContext(LessonScrollContext);
  const fallbackScrollY = useRef(new Animated.Value(0)).current;
  if (!ctx) {
    return {
      scrollY: fallbackScrollY,
      stickyTop: 0,
      setStickyOverlay: () => undefined,
      stickyOverlay: null,
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  flex: {flex: 1, overflow: 'visible'},
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 20,
    overflow: 'visible',
  },
  overlayInner: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
});
