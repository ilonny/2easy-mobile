import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';
import {useLessonScroll} from '../../model/LessonScrollContext';

type Props = {
  children: ReactNode;
};

/**
 * Keeps the chip pool pinned to the top of the lesson ScrollView once
 * the user scrolls past its original position.
 */
export function StickyChipPool({children}: Props) {
  const id = useId();
  const {scrollY, stickyTop, setStickyOverlay} = useLessonScroll();
  const wrapRef = useRef<View>(null);
  const contentYRef = useRef(0);
  const [height, setHeight] = useState(0);
  const [stuck, setStuck] = useState(false);

  const measureContentY = () => {
    wrapRef.current?.measureInWindow((_x, winY, _w, h) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (scrollY as any).__getValue?.() ?? 0;
      contentYRef.current = current + winY - stickyTop;
      setHeight(h);
    });
  };

  useEffect(() => {
    const listener = scrollY.addListener(({value}) => {
      const y = contentYRef.current;
      if (y <= 0) {
        return;
      }
      setStuck(value >= y - stickyTop);
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, stickyTop]);

  useEffect(() => {
    if (stuck) {
      setStickyOverlay({
        id,
        height,
        node: <View style={styles.pool}>{children}</View>,
      });
    } else {
      setStickyOverlay(null);
    }
    return () => {
      setStickyOverlay(null);
    };
  }, [stuck, children, height, id, setStickyOverlay]);

  return (
    <View
      ref={wrapRef}
      collapsable={false}
      onLayout={measureContentY}
      style={[styles.placeholder, {minHeight: height || undefined}]}>
      <View
        style={[styles.pool, stuck && styles.invisible]}
        pointerEvents={stuck ? 'none' : 'auto'}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {marginBottom: 8},
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
    zIndex: 2,
  },
  invisible: {opacity: 0},
});
