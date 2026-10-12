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
import {useLayout} from '../../../../shared/lib/layout';
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
  const {isTablet} = useLayout();
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
  const measuredRef = useRef(false);
  const [height, setHeight] = useState(0);
  const [stuck, setStuck] = useState(false);

  const measure = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (scrollY as any).__getValue?.() ?? 0;
    wrapRef.current?.measureInWindow((_x, winY, _w, h) => {
      // Content-space Y of the pool (scroll offset when it meets the
      // expanded header). Do not subtract the live pin here — that made
      // chips stick a full header too early, especially on tablet.
      poolTopRef.current = current + winY - stickyTopExpanded;
      poolHeightRef.current = h;
      measuredRef.current = h > 0;
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
    measure();
    // Re-base after the collapsing header reports its real height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickyTopExpanded]);

  useEffect(() => {
    const listener = scrollY.addListener(({value}) => {
      const scopeNode = scopeRef?.current;
      if (scopeNode) {
        scopeNode.measureInWindow((_x, winY, _w, h) => {
          scopeBottomRef.current = value + winY - stickyTopExpanded + h;
        });
      }

      if (!measuredRef.current) {
        return;
      }
      const poolTop = poolTopRef.current;
      const pin = stickyTop;
      const poolH = poolHeightRef.current || height || 0;
      const scopeBottom = scopeBottomRef.current;
      // Stick only once the pool's natural window Y reaches the pin line:
      // winY ≈ poolTop + stickyTopExpanded - scrollY.
      const pastPoolTop = value >= poolTop + stickyTopExpanded - pin;
      const beforeScopeEnd =
        value < scopeBottom + stickyTopExpanded - pin - poolH;
      setStuck(pastPoolTop && beforeScopeEnd);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, stickyTop, stickyTopExpanded, height, scopeRef]);

  useEffect(() => {
    if (stuck) {
      setStickyOverlay({
        id,
        height,
        node: (
          <View style={[styles.pool, isTablet && styles.poolTablet]}>
            {children}
          </View>
        ),
      });
    } else {
      releaseStickyOverlay(id);
    }
    return () => {
      releaseStickyOverlay(id);
    };
  }, [
    stuck,
    children,
    height,
    id,
    isTablet,
    setStickyOverlay,
    releaseStickyOverlay,
  ]);

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
          isTablet && styles.poolTablet,
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
  poolTablet: {
    gap: 12,
    padding: 14,
    borderRadius: radii.lg,
  },
  poolDragging: {
    zIndex: 90,
    elevation: 16,
  },
  invisible: {opacity: 0},
});
