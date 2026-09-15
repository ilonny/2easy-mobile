import {useCallback, useMemo, useRef, useState} from 'react';
import {
  Linking,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import RenderHTML, {
  defaultSystemFonts,
  type CustomBlockRenderer,
  type MixedStyleDeclaration,
} from 'react-native-render-html';
import {WebView, type WebViewMessageEvent} from 'react-native-webview';

import {WEB_URL} from '../../../shared/config';
import {fontFamily, MANROPE_SYSTEM_FONTS} from '../../../shared/config/fonts';
import {colors} from '../../../shared/config/theme';
import {useLayout} from '../../../shared/lib/layout';
import {htmlContainsSvg, resolveMediaUri} from '../../../shared/lib/mediaUri';
import {SmartImage} from '../../../shared/ui/SmartImage';
import {useDictionarySelection} from '../../dictionary/model/DictionarySelectionContext';

type Props = {
  html?: string | null;
  /** Extra base text style (e.g. centered header description). */
  baseStyle?: StyleProp<TextStyle>;
  contentWidth?: number;
};

const BAD_IMG_SRC = /(?:about:\/+|javascript:)/i;

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
  return resolveMediaUri(src, base);
}

function isSupportedImageUrl(url: string): boolean {
  if (!url) {
    return false;
  }
  if (BAD_IMG_SRC.test(url)) {
    return false;
  }
  if (/^data:image\//i.test(url)) {
    return true;
  }
  if (/^https?:\/\//i.test(url)) {
    return true;
  }
  return false;
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

const HtmlImgRenderer: CustomBlockRenderer = ({tnode}) => {
  const src = tnode.attributes.src;
  if (!src) {
    return null;
  }
  return (
    <SmartImage
      source={{uri: src}}
      resizeMode="contain"
      style={htmlImgStyle}
    />
  );
};

const htmlImgStyle = {
  width: '100%' as const,
  height: 220,
  marginVertical: 8,
};

const htmlRenderers = {img: HtmlImgRenderer};

const defaultTagsStyles: Record<string, MixedStyleDeclaration> = {
  body: {margin: 0, padding: 0, fontFamily: fontFamily.regular},
  p: {marginTop: 0, marginBottom: 8, flexShrink: 1},
  div: {marginBottom: 4, flexShrink: 1},
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

function buildSelectableDocument(bodyHtml: string, fontSize: number) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<meta name="color-scheme" content="only light" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" />
<style>
  :root { color-scheme: only light; }
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color-scheme: only light;
    color: ${colors.text};
    font-family: 'Manrope', ${JSON.stringify(fontFamily.regular)}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: ${fontSize}px;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: anywhere;
    word-break: break-word;
    -webkit-user-select: text;
    user-select: text;
  }
  img { max-width: 100%; height: auto; }
  svg { max-width: 100%; height: auto; display: block; }
  * { max-width: 100%; box-sizing: border-box; }
  a { color: ${colors.primary}; }
  p { margin: 0 0 8px; }
  h1,h2,h3 { margin: 0 0 8px; }
  ul,ol { padding-left: 18px; }
</style>
</head>
<body>${bodyHtml}</body>
<script>
(function () {
  function post(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  function reportHeight() {
    var h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      1
    );
    post({ type: 'height', height: h });
  }
  function selectionEndRect(sel) {
    if (!sel || !sel.rangeCount) return null;
    try {
      var range = sel.getRangeAt(0).cloneRange();
      if (!range.collapsed) {
        range.collapse(false);
      }
      var rects = range.getClientRects();
      if (rects && rects.length) {
        return rects[rects.length - 1];
      }
      return range.getBoundingClientRect();
    } catch (e) {
      return null;
    }
  }
  function reportSelection() {
    var sel = window.getSelection();
    var text = sel && sel.toString ? String(sel.toString()).trim() : '';
    if (!text) {
      post({ type: 'clear' });
      return;
    }
    var rect = selectionEndRect(sel);
    post({
      type: 'selection',
      text: text,
      x: rect ? rect.right : 0,
      y: rect ? rect.bottom : 0
    });
  }
  var touchTimer = null;
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (!sel || !String(sel.toString() || '').trim()) {
      post({ type: 'clear' });
    }
  });
  document.addEventListener('mouseup', function () {
    setTimeout(reportSelection, 80);
  });
  document.addEventListener('touchend', function () {
    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = setTimeout(reportSelection, 420);
  });
  window.addEventListener('load', reportHeight);
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('load', reportHeight);
    img.addEventListener('error', reportHeight);
  });
  setTimeout(reportHeight, 50);
  setTimeout(reportHeight, 250);
  setTimeout(reportHeight, 800);
  if (window.ResizeObserver) {
    new ResizeObserver(reportHeight).observe(document.body);
  }
})();
</script>
</html>`;
}

function SelectableHtmlWebView({
  html,
  contentWidth,
  fontSize,
}: {
  html: string;
  contentWidth: number;
  fontSize: number;
}) {
  const selection = useDictionarySelection();
  const wrapRef = useRef<View>(null);
  const [height, setHeight] = useState(Math.max(40, fontSize * 3));

  const source = useMemo(
    () => ({html: buildSelectableDocument(html, fontSize)}),
    [html, fontSize],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let payload: {
        type?: string;
        height?: number;
        text?: string;
        x?: number;
        y?: number;
      };
      try {
        payload = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }
      if (payload.type === 'height' && typeof payload.height === 'number') {
        const next = Math.ceil(payload.height);
        if (next > 0 && Math.abs(next - height) > 2) {
          setHeight(next);
        }
        return;
      }
      if (payload.type === 'clear') {
        selection?.onClearSelection();
        return;
      }
      if (payload.type === 'selection' && payload.text?.trim()) {
        wrapRef.current?.measureInWindow((wx, wy) => {
          selection?.onSelection({
            text: payload.text!.trim(),
            pageX: wx + Number(payload.x || 0),
            pageY: wy + Number(payload.y || 0),
          });
        });
      }
    },
    [height, selection],
  );

  return (
    <View ref={wrapRef} style={{width: contentWidth, height}}>
      <WebView
        originWhitelist={['*']}
        source={source}
        style={{width: contentWidth, height, backgroundColor: 'transparent'}}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

export function HtmlContent({html, baseStyle, contentWidth}: Props) {
  const {width} = useWindowDimensions();
  const {pageContentMaxWidth, pageGutter} = useLayout();
  const dictionarySelection = useDictionarySelection();
  const [layoutWidth, setLayoutWidth] = useState(0);
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
    (layoutWidth > 0
      ? layoutWidth
      : Math.max(
          160,
          Math.min(width, pageContentMaxWidth || width) - pageGutter * 2,
        ));

  const base = {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    ...(baseStyle as object),
  } as TextStyle;
  const fontSize = typeof base.fontSize === 'number' ? base.fontSize : 16;
  const needsWebView =
    !!dictionarySelection?.enabled || htmlContainsSvg(cleaned);

  const inner = needsWebView ? (
    <SelectableHtmlWebView
      html={cleaned}
      contentWidth={measured}
      fontSize={fontSize}
    />
  ) : (
    <RenderHTML
      contentWidth={measured}
      source={source}
      systemFonts={[...defaultSystemFonts, ...MANROPE_SYSTEM_FONTS]}
      baseStyle={{
        color: colors.text,
        fontSize: 16,
        lineHeight: 24,
        fontFamily: fontFamily.regular,
        flexShrink: 1,
        ...(baseStyle as object),
      }}
      tagsStyles={defaultTagsStyles}
      renderers={htmlRenderers}
      enableExperimentalMarginCollapsing
      renderersProps={renderersProps}
      defaultTextProps={{selectable: true}}
    />
  );

  return (
    <View
      style={htmlWrapStyle}
      onLayout={event => {
        if (contentWidth) {
          return;
        }
        const next = Math.floor(event.nativeEvent.layout.width);
        if (next > 0 && Math.abs(next - layoutWidth) > 2) {
          setLayoutWidth(next);
        }
      }}>
      {inner}
    </View>
  );
}

const htmlWrapStyle = {
  width: '100%' as const,
  maxWidth: '100%' as const,
  overflow: 'hidden' as const,
};
