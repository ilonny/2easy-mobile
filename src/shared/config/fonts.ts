import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
} from 'react-native';

/**
 * Site uses next/font Manrope (cyrillic-ext + latin-ext).
 * File names / PostScript names: Manrope-Regular, Manrope-Medium, …
 */
export const fontFamily = {
  regular: 'Manrope-Regular',
  medium: 'Manrope-Medium',
  semiBold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
  extraBold: 'Manrope-ExtraBold',
} as const;

export const fonts = fontFamily;

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

type PatchedComponent = {
  render?: (...args: unknown[]) => React.ReactElement<{
    style?: StyleProp<TextStyle>;
  }>;
  __manropePatched?: boolean;
};

function patchTextComponent(Component: unknown) {
  const anyComponent = Component as PatchedComponent;
  if (anyComponent.__manropePatched || !anyComponent.render) {
    return;
  }
  const originalRender = anyComponent.render.bind(Component);
  anyComponent.__manropePatched = true;
  anyComponent.render = (...args: unknown[]) => {
    const origin = originalRender(...args);
    const flat = StyleSheet.flatten(origin.props.style) || {};
    const existing = flat.fontFamily;
    // Allow system/emoji faces (tab icons, etc.)
    if (existing && !String(existing).startsWith('Manrope')) {
      return origin;
    }
    const family = manropeForWeight(flat.fontWeight);
    return React.cloneElement(origin, {
      style: [
        {fontFamily: family},
        origin.props.style,
        Platform.OS === 'android' ? {fontWeight: 'normal' as const} : null,
      ],
    });
  };
}

/** Call once at app boot before rendering UI. */
export function applyManropeDefaults() {
  patchTextComponent(Text);
  patchTextComponent(TextInput);
}
