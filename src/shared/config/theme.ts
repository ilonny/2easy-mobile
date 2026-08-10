export const colors = {
  pageBackground: '#20107D',
  primary: '#3F28C6',
  primarySoft: '#eeebff',
  primaryHover: '#faf9ff',
  white: '#FFFFFF',
  danger: '#A42929',
  muted: '#787878',
  text: '#1A1A1A',
  textSecondary: '#5C5C5C',
  border: '#E4E4E7',
  borderMuted: '#D4D4D8',
  inputBg: '#FAFAFA',
  /** Barely-visible overlay behind modals / sheets */
  modalBackdrop: 'rgba(32, 16, 125, 0.1)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  panel: 30,
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
} as const;

export {fontFamily, fonts, applyManropeDefaults} from './fonts';
