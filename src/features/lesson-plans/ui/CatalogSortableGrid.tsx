import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {FlatList, Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import {
  isLessonLockedOnFreeTariff,
  type Lesson,
} from '../../../entities/lesson';
import type {CatalogItem} from '../model/catalogTypes';
import {isCatalogFolder, isCatalogLesson} from '../model/catalogTypes';
import {LessonCard} from './LessonCard';

type Props = {
  data: CatalogItem[];
  columns: number;
  gap: number;
  tileWidth: number;
  listPaddingTop: number;
  listPaddingBottom: number;
  canDrag: boolean;
  showMenu: boolean;
  isFreeTariff: boolean;
  isStudent: boolean;
  refreshing: boolean;
  emptyComponent: React.ReactElement | null;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onRefresh: () => void;
  onReorder: (next: CatalogItem[]) => void;
  onPressItem: (item: CatalogItem) => void;
  onMenuItem: (item: CatalogItem) => void;
};

/** Approximate card body under the square cover (title + tags + padding). */
const CARD_BODY_ESTIMATE = 72;
/** Screen-edge band (px) that triggers list auto-scroll while dragging. */
const AUTO_SCROLL_EDGE = 110;
const AUTO_SCROLL_MAX_STEP = 28;
const AUTO_SCROLL_INTERVAL_MS = 16;

type DragShared = {
  activeKey: SharedValue<string>;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragW: SharedValue<number>;
  dragVisible: SharedValue<number>;
  grabOffsetX: SharedValue<number>;
  grabOffsetY: SharedValue<number>;
};

type DragJsApi = {
  begin: (itemKey: string, pageX: number, pageY: number) => void;
  move: (pageX: number, pageY: number) => void;
  end: (pageX: number, pageY: number, fromKey: string) => void;
  cancel: () => void;
};

type CellLayout = {x: number; y: number; w: number; h: number};

type CellProps = {
  item: CatalogItem;
  itemKey: string;
  tileWidth: number;
  gap: number;
  canDrag: boolean;
  showMenu: boolean;
  isFreeTariff: boolean;
  isStudent: boolean;
  shared: DragShared;
  jsApiRef: React.MutableRefObject<DragJsApi>;
  cellNodesRef: React.MutableRefObject<Record<string, View | null>>;
  nativeListGesture: ReturnType<typeof Gesture.Native>;
  onPressItem: (item: CatalogItem) => void;
  onMenuItem: (item: CatalogItem) => void;
};

const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList as unknown as typeof FlatList<CatalogItem>,
);

/**
 * Isolated cell so Pan gesture stays stable across parent re-renders.
 * Position updates stay on the UI thread; JS is only for overlay + reorder.
 */
