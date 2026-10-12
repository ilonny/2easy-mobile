import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {AccessibilityInfo, useWindowDimensions} from 'react-native';

type ScrollListener = (y: number) => void;

type LandingScrollContextValue = {
  viewportHeight: number;
  reduceMotion: boolean;
  /** Ref-backed — does not re-render consumers on every scroll tick. */
  getScrollY: () => number;
  setScrollY: (y: number) => void;
  subscribeScroll: (listener: ScrollListener) => () => void;
};

const LandingScrollContext = createContext<LandingScrollContextValue | null>(
  null,
);

export function LandingScrollProvider({children}: PropsWithChildren) {
  const {height} = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  const scrollYRef = useRef(0);
  const listenersRef = useRef(new Set<ScrollListener>());

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  const getScrollY = useCallback(() => scrollYRef.current, []);

  const setScrollY = useCallback((y: number) => {
    scrollYRef.current = y;
    listenersRef.current.forEach(listener => listener(y));
  }, []);

  const subscribeScroll = useCallback((listener: ScrollListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({
      viewportHeight: height,
      reduceMotion,
      getScrollY,
      setScrollY,
      subscribeScroll,
    }),
    [height, reduceMotion, getScrollY, setScrollY, subscribeScroll],
  );

  return (
    <LandingScrollContext.Provider value={value}>
      {children}
    </LandingScrollContext.Provider>
  );
}

export function useLandingScroll() {
  const ctx = useContext(LandingScrollContext);
  if (!ctx) {
    return {
      viewportHeight: 800,
      reduceMotion: false,
      getScrollY: () => 0,
      setScrollY: () => {},
      subscribeScroll: () => () => {},
    };
  }
  return ctx;
}
