import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';
import * as ReactNative from 'react-native';

/**
 * Site uses next/font Manrope (cyrillic-ext + latin-ext).
 * iOS PostScript names: Manrope-Regular, Manrope-Medium, …
 */
export const fontFamily = {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extraBold: 'Manrope-ExtraBold',
} as const;

export const fonts = fontFamily;

export const MANROPE_SYSTEM_FONTS = [
  fontFamily.regular,
  fontFamily.medium,
  fontFamily.semiBold,
  fontFamily.bold,
  fontFamily.extraBold,
];

export function manropeForWeight(
  weight?: string | number,
): (typeof fontFamily)[keyof typeof fontFamily] {
  const w = String(weight ?? '400').toLowerCase();
  if (w === '800' || w === '900' || w === 'heavy' || w === 'black') {
    return fontFamily.extraBold;
  }
  if (w === '700' || w === 'bold') {
    return fontFamily.bold;
  }
  if (w === '600' || w === 'semibold') {
    return fontFamily.semiBold;
  }
  if (w === '500' || w === 'medium') {
    return fontFamily.medium;
  }
  return fontFamily.regular;
}

function manropeStyle(style?: StyleProp<TextStyle>): StyleProp<TextStyle> {
  const flat = StyleSheet.flatten(style) || {};
  const existing = flat.fontFamily;
  if (existing && !String(existing).startsWith('Manrope')) {
    return style;
  }
  const family = manropeForWeight(flat.fontWeight);
  return [
    {fontFamily: family},
    style,
    Platform.OS === 'android' ? {fontWeight: 'normal' as const} : null,
  ];
}

type PatchedFlag = {__manropePatched?: boolean};

const OriginalText = Text;
const OriginalTextInput = TextInput;

const ManropeText = React.forwardRef((props: TextProps, ref) => {
  return React.createElement(OriginalText, {
    ...props,
    ref,
    style: manropeStyle(props.style),
  } as TextProps);
});
ManropeText.displayName = 'Text';

const ManropeTextInput = React.forwardRef((props: TextInputProps, ref) => {
  return React.createElement(OriginalTextInput, {
    ...props,
    ref,
    style: manropeStyle(props.style),
  } as TextInputProps);
});
ManropeTextInput.displayName = 'TextInput';

/**
 * RN 0.86 / Fabric / React 19: Text has no `.render` and ignores defaultProps.
 * Replace the RN exports before the rest of the app imports them.
 */
export function applyManropeDefaults() {
  const rn = ReactNative as typeof ReactNative & PatchedFlag;
  if (rn.__manropePatched) {
    return;
  }
  rn.__manropePatched = true;
  try {
    Object.defineProperty(rn, 'Text', {
      configurable: true,
      enumerable: true,
      get: () => ManropeText,
    });
    Object.defineProperty(rn, 'TextInput', {
      configurable: true,
      enumerable: true,
      get: () => ManropeTextInput,
    });
  } catch {
    (rn as {Text: unknown}).Text = ManropeText;
    (rn as {TextInput: unknown}).TextInput = ManropeTextInput;
  }
}

applyManropeDefaults();
