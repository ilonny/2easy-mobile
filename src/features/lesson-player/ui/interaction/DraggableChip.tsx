import {useCallback, useMemo, useRef, type ReactNode} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {colors} from '../../../../shared/config/theme';
import {useChipDrag} from './ChipDragContext';

export type DropTarget = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  id: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onDropOnTarget?: (
    targetId: string,
    chipId: string,
    label: string,
  ) => boolean | void;
  hitTestDropTarget: (
    pageX: number,
    pageY: number,
    cb: (targetId: string | null) => void,
  ) => void;
};

export function DraggableChip({
  id,
  label,
  disabled,
  selected,
  onSelect,
  onDropOnTarget,
  hitTestDropTarget,
}: Props) {
  const {beginDrag, endDrag} = useChipDrag();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const dragging = useSharedValue(false);
  const settling = useSharedValue(false);
  const chipRef = useRef<View>(null);

  const resetHome = useCallback(
    (consumed: boolean) => {
      endDrag();
      if (consumed) {
        opacity.value = 0;
        tx.value = 0;
        ty.value = 0;
        scale.value = 1;
        dragging.value = false;
        settling.value = false;
        return;
      }
      settling.value = true;
      tx.value = withTiming(0, {duration: 160});
      ty.value = withTiming(0, {duration: 160});
      scale.value = withTiming(1, {duration: 140});
      opacity.value = withTiming(1, {duration: 120});
      dragging.value = false;
      settling.value = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [endDrag],
  );

  const finishDrop = useCallback(
    (pageX: number, pageY: number, translationX: number, translationY: number) => {
      const tryHit = (x: number, y: number, next?: () => void) => {
        hitTestDropTarget(x, y, targetId => {
          if (targetId && onDropOnTarget) {
            const consumed = !!onDropOnTarget(targetId, id, label);
            resetHome(consumed);
            return;
          }
          if (next) {
            next();
            return;
          }
          resetHome(false);
        });
      };

      // 1) Finger tip  2) Estimated chip center (layout + pan translation)
      const runChipCenter = () => {
        chipRef.current?.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            tryHit(
              x + width / 2 + translationX,
              y + height / 2 + translationY,
            );
          } else {
            resetHome(false);
          }
        });
      };

      tryHit(pageX, pageY, runChipCenter);
    },
    [hitTestDropTarget, id, label, onDropOnTarget, resetHome],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!disabled)
        .minDistance(4)
        .onBegin(() => {
          if (settling.value) {
            return;
          }
          opacity.value = 1;
          dragging.value = true;
          scale.value = withTiming(1.05, {duration: 100});
          runOnJS(beginDrag)();
        })
        .onUpdate(e => {
          if (!dragging.value) {
            return;
          }
          tx.value = e.translationX;
          ty.value = e.translationY;
        })
        .onEnd(e => {
          if (!dragging.value) {
            return;
          }
          dragging.value = false;
          runOnJS(finishDrop)(
            e.absoluteX,
            e.absoluteY,
            e.translationX,
            e.translationY,
          );
        })
        .onFinalize((_e, success) => {
          if (!success && dragging.value) {
            runOnJS(resetHome)(false);
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [beginDrag, disabled, finishDrop, resetHome],
  );

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!disabled)
        .maxDistance(8)
        .onEnd(() => {
          if (onSelect) {
            runOnJS(onSelect)();
          }
        }),
    [disabled, onSelect],
  );

  const gesture = useMemo(() => Gesture.Exclusive(pan, tap), [pan, tap]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: tx.value},
      {translateY: ty.value},
      {scale: scale.value},
    ],
    opacity: opacity.value * (dragging.value ? 0.95 : 1),
    zIndex: dragging.value ? 9999 : 1,
    elevation: dragging.value ? 48 : 0,
    shadowOpacity: dragging.value ? 0.32 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={chipRef as never}
        collapsable={false}
        style={[
          styles.chip,
          selected && styles.chipOn,
          disabled && styles.disabled,
          styles.chipShadow,
          animStyle,
        ]}>
        <Text style={styles.chipText}>{label}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

export function DropZone({
  id,
  registerRef,
  children,
  style,
  highlight,
}: {
  id: string;
  registerRef: (id: string, node: View | null) => void;
  children: ReactNode;
  style?: object;
  highlight?: boolean;
}) {
  return (
    <View
      ref={node => registerRef(id, node)}
      collapsable={false}
      style={[style, highlight && styles.dropHighlight]}>
      {children}
    </View>
  );
}

export function useDropTargetRegistry(hitPadding = 32) {
  const refs = useRef(new Map<string, View | null>());
  const pad = hitPadding;

  const registerRef = useCallback((id: string, node: View | null) => {
    if (node) {
      refs.current.set(id, node);
    } else {
      refs.current.delete(id);
    }
  }, []);

  const hitTestDropTarget = useCallback(
    (
      pageX: number,
      pageY: number,
      cb: (targetId: string | null) => void,
    ) => {
      const entries = Array.from(refs.current.entries()).filter(
        ([, node]) => !!node,
      );
      if (!entries.length) {
        cb(null);
        return;
      }
      let pending = entries.length;
      let bestId: string | null = null;
      let bestDist = Number.POSITIVE_INFINITY;
      const maxSnap = Math.max(56, pad * 1.75);

      entries.forEach(([id, node]) => {
        node!.measureInWindow((x, y, width, height) => {
          const cx = x + width / 2;
          const cy = y + height / 2;
          const dx = pageX - cx;
          const dy = pageY - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const inside =
            pageX >= x - pad &&
            pageX <= x + width + pad &&
            pageY >= y - pad &&
            pageY <= y + height + pad;
          const near = dist <= maxSnap;
          if ((inside || near) && dist < bestDist) {
            bestDist = dist;
            bestId = id;
          }
          pending -= 1;
          if (pending === 0) {
            cb(bestId);
          }
        });
      });
    },
    [pad],
  );

  return {registerRef, hitTestDropTarget};
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipShadow: {
    shadowColor: '#000',
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  chipOn: {backgroundColor: '#271399'},
  disabled: {opacity: 0.4},
  chipText: {color: '#fff', fontWeight: '700', fontSize: 15},
  dropHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
});
