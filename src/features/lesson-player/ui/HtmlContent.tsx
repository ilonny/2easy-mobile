import {useMemo} from 'react';
import {Linking, useWindowDimensions, type StyleProp, type TextStyle} from 'react-native';
import RenderHTML, {
  defaultSystemFonts,
  type MixedStyleDeclaration,
} from 'react-native-render-html';

import {WEB_URL} from '../../../shared/config';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';

type Props = {
  html?: string | null;
  /** Extra base text style (e.g. centered header description). */
  baseStyle?: StyleProp<TextStyle>;
  contentWidth?: number;
};

const BAD_IMG_SRC =
  /(?:about:\/+|_next\/static\/|data:image\/svg|\.svg(?:\?|#|$))/i;

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

export function looksLikeHtml(value?: string | null): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return HTML_TAG_RE.test(value);
}

/** Plain text for chrome / menus — strips tags. */
export function stripHtml(value?: string | null): string {
  if (!value || typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

function escapePlain(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalize HTML or wrap plain text so RenderHTML always gets markup. */
export function normalizeLessonHtml(
  html: string,
  baseUrl = WEB_URL,
): string {
  const trimmed = (html || '').trim();
  if (!trimmed) {
    return '';
  }
  const asHtml = looksLikeHtml(trimmed)
    ? trimmed
    : `<p>${escapePlain(trimmed).replace(/\n/g, '<br/>')}</p>`;

  return asHtml
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
    .replace(/\shref=(["'])\/\//gi, ' href=$1https://')
    .replace(/about:\/+/gi, `${baseUrl}/`);
}

/** @deprecated use normalizeLessonHtml */
export function sanitizeLessonHtml(html: string, baseUrl = WEB_URL): string {
  return normalizeLessonHtml(html, baseUrl);
}

const defaultTagsStyles: Record<string, MixedStyleDeclaration> = {
  body: {margin: 0, padding: 0},
  p: {marginTop: 0, marginBottom: 8},
  div: {marginBottom: 4},
  h1: {fontSize: 22, fontWeight: '800', marginBottom: 8, color: colors.text},
  h2: {fontSize: 20, fontWeight: '700', marginBottom: 8, color: colors.text},
  h3: {fontSize: 18, fontWeight: '700', marginBottom: 6, color: colors.text},
  ul: {marginBottom: 8, paddingLeft: 18},
  ol: {marginBottom: 8, paddingLeft: 18},
  li: {marginBottom: 4},
  strong: {fontWeight: '700'},
  b: {fontWeight: '700'},
  em: {fontStyle: 'italic'},
  i: {fontStyle: 'italic'},
  u: {textDecorationLine: 'underline'},
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingLeft: 10,
    marginVertical: 8,
    color: colors.textSecondary,
  },
  img: {maxWidth: '100%', marginVertical: 8},
  a: {color: colors.primary, textDecorationLine: 'underline'},
  span: {},
};

async function openHref(href?: string) {
  if (!href) {
    return;
  }
  const url = resolveUrl(href, WEB_URL);
  if (!url) {
    return;
  }
  try {
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    }
  } catch {
    // ignore
  }
}

export function HtmlContent({html, baseStyle, contentWidth}: Props) {
  const {width} = useWindowDimensions();
  const {pageContentMaxWidth, pageGutter} = useLayout();
  const cleaned = useMemo(
    () => (html?.trim() ? normalizeLessonHtml(html) : ''),
    [html],
  );
  const source = useMemo(
    () => ({html: cleaned || '<p></p>', baseUrl: WEB_URL}),
    [cleaned],
  );

  const renderersProps = useMemo(
    () => ({
      a: {
        onPress: (_event: unknown, href?: string) => {
          void openHref(href);
        },
      },
    }),
    [],
  );

  if (!cleaned) {
    return null;
  }

  const measured =
    contentWidth ??
    Math.max(
      280,
      Math.min(width, pageContentMaxWidth || width) - pageGutter * 2,
    );

  return (
    <RenderHTML
      contentWidth={measured}
      source={source}
      systemFonts={[...defaultSystemFonts]}
      baseStyle={{
        color: colors.text,
        fontSize: 16,
        lineHeight: 24,
        ...(baseStyle as object),
      }}
      tagsStyles={defaultTagsStyles}
      enableExperimentalMarginCollapsing
      renderersProps={renderersProps}
      defaultTextProps={{selectable: true}}
    />
  );
}
