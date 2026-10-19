import {useWindowDimensions} from 'react-native';

/** Site-parity empty gap widths (FillGapsNewExView styles.module.css). */
export function useGapSizes() {
  const {width} = useWindowDimensions();
  const inputMin = Math.min(200, Math.round(width * 0.55));
  const dropMin = Math.min(160, Math.round(width * 0.42));
  const selectMin = Math.min(220, Math.max(96, Math.round(width * 0.42)));

  return {
    inputMinWidth: Math.max(120, inputMin),
    dropMinWidth: Math.max(100, dropMin),
    selectMinWidth: selectMin,
    gapMinHeight: 44,
  };
}
