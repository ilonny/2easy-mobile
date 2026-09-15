import {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageResizeMode,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {WebView} from 'react-native-webview';

import {WEB_URL} from '../config';
import {colors} from '../config/theme';
import {isSvgUri, uriFromSource} from '../lib/mediaUri';
import {
  getSvgMarkup,
  peekSvgMarkup,
  prepareSvgMarkup,
} from '../lib/svgCache';

type Props = {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle | ViewStyle>;
  resizeMode?: ImageResizeMode;
  /** When false, parent can receive taps (catalog cards, zoom thumb). */
  pointerEvents?: 'auto' | 'none';
};

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;');
}

function svgPageStyle(objectFit?: 'contain' | 'cover'): string {
  const imgFit = objectFit
    ? `img {
    max-width: 100%;
    max-height: 100%;
    width: 100%;
    height: 100%;
    object-fit: ${objectFit};
  }`
    : '';
  return `<meta name="color-scheme" content="only light" />
<style>
  :root { color-scheme: only light; }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent !important;
    color-scheme: only light;
    overflow: hidden;
  }
  .box {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent !important;
  }
  .box > svg {
    width: 100%;
    height: 100%;
    display: block;
    background: transparent;
  }
  ${imgFit}
</style>`;
}

function svgDocumentFromMarkup(markup: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
${svgPageStyle()}
</head>
<body>
  <div class="box">${markup}</div>
</body>
</html>`;
}

function svgDocumentFromUri(uri: string, objectFit: 'contain' | 'cover'): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
${svgPageStyle(objectFit)}
</head>
<body>
  <div class="box"><img src="${escapeHtmlAttr(uri)}" alt="" /></div>
</body>
</html>`;
}

function SvgWebView({
  uri,
  style,
  resizeMode,
  pointerEvents,
}: {
  uri: string;
  style?: StyleProp<ImageStyle | ViewStyle>;
  resizeMode?: ImageResizeMode;
  pointerEvents?: 'auto' | 'none';
}) {
  const objectFit = resizeMode === 'cover' ? 'cover' : 'contain';
  const [rawSvg, setRawSvg] = useState(() => peekSvgMarkup(uri));
  const [fetching, setFetching] = useState(() => !peekSvgMarkup(uri));
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPainted(false);
    const cached = peekSvgMarkup(uri);
    if (cached) {
      setRawSvg(cached);
      setFetching(false);
      return;
    }
    setRawSvg(null);
    setFetching(true);
    getSvgMarkup(uri)
      .then(svg => {
        if (!cancelled) {
          setRawSvg(svg);
          setFetching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRawSvg('');
          setFetching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const html = useMemo(() => {
    if (rawSvg) {
      const markup = prepareSvgMarkup(rawSvg, objectFit);
      if (markup) {
        return svgDocumentFromMarkup(markup);
      }
    }
    if (!fetching) {
      return svgDocumentFromUri(uri, objectFit);
    }
    return '';
  }, [rawSvg, fetching, uri, objectFit]);

  useEffect(() => {
    setPainted(false);
  }, [html]);

  const showLoader = fetching || (!!html && !painted);

  return (
    <View style={[styles.box, style]} pointerEvents={pointerEvents ?? 'none'}>
      {html ? (
        <WebView
          key={uri}
          originWhitelist={['*']}
          source={{html, baseUrl: WEB_URL}}
          style={[styles.fill, !painted && styles.hidden]}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          javaScriptEnabled={false}
          setSupportMultipleWindows={false}
          androidLayerType="software"
          cacheEnabled
          opaque={false}
          pointerEvents={pointerEvents ?? 'none'}
          onLoadEnd={() => setPainted(true)}
        />
      ) : null}
      {showLoader ? (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

export function SmartImage({
  source,
  style,
  resizeMode = 'cover',
  pointerEvents = 'none',
}: Props) {
  const uri = uriFromSource(source);
  const [useWeb, setUseWeb] = useState(() => isSvgUri(uri));

  useEffect(() => {
    setUseWeb(isSvgUri(uri));
  }, [uri]);

  if (uri && (useWeb || isSvgUri(uri))) {
    return (
      <SvgWebView
        uri={uri}
        style={style}
        resizeMode={resizeMode}
        pointerEvents={pointerEvents}
      />
    );
  }

  return (
    <Image
      source={source}
      style={style as StyleProp<ImageStyle>}
      resizeMode={resizeMode}
      onError={() => {
        if (uri) {
          setUseWeb(true);
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
  },
  hidden: {
    opacity: 0,
  },
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
});
