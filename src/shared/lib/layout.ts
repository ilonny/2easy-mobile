import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';

import {breakpoints, layout} from '../config/layout';

/** Equal tile width for FlatList grids (avoids last-row stretch). */
export function catalogTileWidth(
  rowWidth: number,
  columns: number,
  gap: number,
): number {
  const cols = Math.max(1, columns);
  return Math.max(0, Math.floor((rowWidth - gap * (cols - 1)) / cols));
}

export function useLayout() {
  const {width, height} = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = width >= breakpoints.tablet || shortest >= 600;
    const isLandscape = width > height;
    const pageContentMaxWidth = !isTablet
      ? width
      : isLandscape
        ? layout.pageContentMaxWidthTabletLandscape
        : layout.pageContentMaxWidthTablet;
    const pageGutter = isTablet
      ? layout.pageGutterTablet
      : layout.pageGutterPhone;
    const catalogColumns =
      isTablet && isLandscape && width >= 900 ? 3 : 2;
    const catalogRowWidth = Math.max(
      0,
      Math.min(width, pageContentMaxWidth) - pageGutter * 2,
    );

    return {
      width,
      height,
      isTablet,
      isLandscape,
      authFormMaxWidth: isTablet
        ? layout.authFormMaxWidthTablet
        : layout.authFormMaxWidthPhone,
      pageContentMaxWidth,
      pageGutter,
      catalogColumns,
      catalogRowWidth,
    };
  }, [width, height]);
}