const CatalogSortableCell = memo(function CatalogSortableCell({
  item,
  itemKey,
  tileWidth,
  gap,
  canDrag,
  showMenu,
  isFreeTariff,
  isStudent,
  shared,
  jsApiRef,
  cellNodesRef,
  nativeListGesture,
  onPressItem,
  onMenuItem,
}: CellProps) {
  const notifyBegin = useCallback(
    (key: string, pageX: number, pageY: number) => {
      jsApiRef.current.begin(key, pageX, pageY);
    },
    [jsApiRef],
  );
  const notifyMove = useCallback(
    (pageX: number, pageY: number) => {
      jsApiRef.current.move(pageX, pageY);
    },
    [jsApiRef],
  );
  const notifyEnd = useCallback(
    (pageX: number, pageY: number, key: string) => {
      jsApiRef.current.end(pageX, pageY, key);
    },
    [jsApiRef],
  );
  const notifyCancel = useCallback(() => {
    jsApiRef.current.cancel();
  }, [jsApiRef]);

  const gesture = useMemo(() => {
    if (!canDrag) {
      return Gesture.Tap().enabled(false);
    }

    const {
      activeKey,
      dragX,
      dragY,
      dragW,
      dragVisible,
      grabOffsetX,
      grabOffsetY,
    } = shared;

    return (
      Gesture.Pan()
        .activateAfterLongPress(220)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        // Block the list's native gesture so the finger doesn't scroll the list;
        // edge auto-scroll still uses scrollToOffset while scrollEnabled stays on.
        .blocksExternalGesture(nativeListGesture)
        .onStart(e => {
          'worklet';
          dragW.value = tileWidth;
          // Do not hide the source or show the overlay here — JS measures the
          // cell and swaps in useLayoutEffect so the card never jumps/flickers.
          runOnJS(notifyBegin)(itemKey, e.absoluteX, e.absoluteY);
        })
        .onUpdate(e => {
          'worklet';
          dragX.value = e.absoluteX - grabOffsetX.value;
          dragY.value = e.absoluteY - grabOffsetY.value;
          runOnJS(notifyMove)(e.absoluteX, e.absoluteY);
        })
        .onEnd(e => {
          'worklet';
          activeKey.value = '';
          dragVisible.value = 0;
          runOnJS(notifyEnd)(e.absoluteX, e.absoluteY, itemKey);
        })
        .onFinalize((_e, success) => {
          'worklet';
          if (!success) {
            activeKey.value = '';
            dragVisible.value = 0;
            runOnJS(notifyCancel)();
          }
        })
    );
  }, [
    canDrag,
    itemKey,
    nativeListGesture,
    notifyBegin,
    notifyCancel,
    notifyEnd,
    notifyMove,
    shared,
    tileWidth,
  ]);

  const dimStyle = useAnimatedStyle(() => ({
    // Fully hide the source card while dragging — overlay is the only visible copy.
    opacity: shared.activeKey.value === itemKey ? 0 : 1,
  }));

  return (
    <Animated.View
      ref={(node: View | null) => {
        cellNodesRef.current[itemKey] = node;
      }}
      collapsable={false}
      style={[{width: tileWidth, marginBottom: gap}, dimStyle]}>
      <LessonCard
        item={item}
        isFolder={isCatalogFolder(item)}
        menuOnLongPress={false}
        dragHandleGesture={canDrag ? gesture : undefined}
        locked={
          isCatalogLesson(item) &&
          isLessonLockedOnFreeTariff(item as Lesson, isFreeTariff, isStudent)
        }
        onPress={() => onPressItem(item)}
        onMenuPress={showMenu ? () => onMenuItem(item) : undefined}
      />
    </Animated.View>
  );
});

/**
 * Multi-column catalog grid with handle-based DnD.
 * `react-native-draggable-flatlist` does not support `numColumns` — this does.
 */
