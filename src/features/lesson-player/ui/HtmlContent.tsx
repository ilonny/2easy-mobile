import {useMemo} from 'react';
import {useWindowDimensions} from 'react-native';
import RenderHTML, {defaultSystemFonts} from 'react-native-render-html';

import {WEB_URL} from '../../../shared/config';
import {colors} from '../../../shared/config/theme';

type Props = {
  html?: string | null;
};

const BAD_IMG_SRC =
  /(?:about:\/+|_next\/static\/|data:image\/svg|\.svg(?:\?|#|$))/i;

function resolveUrl(src: string, base: string): string {
  const trimmed = (src || '').trim();
  if (!trimmed) {
    return '';
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (/^(about:|data:|blob:|file:)/i.test(trimmed)) {
    return '';
  }
  try {
    return new URL(trimmed, base).toString();
  } catch {
    return '';
  }
}

function isSupportedImageUrl(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) {
    return false;
  }
  if (BAD_IMG_SRC.test(url)) {
    return false;
  }
  return true;
}

/** Strip site chrome / unsupported assets that RN Image cannot load. */
export function sanitizeLessonHtml(html: string, baseUrl = WEB_URL): string {
  return html
    .replace(/<img\b[^>]*>/gi, tag => {
      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      const src = srcMatch?.[1] || '';
      if (BAD_IMG_SRC.test(src)) {
        return '';
      }
      const resolved = resolveUrl(src, baseUrl);
      if (!isSupportedImageUrl(resolved)) {
        return '';
      }
      return tag.replace(srcMatch![1], resolved);
    })
    .replace(/about:\/+/gi, `${baseUrl}/`);
}

export function HtmlContent({html}: Props) {
  const {width} = useWindowDimensions();
  const cleaned = useMemo(
    () => (html?.trim() ? sanitizeLessonHtml(html) : ''),
    [html],
  );
  const source = useMemo(
    () => ({html: cleaned || '<p></p>', baseUrl: WEB_URL}),
    [cleaned],
  );

  if (!cleaned) {
    return null;
  }

  return (
    <RenderHTML
      contentWidth={Math.max(280, width - 64)}
      source={source}
      systemFonts={[...defaultSystemFonts]}
      baseStyle={{
        color: colors.text,
        fontSize: 16,
        lineHeight: 24,
      }}
      tagsStyles={{
        p: {marginBottom: 8},
        img: {maxWidth: '100%'},
        a: {color: colors.primary},
      }}
    />
  );
}
