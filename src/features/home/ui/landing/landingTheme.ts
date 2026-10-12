export const landing = {
  white: '#FFFFFF',
  black: '#181818',
  gray: '#F1F1F4',
  grayAlt: '#F1F1F3',
  grayFont: '#6E6E74',
  violet: '#5A42D4',
  violetSoft: '#F0EDFD',
  violetTag: '#7561DB',
  orange: '#F7531F',
  green: '#C6FF75',
  greenSoft: '#E9FFCA',
  greenTag: '#5F8E1C',
  mintSoft: '#D0F2E5',
  mintTag: '#229167',
  blueSoft: '#DFEDFF',
  blueTag: '#1E79EE',
  muted: '#A6A6AC',
} as const;

export type LandingTagTone = 'violet' | 'green' | 'mint' | 'blue' | 'white';

export const tagToneStyles: Record<
  LandingTagTone,
  {bg: string; text: string}
> = {
  violet: {bg: landing.violetSoft, text: landing.violetTag},
  green: {bg: landing.greenSoft, text: landing.greenTag},
  mint: {bg: landing.mintSoft, text: landing.mintTag},
  blue: {bg: landing.blueSoft, text: landing.blueTag},
  white: {bg: landing.white, text: landing.black},
};

export function interpolate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value)),
    template,
  );
}