export function CatalogSortableGrid({
  data,
  columns,
  gap,
  tileWidth,
  listPaddingTop,
  listPaddingBottom,
  canDrag,
  showMenu,
  isFreeTariff,
  isStudent,
  refreshing,
  emptyComponent,
  onScroll,
  onRefresh,
  onReorder,
  onPressItem,
  onMenuItem,
}: Props) {
  const scrollY = useRef(0);
  const contentHeightRef = useRef(0);
  const rootRef = useRef<View>(null);
  const listRef = useRef<FlatList<CatalogItem>>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const listWindowRef = useRef({pageX: 0, pageY: 0, width: 0, height: 0});
  const metaRef = useRef({
    columns,
    gap,
    tileWidth,
    listPaddingTop,
  });
  metaRef.current = {columns, gap, tileWidth, listPaddingTop};
  const draggingKeyRef = useRef<string | null>(null);
  const fingerRef = useRef({x: 0, y: 0});
  const cellNodesRef = useRef<Record<string, View | null>>({});
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Overlay content only — does not feed back into cell gestures.
  const [overlayItem, setOverlayItem] = useState<CatalogItem | null>(null);

  const activeKey = useSharedValue('');
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragW = useSharedValue(tileWidth);
  const dragVisible = useSharedValue(0);
  const grabOffsetX = useSharedValue(0);
  const grabOffsetY = useSharedValue(0);

  // One stable object so cell gesture useMemo does not churn.
  const sharedRef = useRef<DragShared | null>(null);
  if (!sharedRef.current) {
    sharedRef.current = {
      activeKey,
      dragX,
      dragY,
      dragW,
      dragVisible,
      grabOffsetX,
      grabOffsetY,
    };
  }
  const shared = sharedRef.current;

  const keyOf = useCallback(
    (item: CatalogItem) => `${item.type}-${item.id}`,
    [],
  );

  const measureList = useCallback(() => {
    // Measure the grid container — AnimatedFlatList ref often lacks measureInWindow.
    rootRef.current?.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) {
        listWindowRef.current = {pageX: x, pageY: y, width: w, height: h};
      }
    });
  }, []);

  const handleRootLayout = useCallback(
    (event: {nativeEvent: {layout: {width: number; height: number}}}) => {
      const {width, height} = event.nativeEvent.layout;
      if (width > 0 && height > 0) {
        listWindowRef.current = {
          ...listWindowRef.current,
          width,
          height,
        };
      }
      measureList();
    },
    [measureList],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = event.nativeEvent.contentOffset.y;
      onScroll(event);
    },
    [onScroll],
  );

  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    contentHeightRef.current = h;
  }, []);

  const scrollListTo = useCallback((offset: number) => {
    const list = listRef.current as unknown as {
      scrollToOffset?: (opts: {offset: number; animated?: boolean}) => void;
      getNativeScrollRef?: () => {
        scrollTo?: (opts: {y: number; animated?: boolean}) => void;
      };
    } | null;
    if (!list) {
      return;
    }
    if (typeof list.scrollToOffset === 'function') {
      list.scrollToOffset({offset, animated: false});
      return;
    }
    list.getNativeScrollRef?.()?.scrollTo?.({y: offset, animated: false});
  }, []);

  const estimateLayout = useCallback(
    (itemKey: string): CellLayout | null => {
      const index = dataRef.current.findIndex(row => keyOf(row) === itemKey);
      if (index < 0) {
        return null;
      }
      const {columns: cols, gap: g, tileWidth: tw, listPaddingTop: pad} =
        metaRef.current;
      const rowHeight = tw + CARD_BODY_ESTIMATE + g;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const list = listWindowRef.current;
      return {
        x: list.pageX + col * (tw + g),
        y: list.pageY + pad + row * rowHeight - scrollY.current,
        w: tw,
        h: tw + CARD_BODY_ESTIMATE,
      };
    },
    [keyOf],
  );

  const stopAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current != null) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  }, []);

  const autoScrollTick = useCallback(() => {
    if (!draggingKeyRef.current) {
      return;
    }

    const list = listWindowRef.current;
    if (list.height <= 0) {
      measureList();
      return;
    }

    // Use finger + floating card bounds so scrolling follows the dragged card.
    const fingerY = fingerRef.current.y;
    const cardTop = dragY.value;
    const cardBottom = dragY.value + tileWidth + CARD_BODY_ESTIMATE;
    const probeTop = Math.min(fingerY, cardTop);
    const probeBottom = Math.max(fingerY, cardBottom);

    const topEdge = list.pageY + AUTO_SCROLL_EDGE;
    const bottomEdge = list.pageY + list.height - AUTO_SCROLL_EDGE;
    let step = 0;
    if (probeTop < topEdge) {
      const intensity = (topEdge - probeTop) / AUTO_SCROLL_EDGE;
      step = -Math.ceil(
        AUTO_SCROLL_MAX_STEP * Math.min(1, Math.max(0.2, intensity)),
      );
    } else if (probeBottom > bottomEdge) {
      const intensity = (probeBottom - bottomEdge) / AUTO_SCROLL_EDGE;
      step = Math.ceil(
        AUTO_SCROLL_MAX_STEP * Math.min(1, Math.max(0.2, intensity)),
      );
    }

    if (step === 0) {
      return;
    }

    const {columns: cols, gap: g, tileWidth: tw, listPaddingTop: pad} =
      metaRef.current;
    const rowHeight = tw + CARD_BODY_ESTIMATE + g;
    const rows = Math.ceil(dataRef.current.length / Math.max(1, cols));
    const estimatedContent =
      pad + listPaddingBottom + rows * rowHeight;
    const contentH = Math.max(contentHeightRef.current, estimatedContent);
    const maxOffset = Math.max(0, contentH - list.height);
    const next = Math.max(0, Math.min(maxOffset, scrollY.current + step));
    if (next === scrollY.current) {
      return;
    }
    scrollY.current = next;
    scrollListTo(next);
  }, [dragY, listPaddingBottom, measureList, scrollListTo, tileWidth]);

  const startAutoScroll = useCallback(() => {
    if (autoScrollTimerRef.current != null) {
      return;
    }
    measureList();
    autoScrollTimerRef.current = setInterval(
      autoScrollTick,
      AUTO_SCROLL_INTERVAL_MS,
    );
  }, [autoScrollTick, measureList]);

  useEffect(() => () => stopAutoScroll(), [stopAutoScroll]);

  const findDropIndex = useCallback((pageX: number, pageY: number) => {
    const {columns: cols, gap: g, tileWidth: tw, listPaddingTop: pad} =
      metaRef.current;
    const rowHeight = tw + CARD_BODY_ESTIMATE + g;
    const localX = pageX - listWindowRef.current.pageX;
    const localY =
      pageY - listWindowRef.current.pageY + scrollY.current - pad;
    const col = Math.max(
      0,
      Math.min(cols - 1, Math.floor((localX + g / 2) / (tw + g))),
    );
    const row = Math.max(0, Math.floor((localY + g / 2) / rowHeight));
    const index = row * cols + col;
    return Math.max(0, Math.min(dataRef.current.length - 1, index));
  }, []);

  const applyOverlayOrigin = useCallback(
    (pageX: number, pageY: number, originX: number, originY: number, width: number) => {
      // Keep the floating card on the cell origin; follow the finger via grab offset.
      grabOffsetX.value = pageX - originX;
      grabOffsetY.value = pageY - originY;
      dragX.value = originX;
      dragY.value = originY;
      dragW.value = width;
    },
    [dragW, dragX, dragY, grabOffsetX, grabOffsetY],
  );

  const beginDrag = useCallback(
    (itemKey: string, pageX: number, pageY: number) => {
      if (!canDrag) {
        return;
      }
      const item = dataRef.current.find(row => keyOf(row) === itemKey);
      if (!item) {
        return;
      }
      draggingKeyRef.current = itemKey;
      fingerRef.current = {x: pageX, y: pageY};
      measureList();
      startAutoScroll();

      const reveal = (originX: number, originY: number, width: number) => {
        if (draggingKeyRef.current !== itemKey) {
          return;
        }
        applyOverlayOrigin(pageX, pageY, originX, originY, width);
        setOverlayItem(item);
      };

      const node = cellNodesRef.current[itemKey] as unknown as {
        measureInWindow?: (
          cb: (x: number, y: number, w: number, h: number) => void,
        ) => void;
      } | null;

      if (node?.measureInWindow) {
        node.measureInWindow((x, y, w) => {
          if (w > 0) {
            reveal(x, y, w);
            return;
          }
          const fallback = estimateLayout(itemKey);
          if (fallback) {
            reveal(fallback.x, fallback.y, fallback.w);
          }
        });
        return;
      }

      const fallback = estimateLayout(itemKey);
      if (fallback) {
        reveal(fallback.x, fallback.y, fallback.w);
      }
    },
    [
      applyOverlayOrigin,
      canDrag,
      estimateLayout,
      keyOf,
      measureList,
      startAutoScroll,
    ],
  );

  // Swap source → overlay in the same frame as the overlay mounts (no flicker).
  useLayoutEffect(() => {
    if (!overlayItem || !draggingKeyRef.current) {
      return;
    }
    activeKey.value = draggingKeyRef.current;
    dragVisible.value = 1;
  }, [activeKey, dragVisible, overlayItem]);

  const moveDrag = useCallback((pageX: number, pageY: number) => {
    if (!draggingKeyRef.current) {
      return;
    }
    fingerRef.current = {x: pageX, y: pageY};
  }, []);

  const endDrag = useCallback(
    (pageX: number, pageY: number, fromKey: string) => {
      const was = draggingKeyRef.current;
      draggingKeyRef.current = null;
      stopAutoScroll();
      setOverlayItem(null);
      if (!was || was !== fromKey) {
        return;
      }

      const items = dataRef.current;
      const fromIndex = items.findIndex(row => keyOf(row) === fromKey);
      if (fromIndex < 0) {
        return;
      }
      const toIndex = findDropIndex(pageX, pageY);
      if (toIndex === fromIndex) {
        return;
      }
      const next = items.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next);
    },
    [findDropIndex, keyOf, onReorder, stopAutoScroll],
  );

  const cancelDrag = useCallback(() => {
    if (!draggingKeyRef.current) {
      return;
    }
    draggingKeyRef.current = null;
    stopAutoScroll();
    setOverlayItem(null);
  }, [stopAutoScroll]);

  const jsApiRef = useRef<DragJsApi>({
    begin: beginDrag,
    move: moveDrag,
    end: endDrag,
    cancel: cancelDrag,
  });
  jsApiRef.current = {
    begin: beginDrag,
    move: moveDrag,
    end: endDrag,
    cancel: cancelDrag,
  };

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: dragVisible.value,
    width: dragW.value,
    transform: [{translateX: dragX.value}, {translateY: dragY.value}],
  }));

  const nativeListGesture = useMemo(() => Gesture.Native(), []);

  const renderItem = useCallback(
    ({item}: {item: CatalogItem}) => (
      <CatalogSortableCell
        item={item}
        itemKey={keyOf(item)}
        tileWidth={tileWidth}
        gap={gap}
        canDrag={canDrag}
        showMenu={showMenu}
        isFreeTariff={isFreeTariff}
        isStudent={isStudent}
        shared={shared}
        jsApiRef={jsApiRef}
        cellNodesRef={cellNodesRef}
        nativeListGesture={nativeListGesture}
        onPressItem={onPressItem}
        onMenuItem={onMenuItem}
      />
    ),
    [
      canDrag,
      gap,
      isFreeTariff,
      isStudent,
      keyOf,
      nativeListGesture,
      onMenuItem,
      onPressItem,
      shared,
      showMenu,
      tileWidth,
    ],
  );

  const listKey = useMemo(() => `catalog-cols-${columns}`, [columns]);

  return (
    <View ref={rootRef} style={styles.flex} onLayout={handleRootLayout}>
      <GestureDetector gesture={nativeListGesture}>
        <AnimatedFlatList
          ref={listRef}
          key={listKey}
          data={data}
          keyExtractor={item => keyOf(item)}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? [styles.row, {gap}] : undefined}
          contentContainerStyle={[
            styles.listContent,
            {paddingTop: listPaddingTop, paddingBottom: listPaddingBottom},
          ]}
          renderItem={renderItem}
          ListEmptyComponent={emptyComponent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          scrollEventThrottle={16}
          // Keep scrollEnabled on so scrollToOffset works during drag.
          // Finger scrolling is blocked by the pan via blocksExternalGesture.
          scrollEnabled
          decelerationRate={Platform.OS === 'ios' ? 0.998 : 0.985}
          bounces
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={13}
        />
      </GestureDetector>

      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, overlayStyle]}>
        {overlayItem ? (
          <LessonCard
            item={overlayItem}
            isFolder={isCatalogFolder(overlayItem)}
            menuOnLongPress={false}
            onPress={() => undefined}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  listContent: {flexGrow: 1},
  row: {flexDirection: 'row'},
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#20107D',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
  },
});
