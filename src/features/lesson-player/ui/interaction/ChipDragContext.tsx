import {createContext, useCallback, useContext, useMemo, useState, type ReactNode} from 'react';
import {StyleSheet, View} from 'react-native';

type ChipDragContextValue = {
  draggingCount: number;
  beginDrag: () => void;
  endDrag: () => void;
  isDragging: boolean;
};

const ChipDragContext = createContext<ChipDragContextValue>({
  draggingCount: 0,
  beginDrag: () => undefined,
  endDrag: () => undefined,
  isDragging: false,
});

export function ChipDragProvider({children}: {children: ReactNode}) {
  const [draggingCount, setDraggingCount] = useState(0);

  const beginDrag = useCallback(() => {
    setDraggingCount(c => c + 1);
  }, []);

  const endDrag = useCallback(() => {
    setDraggingCount(c => Math.max(0, c - 1));
  }, []);

  const value = useMemo(
    () => ({
      draggingCount,
      beginDrag,
      endDrag,
      isDragging: draggingCount > 0,
    }),
    [beginDrag, draggingCount, endDrag],
  );

  return (
    <ChipDragContext.Provider value={value}>
      <View
        style={[styles.wrap, value.isDragging && styles.wrapDragging]}
        collapsable={false}>
        {children}
      </View>
    </ChipDragContext.Provider>
  );
}

export function useChipDrag() {
  return useContext(ChipDragContext);
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    overflow: 'visible',
    zIndex: 1,
  },
  wrapDragging: {
    zIndex: 2000,
    elevation: 40,
  },
});
