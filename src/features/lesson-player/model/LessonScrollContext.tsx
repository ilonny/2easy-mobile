import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {ScrollView as GHScrollView} from 'react-native-gesture-handler';

import {useKeyboardBottomOffset} from '../../../shared/lib/useKeyboardBottomOffset';
import {ChipDragProvider} from '../ui/interaction/ChipDragContext';

type StickyPayload = {
  id: string;
  node: ReactNode;
  height: number;
};

type LessonScrollContextValue = {
  scrollY: Animated.Value;
  /** Current pin offset from the top (updates when header collapses). */
  stickyTop: number;
  /** Pin offset while the collapsing header is fully visible. */
  stickyTopExpanded: number;
  setStickyOverlay: (payload: StickyPayload) => void;
  /** Clears sticky chips only if they still belong to this pool id. */
  releaseStickyOverlay: (id: string) => void;
  stickyOverlay: StickyPayload | null;
};

const LessonScrollContext = createContext<LessonScrollContextValue | null>(
  null,
);

const AnimatedGHScrollView = Animated.createAnimatedComponent(GHScrollView);

export function LessonScrollProvider({
  children,
  stickyTop = 0,
  stickyTopCollapsed,
  /**
   * 0 = header fully visible (pin at stickyTop),
   * 1 = header fully hidden (pin at stickyTopCollapsed).
   * Drive with useNativeDriver: false so `top` can animate.
   */
  headerCollapseProgress,
  onStickyChange,
}: {
  children: ReactNode;
  /** Distance from top where sticky chips pin while header is visible. */
  stickyTop?: number;
  /**
   * Pin offset when the header is fully hidden (usually safe-area inset).
   * Defaults to stickyTop (no collapse).
   */
  stickyTopCollapsed?: number;
  headerCollapseProgress?: Animated.Value;
  /** Fires when sticky chip pool pins/unpins at the top. */
  onStickyChange?: (active: boolean) => void;
}) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [stickyOverlay, setStickyOverlayState] =
    useState<StickyPayload | null>(null);
  const collapsed = stickyTopCollapsed ?? stickyTop;
  const [liveStickyTop, setLiveStickyTop] = useState(stickyTop);

  const setStickyOverlay = useCallback((payload: StickyPayload) => {
    setStickyOverlayState(prev => {
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

  const releaseStickyOverlay = useCallback((overlayId: string) => {
    setStickyOverlayState(prev => (prev?.id === overlayId ? null : prev));
  }, []);

  useEffect(() => {
    onStickyChange?.(!!stickyOverlay);
  }, [stickyOverlay, onStickyChange]);

  useEffect(() => {
    setLiveStickyTop(stickyTop);
  }, [stickyTop]);

  useEffect(() => {
    if (!headerCollapseProgress || stickyTop <= collapsed) {
      return;
    }
    const range = stickyTop - collapsed;
    const listener = headerCollapseProgress.addListener(({value}) => {
      const progress = Math.min(1, Math.max(0, value));
      setLiveStickyTop(stickyTop - progress * range);
    });
    return () => headerCollapseProgress.removeListener(listener);
  }, [headerCollapseProgress, stickyTop, collapsed]);

  const overlayTop =
    headerCollapseProgress && stickyTop > collapsed
      ? headerCollapseProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [stickyTop, collapsed],
          extrapolate: 'clamp',
        })
      : stickyTop;

  const value = useMemo(
    () => ({
      scrollY,
      stickyTop: liveStickyTop,
      stickyTopExpanded: stickyTop,
      setStickyOverlay,
      releaseStickyOverlay,
      stickyOverlay,
    }),
    [
      scrollY,
      liveStickyTop,
      stickyTop,
      setStickyOverlay,
      releaseStickyOverlay,
      stickyOverlay,
    ],
  );

  return (
    <ChipDragProvider>
      <LessonScrollContext.Provider value={value}>
        <View style={styles.flex}>
          {children}
          {stickyOverlay ? (
            <Animated.View
              pointerEvents="box-none"
              style={[styles.overlay, {top: overlayTop}]}>
              <View style={styles.overlayInner}>{stickyOverlay.node}</View>
            </Animated.View>
          ) : null}
        </View>
      </LessonScrollContext.Provider>
    </ChipDragProvider>
  );
}

export function LessonScrollView({
  children,
  onScroll: onScrollProp,
  contentContainerStyle,
  keyboardShouldPersistTaps,
  keyboardDismissMode,
  ...props
}: ScrollViewProps & {children?: ReactNode}) {
  const {scrollY} = useLessonScroll();
  const keyboardHeight = useKeyboardBottomOffset();
  const onScroll = useMemo(
    () =>
      Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {
        useNativeDriver: false,
        listener: onScrollProp,
      }),
    [scrollY, onScrollProp],
  );

  const extraBottom =
    keyboardHeight > 0
      ? Platform.OS === 'android'
        ? keyboardHeight
        : 24
      : 0;
  const flatContent = StyleSheet.flatten(contentContainerStyle) as
    | ViewStyle
    | undefined;
  const basePaddingBottom =
    typeof flatContent?.paddingBottom === 'number'
      ? flatContent.paddingBottom
      : 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AnimatedGHScrollView
        {...props}
        contentContainerStyle={
          [
            contentContainerStyle,
            extraBottom ? {paddingBottom: basePaddingBottom + extraBottom} : null,
          ] as StyleProp<ViewStyle>
        }
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ?? 'handled'}
        keyboardDismissMode={keyboardDismissMode ?? 'interactive'}
        scrollEventThrottle={16}
        onScroll={onScroll}>
        {children}
      </AnimatedGHScrollView>
    </KeyboardAvoidingView>
  );
}

export function useLessonScroll() {
  const ctx = useContext(LessonScrollContext);
  const fallbackScrollY = useRef(new Animated.Value(0)).current;
  if (!ctx) {
    return {
      scrollY: fallbackScrollY,
      stickyTop: 0,
      stickyTopExpanded: 0,
      setStickyOverlay: () => undefined,
      releaseStickyOverlay: () => undefined,
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
    zIndex: 80,
    elevation: 16,
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
