import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonScroll} from '../../model/LessonScrollContext';
import {useChipDrag} from './ChipDragContext';

type Props = {
  children: ReactNode;
  /**
   * Root of the exercise that owns this pool. When its bottom scrolls
   * above the pin line, sticky chips are released (site CSS sticky parity).
   */
  scopeRef?: RefObject<View | null>;
};

/**
 * Keeps the chip pool pinned to the top of the lesson ScrollView once
 * the user scrolls past its original position, and hides it again once
 * the owning exercise has fully scrolled away.
 */
export function StickyChipPool({children, scopeRef}: Props) {
  const id = useId();
  const {
    scrollY,
    stickyTop,
    stickyTopExpanded,
    setStickyOverlay,
    releaseStickyOverlay,
  } = useLessonScroll();
  const {isDragging} = useChipDrag();
  const wrapRef = useRef<View>(null);
  const poolTopRef = useRef(0);
  const scopeBottomRef = useRef(Number.POSITIVE_INFINITY);
  const poolHeightRef = useRef(0);
  const [height, setHeight] = useState(0);
  const [stuck, setStuck] = useState(false);

  const measure = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (scrollY as any).__getValue?.() ?? 0;
    wrapRef.current?.measureInWindow((_x, winY, _w, h) => {
      poolTopRef.current = current + winY - stickyTopExpanded;
      poolHeightRef.current = h;
      setHeight(h);
    });
    const scopeNode = scopeRef?.current;
    if (scopeNode) {
      scopeNode.measureInWindow((_x, winY, _w, h) => {
        scopeBottomRef.current = current + winY - stickyTopExpanded + h;
      });
    } else {
      scopeBottomRef.current = Number.POSITIVE_INFINITY;
    }
  };

  useEffect(() => {
    const listener = scrollY.addListener(({value}) => {
      // Refresh bounds while scrolling (exercise height can change).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = value;
      const scopeNode = scopeRef?.current;
      if (scopeNode) {
        scopeNode.measureInWindow((_x, winY, _w, h) => {
          scopeBottomRef.current = current + winY - stickyTopExpanded + h;
        });
      }

      const poolTop = poolTopRef.current;
      if (poolTop <= 0) {
        return;
      }
      const pin = stickyTop;
      const poolH = poolHeightRef.current || height || 0;
      const scopeBottom = scopeBottomRef.current;
      const pastPoolTop = value >= poolTop - pin;
      const beforeScopeEnd = value < scopeBottom - pin - poolH;
      setStuck(pastPoolTop && beforeScopeEnd);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, stickyTop, stickyTopExpanded, height, scopeRef]);

  useEffect(() => {
    if (stuck) {
      setStickyOverlay({
        id,
        height,
        node: <View style={styles.pool}>{children}</View>,
      });
    } else {
      releaseStickyOverlay(id);
    }
    return () => {
      releaseStickyOverlay(id);
    };
  }, [stuck, children, height, id, setStickyOverlay, releaseStickyOverlay]);

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={measure}
      style={[
        styles.placeholder,
        {minHeight: height || undefined},
        isDragging && styles.placeholderDragging,
      ]}>
      <View
        style={[
          styles.pool,
          stuck && styles.invisible,
          isDragging && styles.poolDragging,
        ]}
        pointerEvents={stuck ? 'none' : 'auto'}
        collapsable={false}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    marginBottom: 8,
    zIndex: 20,
    elevation: 20,
    overflow: 'visible',
  },
  placeholderDragging: {
    zIndex: 90,
    elevation: 16,
  },
  pool: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
    zIndex: 20,
    elevation: 20,
  },
  poolDragging: {
    zIndex: 90,
    elevation: 16,
  },
  invisible: {opacity: 0},
});
