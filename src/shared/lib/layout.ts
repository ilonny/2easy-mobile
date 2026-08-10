import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';

import {breakpoints, layout} from '../config/layout';

export function useLayout() {
  const {width, height} = useWindowDimensions();

  return useMemo(() => {
    const shortest = Math.min(width, height);
    const isTablet = width >= breakpoints.tablet || shortest >= 600;
    const isLandscape = width > height;

    return {
      width,
      height,
      isTablet,
      isLandscape,
      authFormMaxWidth: isTablet
        ? layout.authFormMaxWidthTablet
        : layout.authFormMaxWidthPhone,
      pageContentMaxWidth: isTablet
        ? layout.pageContentMaxWidthTablet
        : width,
      pageGutter: isTablet ? layout.pageGutterTablet : layout.pageGutterPhone,
    };
  }, [width, height]);
}
